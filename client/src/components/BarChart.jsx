import React from 'react';

export default function BarChart({ subjects = [] }) {
  if (!subjects || subjects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        No attendance data available yet to display graph.
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-header">
        <h3 className="card-title">
          <span>📊</span> Subject Attendance Analytics
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Min. requirement: 75%
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        {subjects.map((sub) => {
          const isEligible = sub.percentage >= 75;
          const barColor = isEligible ? 'var(--success)' : (sub.percentage >= 60 ? 'var(--warning)' : 'var(--danger)');

          return (
            <div key={sub.subjectId || sub.subject} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {sub.subject}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    ({sub.present} / {sub.total} classes attended)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontWeight: '800', 
                    fontSize: '1.1rem', 
                    color: barColor 
                  }}>
                    {sub.percentage}%
                  </span>
                  <span className={`badge ${isEligible ? 'badge-present' : 'badge-absent'}`} style={{ fontSize: '0.72rem' }}>
                    {isEligible ? 'Eligible' : 'Shortage'}
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div style={{
                position: 'relative',
                height: '18px',
                width: '100%',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}>
                {/* Threshold line 75% */}
                <div style={{
                  position: 'absolute',
                  left: '75%',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: 'rgba(15, 23, 42, 0.3)',
                  zIndex: 2,
                  pointerEvents: 'none'
                }} title="75% Attendance Requirement" />

                {/* Animated Fill Bar */}
                <div style={{
                  height: '100%',
                  width: `${Math.min(sub.percentage, 100)}%`,
                  background: barColor,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: '0.75rem', 
        color: 'var(--text-muted)',
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px dashed var(--border)'
      }}>
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>75% (Criteria)</span>
        <span>100%</span>
      </div>
    </div>
  );
}
