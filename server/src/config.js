require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'rfid-attendance-super-secret-key-2026',
  JWT_EXPIRES_IN: '7d'
};
