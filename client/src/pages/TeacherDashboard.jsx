import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TeacherDashboard() {
  const { token, user } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const fetchTeacherData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/teachers/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTeacher(data.teacher);
        setActiveSession(data.activeSession);
        setRecentSessions(data.recentSessions || []);
      } else {
        setError(data.message || 'Failed to load teacher profile');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error loading teacher profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [token]);

  const handleStartScan = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/attendance/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        navigate(`/teacher/scan?sessionId=${data.session.id}`);
      } else {
        setError(data.message || 'Failed to start scanning session');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error while initiating attendance scan');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading teacher dashboard...</p>
      </div>
    );
  }

  return (
    <div className="main-content">
      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Teacher Profile & Action Banner */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: 'white',
          border: 'none',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  letterSpacing: '0.05em'
                }}>
                  FACULTY PORTAL
                </span>
                <span style={{ color: '#c7d2fe', fontSize: '0.9rem' }}>
                  Subject: <strong style={{ color: 'white' }}>{teacher?.subjectName}</strong>
                </span>
              </div>
              <h1 style={{ color: 'white', fontSize: '1.85rem', marginBottom: '0.35rem' }}>
                {teacher?.name || user?.name}
              </h1>
              <p style={{ color: '#e0e7ff', fontSize: '0.95rem' }}>
                Department Attendance In-charge • {teacher?.email}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
              {activeSession ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fde047', fontSize: '0.9rem' }}>
                    <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block' }}>●</span>
                    <span>Active session in progress ({activeSession.session_date})</span>
                  </div>
                  <button
                    id="resume-scan-btn"
                    onClick={() => navigate(`/teacher/scan?sessionId=${activeSession.id}`)}
                    className="btn btn-primary btn-lg"
                    style={{ background: '#4f46e5', border: '1px solid #818cf8' }}
                  >
                    📡 Resume Active Scan
                  </button>
                </div>
              ) : (
                <button
                  id="start-scan-btn"
                  onClick={handleStartScan}
                  disabled={actionLoading}
                  className="btn btn-success btn-lg"
                  style={{ boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                >
                  <span>{actionLoading ? 'Initializing...' : '▶ Start RFID Scan'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Assigned Subject Info Box */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <div className="stat-header">
              <span>Assigned Subject</span>
              <span>📖</span>
            </div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>
              {teacher?.subjectName}
            </div>
            <div className="stat-subtext">
              Authorized to conduct RFID attendance sessions for {teacher?.subjectName}
            </div>
          </div>

          <div className="card">
            <div className="stat-header">
              <span>Session Status</span>
              <span>⚡</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>
              {activeSession ? (
                <span style={{ color: 'var(--warning)' }}>Scanning Active</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Idle / Standby</span>
              )}
            </div>
            <div className="stat-subtext">
              {activeSession ? `Session #${activeSession.id} open` : 'Ready to start a new attendance scan'}
            </div>
          </div>
        </div>

        {/* Recent Attendance Sessions Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>🗓️</span> Recent Attendance Sessions
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Subject: {teacher?.subjectName}
            </span>
          </div>

          {recentSessions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No past sessions recorded yet. Click <strong>Start RFID Scan</strong> above to begin your first session.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Scanned Students</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((ses) => (
                    <tr key={ses.id}>
                      <td style={{ fontWeight: '600' }}>#{ses.id}</td>
                      <td>{ses.session_date}</td>
                      <td>
                        <span className={`badge ${ses.status === 'completed' ? 'badge-present' : 'badge-active'}`}>
                          {ses.status === 'completed' ? '✓ Finalized' : '● Scanning'}
                        </span>
                      </td>
                      <td>{ses.scanned_count} students</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {new Date(ses.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
