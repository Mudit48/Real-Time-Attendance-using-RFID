const express = require('express');
const router = express.Router();
const { get, all } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All teacher routes require authentication and 'teacher' role
router.use(authenticateToken);
router.use(requireRole('teacher'));

// GET /api/teachers/me
router.get('/me', async (req, res) => {
  try {
    const teacher = await get(
      `SELECT t.id, t.name, t.subject_id, s.name as subject_name, u.email
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       JOIN subjects s ON t.subject_id = s.id
       WHERE t.user_id = ?`,
      [req.user.id]
    );

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    // Fetch recent attendance sessions conducted by this teacher
    const recentSessions = await all(
      `SELECT ses.id, ses.session_date, ses.status, ses.created_at,
              COUNT(ae.id) as scanned_count
       FROM attendance_sessions ses
       LEFT JOIN attendance_entries ae ON ses.id = ae.session_id
       WHERE ses.teacher_id = ?
       GROUP BY ses.id
       ORDER BY ses.created_at DESC
       LIMIT 10`,
      [teacher.id]
    );

    // Also check if there is an active session right now
    const activeSession = await get(
      `SELECT * FROM attendance_sessions WHERE teacher_id = ? AND status = 'scanning' ORDER BY id DESC LIMIT 1`,
      [teacher.id]
    );

    return res.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        subjectId: teacher.subject_id,
        subjectName: teacher.subject_name
      },
      activeSession: activeSession || null,
      recentSessions
    });
  } catch (error) {
    console.error('Error in /api/teachers/me:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching teacher profile.' });
  }
});

module.exports = router;
