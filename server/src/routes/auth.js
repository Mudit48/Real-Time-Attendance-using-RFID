const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get } = require('../database/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { authenticateToken } = require('../middleware/auth');

// Helper to create JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /api/auth/register (Student Registration)
router.post('/register', async (req, res) => {
  try {
    const { name, collegeId, department, email, password, confirmPassword } = req.body;

    // Validate fields
    if (!name || !collegeId || !department || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required.' 
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match.' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long.' 
      });
    }

    // Check if email already registered
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already registered.' 
      });
    }

    // Check if college ID already registered
    const existingCollegeId = await get('SELECT id FROM students WHERE college_id = ?', [collegeId.trim()]);
    if (existingCollegeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'College ID is already registered.' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const userResult = await run(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email.trim().toLowerCase(), passwordHash, 'student']
    );
    const userId = userResult.lastID;

    // Insert student
    const studentResult = await run(
      'INSERT INTO students (user_id, college_id, name, department) VALUES (?, ?, ?, ?)',
      [userId, collegeId.trim(), name.trim(), department.trim()]
    );
    const studentId = studentResult.lastID;

    // Generate token
    const token = generateToken({
      id: userId,
      email: email.trim().toLowerCase(),
      role: 'student',
      studentId: studentId,
      collegeId: collegeId.trim(),
      name: name.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      token,
      user: {
        id: userId,
        email: email.trim().toLowerCase(),
        role: 'student',
        student: {
          id: studentId,
          name: name.trim(),
          collegeId: collegeId.trim(),
          department: department.trim()
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.' 
      });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    let profile = null;
    let payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    if (user.role === 'student') {
      const student = await get('SELECT * FROM students WHERE user_id = ?', [user.id]);
      if (student) {
        payload.studentId = student.id;
        payload.collegeId = student.college_id;
        payload.name = student.name;
        profile = {
          id: student.id,
          name: student.name,
          collegeId: student.college_id,
          department: student.department
        };
      }
    } else if (user.role === 'teacher') {
      const teacher = await get(
        `SELECT t.*, s.name as subject_name 
         FROM teachers t 
         JOIN subjects s ON t.subject_id = s.id 
         WHERE t.user_id = ?`,
        [user.id]
      );
      if (teacher) {
        payload.teacherId = teacher.id;
        payload.subjectId = teacher.subject_id;
        payload.subjectName = teacher.subject_name;
        payload.name = teacher.name;
        profile = {
          id: teacher.id,
          name: teacher.name,
          subjectId: teacher.subject_id,
          subjectName: teacher.subject_name
        };
      }
    }

    const token = generateToken(payload);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT id, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let profile = null;
    if (user.role === 'student') {
      const student = await get(
        `SELECT s.*, r.uid as rfid_uid 
         FROM students s 
         LEFT JOIN rfid_cards r ON s.id = r.student_id 
         WHERE s.user_id = ?`,
        [user.id]
      );
      if (student) {
        profile = {
          id: student.id,
          name: student.name,
          collegeId: student.college_id,
          department: student.department,
          rfidUid: student.rfid_uid || null
        };
      }
    } else if (user.role === 'teacher') {
      const teacher = await get(
        `SELECT t.*, s.name as subject_name 
         FROM teachers t 
         JOIN subjects s ON t.subject_id = s.id 
         WHERE t.user_id = ?`,
        [user.id]
      );
      if (teacher) {
        profile = {
          id: teacher.id,
          name: teacher.name,
          subjectId: teacher.subject_id,
          subjectName: teacher.subject_name
        };
      }
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
});

module.exports = router;
