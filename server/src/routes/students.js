const express = require('express');
const router = express.Router();
const { get, all } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All student routes require authentication and 'student' role
router.use(authenticateToken);
router.use(requireRole('student'));

// Helper to get student record for authenticated user
async function getAuthenticatedStudent(userId) {
  return await get('SELECT * FROM students WHERE user_id = ?', [userId]);
}

// GET /api/students/me
router.get('/me', async (req, res) => {
  try {
    const student = await get(
      `SELECT s.id, s.college_id, s.name, s.department, s.created_at, u.email, r.uid as rfid_uid
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN rfid_cards r ON s.id = r.student_id
       WHERE s.user_id = ?`,
      [req.user.id]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    return res.json({
      success: true,
      student: {
        id: student.id,
        collegeId: student.college_id,
        name: student.name,
        department: student.department,
        email: student.email,
        rfidUid: student.rfid_uid || null,
        createdAt: student.created_at
      }
    });
  } catch (error) {
    console.error('Error in /api/students/me:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching student profile.' });
  }
});

// GET /api/students/me/attendance
// Returns complete attendance history sorted by date DESC
router.get('/me/attendance', async (req, res) => {
  try {
    const student = await getAuthenticatedStudent(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const records = await all(
      `SELECT ar.id, sub.name as subject, ar.date, ar.status, ar.session_id
       FROM attendance_records ar
       JOIN subjects sub ON ar.subject_id = sub.id
       WHERE ar.student_id = ?
       ORDER BY ar.date DESC, ar.id DESC`,
      [student.id]
    );

    return res.json({
      success: true,
      records
    });
  } catch (error) {
    console.error('Error in /api/students/me/attendance:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching attendance records.' });
  }
});

// GET /api/students/me/attendance/summary
// Returns overall percentage and subject-wise attendance stats (MIS, IRS, STQA)
router.get('/me/attendance/summary', async (req, res) => {
  try {
    const student = await getAuthenticatedStudent(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    // Get all subjects
    const subjects = await all('SELECT id, name FROM subjects ORDER BY name ASC');

    let totalClasses = 0;
    let totalPresent = 0;
    const subjectStats = [];

    for (const sub of subjects) {
      const stats = await get(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
         FROM attendance_records
         WHERE student_id = ? AND subject_id = ?`,
        [student.id, sub.id]
      );

      const subTotal = stats.total || 0;
      const subPresent = stats.present || 0;
      const subAbsent = stats.absent || 0;
      const percentage = subTotal > 0 ? Math.round((subPresent / subTotal) * 100) : 0;

      totalClasses += subTotal;
      totalPresent += subPresent;

      subjectStats.push({
        subjectId: sub.id,
        subject: sub.name,
        total: subTotal,
        present: subPresent,
        absent: subAbsent,
        percentage
      });
    }

    const overallPercentage = totalClasses > 0 
      ? Math.round((totalPresent / totalClasses) * 100) 
      : 0;

    return res.json({
      success: true,
      summary: {
        totalClasses,
        totalPresent,
        totalAbsent: totalClasses - totalPresent,
        overallPercentage,
        subjects: subjectStats
      }
    });
  } catch (error) {
    console.error('Error in /api/students/me/attendance/summary:', error);
    return res.status(500).json({ success: false, message: 'Server error calculating attendance summary.' });
  }
});

module.exports = router;
