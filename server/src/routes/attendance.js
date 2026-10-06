const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getIO } = require('../socket');

// All endpoints in this router require authentication and 'teacher' role
router.use(authenticateToken);
router.use(requireRole('teacher'));

// Helper to get teacher record
async function getTeacherRecord(userId) {
  return await get(
    `SELECT t.*, s.name as subject_name 
     FROM teachers t 
     JOIN subjects s ON t.subject_id = s.id 
     WHERE t.user_id = ?`,
    [userId]
  );
}

// POST /api/attendance/start
// Starts a new scanning session for the teacher's assigned subject
router.post('/start', async (req, res) => {
  try {
    const teacher = await getTeacherRecord(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if there is an active session already open for this teacher
    const existingSession = await get(
      `SELECT * FROM attendance_sessions 
       WHERE teacher_id = ? AND status = 'scanning' 
       ORDER BY id DESC LIMIT 1`,
      [teacher.id]
    );

    if (existingSession) {
      return res.json({
        success: true,
        message: 'Resuming existing active attendance session',
        session: {
          id: existingSession.id,
          teacherId: teacher.id,
          teacherName: teacher.name,
          subjectId: teacher.subject_id,
          subjectName: teacher.subject_name,
          sessionDate: existingSession.session_date,
          status: existingSession.status
        }
      });
    }

    // Create a new session
    const result = await run(
      `INSERT INTO attendance_sessions (teacher_id, subject_id, session_date, status)
       VALUES (?, ?, ?, 'scanning')`,
      [teacher.id, teacher.subject_id, today]
    );

    const sessionId = result.lastID;

    return res.status(201).json({
      success: true,
      message: 'Attendance scanning session started',
      session: {
        id: sessionId,
        teacherId: teacher.id,
        teacherName: teacher.name,
        subjectId: teacher.subject_id,
        subjectName: teacher.subject_name,
        sessionDate: today,
        status: 'scanning'
      }
    });
  } catch (error) {
    console.error('Error in /api/attendance/start:', error);
    return res.status(500).json({ success: false, message: 'Server error starting attendance session.' });
  }
});

// GET /api/attendance/session/:id
// Get session details and currently scanned students
router.get('/session/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await get(
      `SELECT ses.*, s.name as subject_name, t.name as teacher_name
       FROM attendance_sessions ses
       JOIN subjects s ON ses.subject_id = s.id
       JOIN teachers t ON ses.teacher_id = t.id
       WHERE ses.id = ?`,
      [sessionId]
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    // Get scanned entries for this session
    const entries = await all(
      `SELECT ae.id as entry_id, ae.scanned_at,
              st.id as student_id, st.name, st.college_id, st.department,
              rc.uid as rfid_uid
       FROM attendance_entries ae
       JOIN students st ON ae.student_id = st.id
       LEFT JOIN rfid_cards rc ON st.id = rc.student_id
       WHERE ae.session_id = ?
       ORDER BY ae.scanned_at DESC`,
      [sessionId]
    );

    return res.json({
      success: true,
      session: {
        id: session.id,
        teacherId: session.teacher_id,
        teacherName: session.teacher_name,
        subjectId: session.subject_id,
        subjectName: session.subject_name,
        sessionDate: session.session_date,
        status: session.status,
        createdAt: session.created_at
      },
      scannedStudents: entries
    });
  } catch (error) {
    console.error('Error in /api/attendance/session/:id:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving session.' });
  }
});

