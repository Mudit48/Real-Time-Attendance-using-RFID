import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSocket } from '../socket';
import { useAuth } from '../context/AuthContext';

export default function TeacherScan() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [cancelLoadingId, setCancelLoadingId] = useState(null);

  // Hardware Simulator state for presentation
  const [customUid, setCustomUid] = useState('');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Fetch session and scanned students
  const fetchSessionData = useCallback(async () => {
    if (!sessionId || !token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/session/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSession(data.session);
        setStudents(data.scannedStudents || []);
      } else {
        setError(data.message || 'Failed to load session details.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error loading session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, token]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Setup Socket.IO for real-time live scanning updates
  useEffect(() => {
    if (!sessionId) return;

    const socket = createSocket();

    socket.emit('joinSession', sessionId);

    // Live student scan event from ESP8266 NodeMCU
    socket.on('studentScanned', (newScan) => {
      console.log('Real-time scan received:', newScan);
      if (parseInt(newScan.sessionId, 10) === parseInt(sessionId, 10)) {
        setStudents((prev) => {
          // Prevent duplicates in state if already present
          if (prev.some((s) => s.student_id === newScan.studentId)) {
            return prev;
          }
          return [
            {
              entry_id: newScan.entryId,
              scanned_at: newScan.scannedAt,
              student_id: newScan.studentId,
              name: newScan.name,
              college_id: newScan.collegeId,
              department: newScan.department,
              rfid_uid: newScan.rfidUid
            },
            ...prev
          ];
        });
      }
    });

    // Live entry cancellation event
    socket.on('entryCancelled', (data) => {
      if (parseInt(data.sessionId, 10) === parseInt(sessionId, 10)) {
        setStudents((prev) => prev.filter((s) => s.entry_id !== data.entryId));
      }
    });

    // Session saved/finalized event
    socket.on('sessionSaved', (data) => {
      if (parseInt(data.sessionId, 10) === parseInt(sessionId, 10)) {
        setSaveSuccess('Attendance saved successfully.');
      }
    });

    return () => {
      socket.emit('leaveSession', sessionId);
      socket.disconnect();
    };
  }, [sessionId]);

  // Cancel individual student entry
  const handleCancelEntry = async (entryId) => {
    if (!confirm('Are you sure you want to cancel this scanned entry?')) return;
    setCancelLoadingId(entryId);
    try {
      const res = await fetch(`/api/attendance/session/${sessionId}/cancel/${entryId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // State update handled by socket or fallback
        setStudents((prev) => prev.filter((s) => s.entry_id !== entryId));
      } else {
        alert(data.message || 'Failed to cancel entry.');
      }
    } catch (err) {
      console.error(err);
      alert('Error cancelling attendance entry.');
    } finally {
      setCancelLoadingId(null);
    }
  };

  // Finalize / Save Attendance Session
  const handleSaveAttendance = async () => {
    if (!confirm('Finalize and save attendance? Unscanned registered students will be marked Absent.')) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/attendance/session/${sessionId}/save`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess('Attendance saved successfully.');
        setTimeout(() => {
          navigate('/teacher/dashboard');
        }, 1800);
      } else {
        setError(data.message || 'Failed to save attendance session.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error saving attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Trigger simulated RFID scan (Hardware Demo Helper)
  const triggerScan = async (uidToScan) => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/rfid/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uidToScan })
      });
      const data = await res.json();
      setSimResult({
        success: res.ok && data.success,
        message: data.message,
        student: data.student
      });
    } catch (err) {
      setSimResult({
        success: false,
        message: 'Network error communicating with RFID endpoint'
      });
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Initializing live RFID scanning session...</p>
      </div>
    );
  }

  const sessionDateFormatted = session?.sessionDate
    ? new Date(session.sessionDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : '';

  return (
    <div className="main-content">
      {saveSuccess && (
        <div className="alert alert-success" style={{ fontSize: '1.05rem', fontWeight: '600' }}>
          <span>✅</span>
          <span>{saveSuccess} Redirecting to teacher dashboard...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Session Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '2rem' }}>{session?.subjectName} Attendance</h1>
            <span className="badge badge-active" style={{ fontSize: '0.85rem' }}>
              ● Scanning Active
            </span>
          </div>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            📅 {sessionDateFormatted || session?.sessionDate} • Faculty: {session?.teacherName}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="btn btn-outline"
          >
            ← Back to Dashboard
          </button>
          <button
            id="save-attendance-btn"
            onClick={handleSaveAttendance}
            disabled={saving || session?.status === 'completed'}
            className="btn btn-success btn-lg"
            style={{ fontWeight: '700', padding: '0.75rem 1.75rem' }}
          >
            {saving ? 'Saving...' : '💾 SAVE ATTENDANCE'}
          </button>
        </div>
      </div>

      {/* Live Radar Pulse Box */}
      <div className="scan-radar">
        <div className="pulse-ring">
          <div className="pulse-core">📡</div>
        </div>
        <h3 style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>Scanning Active</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px' }}>
          Waiting for RFID card tap from ESP8266 NodeMCU. Live entries will appear instantly below.
        </p>
        <span style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
          {students.length} student{students.length === 1 ? '' : 's'} recorded in this session
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Scanned Students Live Feed */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>👥</span> Scanned Students ({students.length})
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Real-time feed
            </span>
          </div>

          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</div>
              <p style={{ fontWeight: '600' }}>No students scanned yet</p>
              <p style={{ fontSize: '0.85rem' }}>
                Tap an RFID card on NodeMCU reader or use the Test Simulator on the right to test.
              </p>
            </div>
          ) : (
            <div className="scanned-list">
              {students.map((st) => (
                <div key={st.entry_id} className="scanned-item">
                  <div className="scanned-student-info">
                    <span className="scanned-student-name">{st.name}</span>
                    <div className="scanned-student-meta">
                      <span>College ID: <strong>{st.college_id}</strong></span>
                      <span>•</span>
                      <span>{st.department}</span>
                      {st.rfid_uid && (
                        <>
                          <span>•</span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                            [{st.rfid_uid}]
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-present" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                      ✓ Present
                    </span>
                    <button
                      onClick={() => handleCancelEntry(st.entry_id)}
                      disabled={cancelLoadingId === st.entry_id}
                      className="btn btn-outline-danger btn-sm"
                      title="Cancel this scanned attendance entry"
                    >
                      {cancelLoadingId === st.entry_id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NodeMCU / RFID Reader Simulator Widget */}
        <div className="card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '1.05rem' }}>
              <span>🛠️</span> NodeMCU RFID Test Simulator
            </h3>
            <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>
              HW Tool
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Simulate an ESP8266 + MFRC522 tap sending <code>POST /api/rfid/scan</code>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Quick Registered Card Taps:
            </span>

            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: 'white' }}
              onClick={() => triggerScan('80:88:60:2A')}
              disabled={simLoading}
            >
              <span>Mudit Meshram (202303034)</span>
              <code style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>80:88:60:2A</code>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: 'white' }}
              onClick={() => triggerScan('7C:3E:7E:B0')}
              disabled={simLoading}
            >
              <span>Rishabh Kanojiya (202303035)</span>
              <code style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>7C:3E:7E:B0</code>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: 'white' }}
              onClick={() => triggerScan('CC:BD:CD:B0')}
              disabled={simLoading}
            >
              <span>Atharva Ghorpade (202303036)</span>
              <code style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>CC:BD:CD:B0</code>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: 'white' }}
              onClick={() => triggerScan('42:C5:56:D9')}
              disabled={simLoading}
            >
              <span>Siddhi Jadhav (202303037)</span>
              <code style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>42:C5:56:D9</code>
            </button>
          </div>

          {/* Custom UID Scanner Input */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Custom UID (e.g. 80:88:60:2A)"
              value={customUid}
              onChange={(e) => setCustomUid(e.target.value)}
              style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}
            />
            <button
              type="button"
              onClick={() => customUid && triggerScan(customUid)}
              disabled={simLoading || !customUid}
              className="btn btn-primary btn-sm"
            >
              {simLoading ? 'Scanning...' : 'Simulate Scan'}
            </button>
          </div>

          {/* Test Scanner Output Feedback */}
          {simResult && (
            <div className={`alert ${simResult.success ? 'alert-success' : 'alert-danger'}`} style={{ padding: '0.65rem 0.85rem', fontSize: '0.82rem', marginBottom: 0 }}>
              <span>{simResult.success ? '✓' : '✗'}</span>
              <span>
                {simResult.message}
                {simResult.student && ` — ${simResult.student.name} (${simResult.student.collegeId})`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
