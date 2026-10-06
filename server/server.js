const http = require('http');
const express = require('express');
const cors = require('cors');
const { PORT } = require('./src/config');
const { initSchema } = require('./src/database/schema');
const { initSocket } = require('./src/socket');

// Route handlers
const authRoutes = require('./src/routes/auth');
const studentRoutes = require('./src/routes/students');
const teacherRoutes = require('./src/routes/teachers');
const attendanceRoutes = require('./src/routes/attendance');
const rfidRoutes = require('./src/routes/rfid');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/rfid', rfidRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'RFID Attendance Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Ensure database schema is ready then listen
async function startServer() {
  try {
    await initSchema();
    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`RFID Attendance Server listening on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
