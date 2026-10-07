const express = require('express');
const router = express.Router();
const { get, all } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All teacher routes require authentication and 'teacher' role
router.use(authenticateToken);
router.use(requireRole('teacher'));

// Helper to get teacher profile with subject details
async function getTeacherProfile(userId) {
  return await get(
    `SELECT t.id, t.name, t.subject_id, s.name as subject_name, u.email
     FROM teachers t
     JOIN users u ON t.user_id = u.id
     JOIN subjects s ON t.subject_id = s.id
     WHERE t.user_id = ?`,
    [userId]
  );
}

// GET /api/teachers/me
router.get('/me', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);

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

// GET /api/teachers/me/subject-attendance
// Returns student attendance for the teacher's assigned subject
router.get('/me/subject-attendance', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    const students = await all('SELECT id, college_id, name, department FROM students ORDER BY name ASC');
    const subjectId = teacher.subject_id;

    // Get subject stats for each student
    const subjectAttendance = [];
    for (const st of students) {
      const stats = await get(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
         FROM attendance_records
         WHERE student_id = ? AND subject_id = ?`,
        [st.id, subjectId]
      );

      const totalClasses = stats.total || 0;
      const classesAttended = stats.present || 0;
      const attendancePercentage = totalClasses > 0
        ? Math.round((classesAttended / totalClasses) * 10000) / 100
        : 0;

      const status = totalClasses === 0 || attendancePercentage >= 75 ? 'Eligible' : 'Defaulter';

      subjectAttendance.push({
        studentId: st.id,
        studentName: st.name,
        collegeId: st.college_id,
        department: st.department,
        subject: teacher.subject_name,
        totalClasses,
        classesAttended,
        attendancePercentage,
        status
      });
    }

    return res.json({
      success: true,
      subject: {
        id: teacher.subject_id,
        name: teacher.subject_name
      },
      students: subjectAttendance
    });
  } catch (error) {
    console.error('Error in /api/teachers/me/subject-attendance:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching subject attendance.' });
  }
});

// GET /api/teachers/me/defaulters
// Generates institution-wide Defaulter List: students whose OVERALL attendance across all subjects is < 75%
router.get('/me/defaulters', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    const students = await all('SELECT id, college_id, name, department FROM students ORDER BY name ASC');
    const defaulters = [];

    for (const st of students) {
      const stats = await get(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
         FROM attendance_records
         WHERE student_id = ?`,
        [st.id]
      );

      const totalClasses = stats.total || 0;
      const classesAttended = stats.present || 0;
      const overallPercentage = totalClasses > 0
        ? Math.round((classesAttended / totalClasses) * 10000) / 100
        : 0;

      // Only include students who have had conducted classes and whose overall attendance is below 75%
      if (totalClasses > 0 && overallPercentage < 75) {
        defaulters.push({
          studentId: st.id,
          studentName: st.name,
          collegeId: st.college_id,
          department: st.department,
          totalClasses,
          classesAttended,
          overallPercentage,
          status: 'Defaulter'
        });
      }
    }

    return res.json({
      success: true,
      threshold: 75,
      totalDefaulters: defaulters.length,
      defaulters
    });
  } catch (error) {
    console.error('Error in /api/teachers/me/defaulters:', error);
    return res.status(500).json({ success: false, message: 'Server error generating defaulter list.' });
  }
});

// GET /api/teachers/me/export-subject-csv
// Exports current subject attendance table as CSV for Excel / Google Sheets
router.get('/me/export-subject-csv', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    const students = await all('SELECT id, college_id, name, department FROM students ORDER BY name ASC');
    const subjectId = teacher.subject_id;

    // Header row
    let csvContent = 'Student Name,College ID,Department,Subject,Total Classes,Classes Attended,Attendance %,Status\n';

    for (const st of students) {
      const stats = await get(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
         FROM attendance_records
         WHERE student_id = ? AND subject_id = ?`,
        [st.id, subjectId]
      );

      const totalClasses = stats.total || 0;
      const classesAttended = stats.present || 0;
      const attendancePercentage = totalClasses > 0
        ? Math.round((classesAttended / totalClasses) * 10000) / 100
        : 0;

      const status = totalClasses === 0 || attendancePercentage >= 75 ? 'Eligible' : 'Defaulter';

      csvContent += `"${st.name}","${st.college_id}","${st.department}","${teacher.subject_name}",${totalClasses},${classesAttended},${attendancePercentage}%,${status}\n`;
    }

    const filename = `${teacher.subject_name}_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting subject CSV:', error);
    return res.status(500).json({ success: false, message: 'Server error exporting subject CSV.' });
  }
});

// GET /api/teachers/me/export-defaulters-csv
// Exports institution-wide Defaulter List as CSV for Excel / Google Sheets
router.get('/me/export-defaulters-csv', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    const students = await all('SELECT id, college_id, name, department FROM students ORDER BY name ASC');

    // Header row
    let csvContent = 'Student Name,College ID,Department,Total Classes Conducted,Classes Attended,Overall Attendance %,Status\n';

    for (const st of students) {
      const stats = await get(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
         FROM attendance_records
         WHERE student_id = ?`,
        [st.id]
      );

      const totalClasses = stats.total || 0;
      const classesAttended = stats.present || 0;
      const overallPercentage = totalClasses > 0
        ? Math.round((classesAttended / totalClasses) * 10000) / 100
        : 0;

      if (totalClasses > 0 && overallPercentage < 75) {
        csvContent += `"${st.name}","${st.college_id}","${st.department}",${totalClasses},${classesAttended},${overallPercentage}%,Defaulter\n`;
      }
    }

    const filename = `College_Defaulter_List_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting defaulters CSV:', error);
    return res.status(500).json({ success: false, message: 'Server error exporting defaulters CSV.' });
  }
});

module.exports = router;
