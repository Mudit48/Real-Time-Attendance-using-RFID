import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    collegeId: '',
    department: 'Information Technology',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        collegeId: formData.collegeId,
        department: formData.department,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <div className="brand-badge" style={{ margin: '0 auto 0.75rem auto', width: '48px', height: '48px', fontSize: '1.5rem' }}>
            🎓
          </div>
          <h1>Student Registration</h1>
          <p>Create your student attendance profile</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              name="name"
              type="text"
              className="form-control"
              placeholder="e.g. Mudit Meshram"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-college-id">College ID</label>
              <input
                id="reg-college-id"
                name="collegeId"
                type="text"
                className="form-control"
                placeholder="e.g. 202303034"
                value={formData.collegeId}
                onChange={handleChange}
                required
              />
              <span className="form-hint">Primary Unique ID</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-department">Department</label>
              <select
                id="reg-department"
                name="department"
                className="form-control"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="Information Technology">Information Technology</option>
                <option value="Computer Engineering">Computer Engineering</option>
                <option value="Electronics & Telecommunication">Electronics & Telecom</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">College / Personal Email</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className="form-control"
              placeholder="e.g. student@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                name="password"
                type="password"
                className="form-control"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm-password">Confirm Password</label>
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type="password"
                className="form-control"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Profile...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem' }}>
          <span>Already registered? </span>
          <Link to="/login" style={{ fontWeight: '600' }}>Sign In here</Link>
        </div>
      </div>
    </div>
  );
}
