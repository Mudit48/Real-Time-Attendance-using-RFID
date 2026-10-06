import React, { useState, useEffect, useCallback } from 'react';
import { createSocket } from '../socket';
import { useAuth } from '../context/AuthContext';
import BarChart from '../components/BarChart';

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');

  // Fetch student data
  const fetchData = useCallback(async (isBackgroundUpdate = false) => {
    if (!token) return;
    try {
      if (!isBackgroundUpdate) setLoading(true);

      const [profileRes, summaryRes, recordsRes] = await Promise.all([
        fetch('/api/students/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/students/me/attendance/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/students/me/attendance', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (profileRes.ok && summaryRes.ok && recordsRes.ok) {
        const profileData = await profileRes.json();
        const summaryData = await summaryRes.json();
        const recordsData = await recordsRes.json();

        setProfile(profileData.student);
        setSummary(summaryData.summary);
        setRecords(recordsData.records);
      } else {
        setError('Failed to load some attendance records.');
      }
    } catch (err) {
      console.error('Error fetching student dashboard data:', err);
      setError('Connection error fetching student data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket.IO real-time listener for 'attendanceUpdated'
  useEffect(() => {
    const socket = createSocket();

    socket.on('attendanceUpdated', (data) => {
      console.log('Real-time attendance update received:', data);
      setToastMessage(`⚡ Attendance updated live for ${data.subjectName || 'your course'} (${data.date || 'today'})!`);
      // Refetch attendance in background
      fetchData(true);

      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setToastMessage('');
      }, 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading student dashboard...</p>
      </div>
    );
  }

  // Filter records
  const filteredRecords = filterSubject === 'ALL'
    ? records
    : records.filter(r => r.subject.toUpperCase() === filterSubject.toUpperCase());

  // Find individual subject stats from summary
  const getSubjectStat = (name) => {
    if (!summary || !summary.subjects) return { present: 0, total: 0, percentage: 0 };
    const found = summary.subjects.find(s => s.subject.toUpperCase() === name.toUpperCase());
    return found || { present: 0, total: 0, percentage: 0 };
  };

  const misStat = getSubjectStat('MIS');
  const irsStat = getSubjectStat('IRS');
  const stqaStat = getSubjectStat('STQA');

  return (
    <div className="main-content">
      {/* Real-time Socket.io Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <span>📡</span>
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage('')}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '0.5rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Profile Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                fontWeight: '700'
              }}>
                {profile?.name ? profile.name.charAt(0) : 'S'}
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{profile?.name || user?.name}</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>🎓 College ID: <strong>{profile?.collegeId}</strong></span>
                  <span>•</span>
                  <span>🏛️ {profile?.department}</span>
                  <span>•</span>
                  <span>✉️ {profile?.email}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {profile?.rfidUid ? (
                <span className="badge badge-present" title="Hardware RFID Card Paired">
                  💳 RFID: {profile.rfidUid}
                </span>
              ) : (
                <span className="badge badge-absent" title="Card not assigned yet">
                  💳 RFID: Unassigned
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Summary Stat Cards */}
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Attendance Summary</h3>
          <div className="stats-grid">
            {/* Overall Attendance */}
            <div className="stat-card overall">
              <div className="stat-header">
                <span>Overall Attendance</span>
                <span>🎯</span>
              </div>
              <div className="stat-value" style={{ 
                color: (summary?.overallPercentage || 0) >= 75 ? 'var(--success)' : 'var(--danger)' 
              }}>
                {summary?.overallPercentage || 0}%
              </div>
              <div className="stat-subtext">
                {summary?.totalPresent || 0} / {summary?.totalClasses || 0} Total Classes
              </div>
            </div>

            {/* MIS Attendance */}
            <div className="stat-card mis">
              <div className="stat-header">
                <span>MIS Attendance</span>
                <span>📚</span>
              </div>
              <div className="stat-value">{misStat.percentage}%</div>
              <div className="stat-subtext">
                {misStat.present} / {misStat.total} Classes Attended
              </div>
            </div>

            {/* IRS Attendance */}
            <div className="stat-card irs">
              <div className="stat-header">
                <span>IRS Attendance</span>
                <span>🔬</span>
              </div>
              <div className="stat-value">{irsStat.percentage}%</div>
              <div className="stat-subtext">
                {irsStat.present} / {irsStat.total} Classes Attended
              </div>
            </div>

            {/* STQA Attendance */}
            <div className="stat-card stqa">
              <div className="stat-header">
                <span>STQA Attendance</span>
                <span>🧪</span>
              </div>
              <div className="stat-value">{stqaStat.percentage}%</div>
              <div className="stat-subtext">
                {stqaStat.present} / {stqaStat.total} Classes Attended
              </div>
            </div>
          </div>
        </div>

        {/* Graphical Representation */}
        <BarChart subjects={summary?.subjects || []} />

        {/* Attendance History Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>📋</span> Attendance History
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filter Subject:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <option value="ALL">All Subjects</option>
                <option value="MIS">MIS</option>
                <option value="IRS">IRS</option>
                <option value="STQA">STQA</option>
              </select>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No attendance records recorded yet.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: '600' }}>{rec.subject}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {rec.date}
                        {rec.session_id && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            (Session #{rec.session_id})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${rec.status === 'Present' ? 'badge-present' : 'badge-absent'}`}>
                          {rec.status === 'Present' ? '✓ Present' : '✗ Absent'}
                        </span>
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
