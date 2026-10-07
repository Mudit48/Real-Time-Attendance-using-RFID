import React, { useState, useEffect, useCallback } from 'react';
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

  // Subject attendance analytics
  const [subjectStudents, setSubjectStudents] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Defaulter list state
  const [showDefaulterModal, setShowDefaulterModal] = useState(false);
  const [defaulters, setDefaulters] = useState([]);
  const [defaultersLoading, setDefaultersLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const navigate = useNavigate();

  const fetchTeacherData = useCallback(async () => {
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
  }, [token]);

  const fetchSubjectAttendance = useCallback(async () => {
    if (!token) return;
    try {
      setAnalyticsLoading(true);
      const res = await fetch('/api/teachers/me/subject-attendance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubjectStudents(data.students || []);
      }
    } catch (err) {
      console.error('Error loading subject attendance:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTeacherData();
    fetchSubjectAttendance();
  }, [fetchTeacherData, fetchSubjectAttendance]);

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

  // Open & load Defaulter List
  const handleOpenDefaulterList = async () => {
    setShowDefaulterModal(true);
    setDefaultersLoading(true);
    try {
      const res = await fetch('/api/teachers/me/defaulters', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDefaulters(data.defaulters || []);
      }
    } catch (err) {
      console.error('Error fetching defaulters:', err);
    } finally {
      setDefaultersLoading(false);
    }
  };

  // Helper to trigger browser download from CSV response blob
  const downloadCsv = async (endpoint, defaultFilename) => {
    setExportLoading(true);
    try {
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export request failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportSubjectCsv = () => {
    const filename = `${teacher?.subjectName || 'Subject'}_Attendance_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv('/api/teachers/me/export-subject-csv', filename);
  };

  const handleExportDefaultersCsv = () => {
    const filename = `College_Defaulter_List_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv('/api/teachers/me/export-defaulters-csv', filename);
  };

  // Filter subject students
  const filteredStudents = subjectStudents.filter((st) => {
    const matchesSearch =
      st.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.collegeId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ELIGIBLE' && st.status === 'Eligible') ||
      (statusFilter === 'DEFAULTER' && st.status === 'Defaulter');

    return matchesSearch && matchesStatus;
  });

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
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: 'white',
            border: 'none',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    letterSpacing: '0.05em'
                  }}
                >
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

        {/* Assigned Subject Info Box & Quick Stats */}
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
              Authorized to conduct and analyze RFID attendance sessions for {teacher?.subjectName}
            </div>
          </div>

          <div className="card">
            <div className="stat-header">
              <span>Enrolled Students</span>
              <span>👥</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>
              {subjectStudents.length} Students
            </div>
            <div className="stat-subtext">
              {subjectStudents.filter(s => s.status === 'Eligible').length} Eligible (≥75%) • {subjectStudents.filter(s => s.status === 'Defaulter').length} Defaulters (&lt;75%)
            </div>
          </div>
        </div>

        {/* FEATURE 1 & 3: Subject-Wise Attendance Analytics Table */}
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 className="card-title">
                <span>📊</span> Attendance Analytics ({teacher?.subjectName})
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Subject-wise attendance tracking for all enrolled students in {teacher?.subjectName}.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                id="export-subject-csv-btn"
                onClick={handleExportSubjectCsv}
                disabled={exportLoading}
                className="btn btn-outline"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                title="Download current subject attendance report as CSV (Excel/Google Sheets)"
              >
                <span>📥</span> Export CSV
              </button>
              <button
                id="make-defaulter-list-btn"
                onClick={handleOpenDefaulterList}
                className="btn btn-danger"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                title="Generate and view college-wide defaulter list (<75% overall attendance)"
              >
                <span>⚠️</span> Make Defaulter List
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Search by Student Name or College ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Status:</span>
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
              >
                <option value="ALL">All Status</option>
                <option value="ELIGIBLE">Eligible (≥75%)</option>
                <option value="DEFAULTER">Defaulter (&lt;75%)</option>
              </select>
            </div>
          </div>

          {/* Subject Attendance Table */}
          {analyticsLoading ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading subject attendance records...
            </p>
          ) : filteredStudents.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No students match the search criteria.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>College ID</th>
                    <th>Subject</th>
                    <th style={{ textAlign: 'center' }}>Total Classes</th>
                    <th style={{ textAlign: 'center' }}>Classes Attended</th>
                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st) => (
                    <tr key={st.studentId}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{st.studentName}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{st.collegeId}</span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--primary)', fontWeight: '700' }}>
                          {st.subject}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{st.totalClasses}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--primary)' }}>
                        {st.classesAttended}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                            {st.totalClasses === 0 ? 'N/A' : `${st.attendancePercentage}%`}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${st.status === 'Eligible' ? 'badge-eligible' : 'badge-defaulter'}`}>
                          {st.status === 'Eligible' ? '✓ Eligible' : '⚠️ Defaulter'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {/* FEATURE 4 & 5: Defaulter List Modal */}
      {showDefaulterModal && (
        <div className="modal-overlay" onClick={() => setShowDefaulterModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚠️</span> College Defaulter List (&lt;75% Overall Attendance)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Calculated dynamically from total classes conducted across ALL subjects in the curriculum.
                </p>
              </div>
              <button
                onClick={() => setShowDefaulterModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {defaultersLoading ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Calculating overall attendance records across all subjects...
                </p>
              ) : defaulters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                  <h4 style={{ color: 'var(--success)' }}>No Defaulters Found!</h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    All enrolled students have an overall attendance of 75% or higher.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Total Defaulters Found: <strong style={{ color: 'var(--danger)' }}>{defaulters.length}</strong> students
                    </span>
                    <span className="badge badge-defaulter">
                      Criteria: &lt; 75.00%
                    </span>
                  </div>

                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>College ID</th>
                          <th style={{ textAlign: 'center' }}>Total Conducted</th>
                          <th style={{ textAlign: 'center' }}>Attended</th>
                          <th style={{ textAlign: 'center' }}>Overall %</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defaulters.map((d) => (
                          <tr key={d.studentId}>
                            <td style={{ fontWeight: '600' }}>{d.studentName}</td>
                            <td>
                              <span style={{ fontFamily: 'monospace' }}>{d.collegeId}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>{d.totalClasses}</td>
                            <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--danger)' }}>
                              {d.classesAttended}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--danger)' }}>
                              {d.overallPercentage}%
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-defaulter">Defaulter</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowDefaulterModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleExportDefaultersCsv}
                disabled={exportLoading || defaulters.length === 0}
              >
                <span>📥</span> Export Defaulter List CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
