import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-badge" style={{ margin: '0 auto 0.75rem auto', width: '48px', height: '48px', fontSize: '1.5rem' }}>
            📡
          </div>
          <h1>RFID Portal Login</h1>
          <p>Sign in to your Student or Teacher account</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <input
              id="email-input"
              type="email"
              className="form-control"
              placeholder="e.g. student@example.com or mis@college.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <input
              id="password-input"
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem' }}>
          <span>Don't have an account? </span>
          <Link to="/register" style={{ fontWeight: '600' }}>Register as Student</Link>
        </div>

        {/* Quick Demo Credentials Panel for College Presentation */}
        <div className="quick-demo-box">
          <div className="quick-demo-title">⚡ Quick Demo Test Accounts</div>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fillCredentials('student@example.com', 'student123')}
            >
              🎓 Student (Mudit)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fillCredentials('mis@college.com', 'teacher123')}
            >
              👨‍🏫 Teacher MIS
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fillCredentials('irs@college.com', 'teacher123')}
            >
              👨‍🏫 Teacher IRS
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fillCredentials('stqa@college.com', 'teacher123')}
            >
              👨‍🏫 Teacher STQA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
