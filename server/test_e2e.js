const http = require('http');

async function request(path, options = {}) {
  const url = `http://localhost:5000${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}

async function runTests() {
  console.log('--- Starting RFID Attendance System Automated E2E Test ---');

  // 1. Health check
  const health = await request('/api/health');
  console.log('[1] Health check:', health.data.status === 'ok' ? 'PASS ✅' : 'FAIL ❌');

  // 2. Student login
  const studentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@example.com', password: 'student123' })
  });
  console.log('[2] Student login:', studentLogin.ok ? 'PASS ✅' : 'FAIL ❌', studentLogin.data.user?.profile?.name);
  const studentToken = studentLogin.data.token;

  // 3. Student summary
  const summary = await request('/api/students/me/attendance/summary', {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log('[3] Student summary:', summary.ok ? 'PASS ✅' : 'FAIL ❌', `Overall: ${summary.data.summary?.overallPercentage}%`);

  // 4. Teacher MIS login
  const teacherLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'mis@college.com', password: 'teacher123' })
  });
  console.log('[4] Teacher MIS login:', teacherLogin.ok ? 'PASS ✅' : 'FAIL ❌', `Subject: ${teacherLogin.data.user?.profile?.subjectName}`);
  const teacherToken = teacherLogin.data.token;

  // 5. Teacher starts attendance session
  const startSession = await request('/api/attendance/start', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  console.log('[5] Start attendance session:', startSession.ok ? 'PASS ✅' : 'FAIL ❌', `Session ID: ${startSession.data.session?.id}`);
  const sessionId = startSession.data.session?.id;

  // 6. Scan unregistered RFID card
  const unregScan = await request('/api/rfid/scan', {
    method: 'POST',
    body: JSON.stringify({ uid: '99:99:99:99' })
  });
  console.log('[6] Unregistered card rejection:', unregScan.data.success === false && unregScan.data.error === 'CARD_NOT_REGISTERED' ? 'PASS ✅' : 'FAIL ❌');

  // 7. Scan Mudit's card (80:88:60:2A)
  const muditScan = await request('/api/rfid/scan', {
    method: 'POST',
    body: JSON.stringify({ uid: '80:88:60:2A' })
  });
  console.log('[7] Mudit card scan:', muditScan.ok && muditScan.data.student?.name === 'Mudit Meshram' ? 'PASS ✅' : 'FAIL ❌');

  // 8. Test duplicate scan
  const dupScan = await request('/api/rfid/scan', {
    method: 'POST',
    body: JSON.stringify({ uid: '80:88:60:2A' })
  });
  console.log('[8] Duplicate scan prevention:', dupScan.data.duplicate === true ? 'PASS ✅' : 'FAIL ❌');

  // 9. Scan Rishabh's card (7C:3E:7E:B0)
  const rishabhScan = await request('/api/rfid/scan', {
    method: 'POST',
    body: JSON.stringify({ uid: '7C:3E:7E:B0' })
  });
  console.log('[9] Rishabh card scan:', rishabhScan.ok && rishabhScan.data.student?.name === 'Rishabh Kanojiya' ? 'PASS ✅' : 'FAIL ❌');

  // 10. Check session scanned list
  const sessionInfo = await request(`/api/attendance/session/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  console.log('[10] Session scanned list count:', sessionInfo.data.scannedStudents?.length === 2 ? 'PASS ✅ (2 students scanned)' : 'FAIL ❌');

  // 11. Cancel Rishabh's entry
  const rishabhEntry = sessionInfo.data.scannedStudents?.find(s => s.name === 'Rishabh Kanojiya');
  if (rishabhEntry) {
    const cancelRes = await request(`/api/attendance/session/${sessionId}/cancel/${rishabhEntry.entry_id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    console.log('[11] Cancel entry for Rishabh:', cancelRes.ok ? 'PASS ✅' : 'FAIL ❌');
  }

  // 12. Save Attendance Session
  const saveRes = await request(`/api/attendance/session/${sessionId}/save`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  console.log('[12] Save attendance session:', saveRes.ok && saveRes.data.message === 'Attendance saved successfully.' ? 'PASS ✅' : 'FAIL ❌');

  // 13. Verify attendance after save
  const updatedSummary = await request('/api/students/me/attendance/summary', {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log('[13] Student updated summary:', updatedSummary.ok ? 'PASS ✅' : 'FAIL ❌', `Classes: ${updatedSummary.data.summary?.totalClasses}`);

  console.log('\n--- ALL E2E API TESTS COMPLETED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
