const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');
const { getIO } = require('../socket');

// Normalize UID (remove colons, dashes, spaces, convert to uppercase)
function normalizeUid(uid) {
  if (!uid) return '';
  if (typeof uid === 'object') {
    uid = uid.uid || uid.card_uid || uid.cardUid || uid.rfid || uid.UID || '';
  }
  return uid.toString().trim().replace(/[:\s\-_]/g, '').toUpperCase();
}

// POST/GET /api/rfid/scan
// Called by ESP8266 NodeMCU (or simulated test tool)
router.all('/scan', async (req, res) => {
  try {
    console.log(`\n--- [RFID SCAN REQUEST] ---`);
    console.log(`Method: ${req.method} | Content-Type: ${req.headers['content-type']}`);
    console.log('Body:', req.body);
    console.log('Query:', req.query);

    let rawUid = '';
    if (typeof req.body === 'string' && req.body.trim()) {
      try {
        const parsed = JSON.parse(req.body);
        rawUid = parsed.uid || parsed.card_uid || parsed.cardUid || parsed.rfid || parsed.UID || '';
      } catch (e) {
        rawUid = req.body;
      }
    } else if (req.body && typeof req.body === 'object') {
      rawUid = req.body.uid || req.body.card_uid || req.body.cardUid || req.body.rfid || req.body.UID || '';
    }

    if (!rawUid && req.query) {
      rawUid = req.query.uid || req.query.card_uid || req.query.cardUid || req.query.rfid || req.query.UID || '';
    }

    if (!rawUid) {
      console.warn('[RFID SCAN] Rejected: No UID provided in body or query params.');
      return res.status(200).json({
        success: false,
        error: 'NO_UID',
        message: 'UID is required.'
      });
    }

    const cleanUid = normalizeUid(rawUid);
    console.log(`[RFID SCAN] Normalized UID: "${cleanUid}" (from raw: "${rawUid}")`);

    // 1. Check if there is an active attendance session
    const activeSession = await get(
      `SELECT ses.*, sub.name as subject_name 
       FROM attendance_sessions ses 
       JOIN subjects sub ON ses.subject_id = sub.id 
       WHERE ses.status = 'scanning' 
       ORDER BY ses.id DESC 
       LIMIT 1`
    );

    if (!activeSession) {
      console.warn('[RFID SCAN] Rejected: No active scanning session found.');
      return res.status(200).json({
        success: false,
        error: 'NO_ACTIVE_SESSION',
        message: 'No active attendance session. Teacher must start scan on dashboard.'
      });
    }

    // 2. Find RFID card and associated student (comparing normalized hex)
    const cards = await all(
      `SELECT rc.id as card_id, rc.uid, s.id as student_id, s.name, s.college_id, s.department
       FROM rfid_cards rc
       JOIN students s ON rc.student_id = s.id`
    );

    const cardRecord = cards.find(c => normalizeUid(c.uid) === cleanUid);

    if (!cardRecord) {
      console.warn(`[RFID SCAN] Rejected: UID ${cleanUid} is not registered to any student.`);
      return res.status(200).json({
        success: false,
        error: 'CARD_NOT_REGISTERED',
        message: `RFID card [${rawUid}] not registered in system.`
      });
    }

    // 3. Check for duplicate scan in the current session
    const existingEntry = await get(
      'SELECT id FROM attendance_entries WHERE session_id = ? AND student_id = ?',
      [activeSession.id, cardRecord.student_id]
    );

    if (existingEntry) {
      console.log(`[RFID SCAN] Student already scanned: ${cardRecord.name} (${cardRecord.college_id})`);
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `${cardRecord.name} already scanned.`,
        student: {
          name: cardRecord.name,
          collegeId: cardRecord.college_id,
          department: cardRecord.department
        }
      });
    }

    // 4. Create temporary attendance entry
    const entryResult = await run(
      'INSERT INTO attendance_entries (session_id, student_id) VALUES (?, ?)',
      [activeSession.id, cardRecord.student_id]
    );

    const newEntryId = entryResult.lastID;
    const nowIso = new Date().toISOString();

    const scannedData = {
      entryId: newEntryId,
      sessionId: activeSession.id,
      studentId: cardRecord.student_id,
      name: cardRecord.name,
      collegeId: cardRecord.college_id,
      department: cardRecord.department,
      rfidUid: cardRecord.uid,
      scannedAt: nowIso
    };

    // 5. Broadcast live scan event via Socket.IO
    try {
      const io = getIO();
      // Broadcast to room and generally
      io.to(`session_${activeSession.id}`).emit('studentScanned', scannedData);
      io.emit('studentScanned', scannedData);
      console.log(`[RFID SCAN] Broadcasted socket event for: ${cardRecord.name}`);
    } catch (socketErr) {
      console.warn('Socket broadcast warning:', socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Student scanned successfully',
      student: {
        name: cardRecord.name,
        collegeId: cardRecord.college_id,
        department: cardRecord.department
      }
    });
  } catch (error) {
    console.error('Error in /api/rfid/scan:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing RFID scan.'
    });
  }
});

// GET /api/rfid/registered-cards
// Useful for development/testing and listing available RFID mappings
router.get('/registered-cards', async (req, res) => {
  try {
    const cards = await all(
      `SELECT rc.uid, s.name, s.college_id, s.department
       FROM rfid_cards rc
       JOIN students s ON rc.student_id = s.id
       ORDER BY s.name ASC`
    );
    return res.json({ success: true, cards });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching cards.' });
  }
});

module.exports = router;
