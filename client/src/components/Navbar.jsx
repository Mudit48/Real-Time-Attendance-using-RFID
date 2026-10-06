import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link 
          to={user ? (user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard') : '/login'} 
          className="navbar-brand"
        >
          <div className="brand-badge">📡</div>
          <span>RFID Attendance System</span>
        </Link>

        {user && (
          <div className="navbar-user">
            <div className="user-tag">
              <span className={`role-badge ${user.role}`}>
                {user.role}
              </span>
              <span>
                {user.profile?.name || user.email}
              </span>
              {user.role === 'teacher' && user.profile?.subjectName && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  ({user.profile.subjectName})
                </span>
              )}
              {user.role === 'student' && user.profile?.collegeId && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  ID: {user.profile.collegeId}
                </span>
              )}
            </div>

            <button onClick={handleLogout} className="btn btn-outline btn-sm">
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