// POST /api/attendance/session/:id/cancel/:entryId
// Cancel an individual scanned entry from the active session
router.post('/session/:id/cancel/:entryId', async (req, res) => {
  try {
    const { id: sessionId, entryId } = req.params;

    // Check that entry belongs to session
    const entry = await get(
      'SELECT * FROM attendance_entries WHERE id = ? AND session_id = ?',
      [entryId, sessionId]
    );

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Scanned entry not found in this session.' });
    }

    // Check session is still in 'scanning' status
    const session = await get('SELECT status FROM attendance_sessions WHERE id = ?', [sessionId]);
    if (!session || session.status !== 'scanning') {
      return res.status(400).json({ success: false, message: 'Cannot cancel entries in a closed session.' });
    }

    // Delete temporary entry
    await run('DELETE FROM attendance_entries WHERE id = ?', [entryId]);

    // Broadcast removal via Socket.IO
    try {
      const io = getIO();
      io.to(`session_${sessionId}`).emit('entryCancelled', {
        sessionId: parseInt(sessionId, 10),
        entryId: parseInt(entryId, 10),
        studentId: entry.student_id
      });
      io.emit('entryCancelled', {
        sessionId: parseInt(sessionId, 10),
        entryId: parseInt(entryId, 10),
        studentId: entry.student_id
      });
    } catch (socketErr) {
      console.warn('Socket broadcast warning:', socketErr.message);
    }

    return res.json({
      success: true,
      message: 'Scanned entry cancelled successfully.'
    });
  } catch (error) {
    console.error('Error cancelling entry:', error);
    return res.status(500).json({ success: false, message: 'Server error cancelling scanned entry.' });
  }
});

// POST /api/attendance/session/:id/save
// Finalizes session, marks scanned students as Present, non-scanned as Absent
router.post('/session/:id/save', async (req, res) => {
  try {
    const sessionId = req.params.id;

    const session = await get(
      `SELECT ses.*, s.name as subject_name 
       FROM attendance_sessions ses 
       JOIN subjects s ON ses.subject_id = s.id 
       WHERE ses.id = ?`,
      [sessionId]
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (session.status !== 'scanning') {
      return res.status(400).json({ success: false, message: 'Session is already closed or finalized.' });
    }

    // Get all scanned students in this session
    const scannedEntries = await all(
      'SELECT student_id FROM attendance_entries WHERE session_id = ?',
      [sessionId]
    );
    const scannedStudentIds = new Set(scannedEntries.map(e => e.student_id));

    // Get ALL registered students in college
    const allStudents = await all('SELECT id FROM students');

    const sessionDate = session.session_date;
    const subjectId = session.subject_id;

    // Convert to permanent records:
    // Scanned -> Present
    // Not scanned -> Absent
    for (const student of allStudents) {
      const isPresent = scannedStudentIds.has(student.id);
      const status = isPresent ? 'Present' : 'Absent';

      // Insert or update attendance record for this specific session
      await run(
        `INSERT INTO attendance_records (session_id, student_id, subject_id, date, status)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(session_id, student_id) 
         DO UPDATE SET status = excluded.status`,
        [sessionId, student.id, subjectId, sessionDate, status]
      );
    }

    // Update session status to completed
    await run("UPDATE attendance_sessions SET status = 'completed' WHERE id = ?", [sessionId]);

    // Broadcast Socket.IO events
    try {
      const io = getIO();
      // Notify teacher session page
      io.to(`session_${sessionId}`).emit('sessionSaved', {
        sessionId: parseInt(sessionId, 10),
        status: 'completed',
        message: 'Attendance saved successfully.'
      });
      io.emit('sessionSaved', {
        sessionId: parseInt(sessionId, 10),
        status: 'completed',
        message: 'Attendance saved successfully.'
      });

      // Notify all connected students that attendance has been updated
      io.emit('attendanceUpdated', {
        subjectId: session.subject_id,
        subjectName: session.subject_name,
        date: sessionDate
      });
    } catch (socketErr) {
      console.warn('Socket broadcast warning:', socketErr.message);
    }

    return res.json({
      success: true,
      message: 'Attendance saved successfully.',
      session: {
        id: session.id,
        status: 'completed',
        date: sessionDate,
        subject: session.subject_name,
        totalStudents: allStudents.length,
        presentCount: scannedStudentIds.size,
        absentCount: allStudents.length - scannedStudentIds.size
      }
    });
  } catch (error) {
    console.error('Error in /api/attendance/session/:id/save:', error);
    return res.status(500).json({ success: false, message: 'Server error saving attendance.' });
  }
});

module.exports = router;
