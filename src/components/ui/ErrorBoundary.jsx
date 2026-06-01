import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AXINITE OS ERROR BOUNDARY]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    if (window.confirm('Reset local state? This clears cached interface state to resolve corrupt values but keeps cloud documents.')) {
      localStorage.removeItem('los_v4');
      localStorage.removeItem('los_active_note_id');
      localStorage.removeItem('los_show_note_editor');
      localStorage.removeItem('los_note_draft');
      sessionStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          width: '100vw',
          background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #03001e 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#f8fafc',
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          overflowY: 'auto'
        }}>
          {/* Custom Ambient Glow Elements */}
          <div style={{ position: 'absolute', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', top: '10%', left: '10%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', bottom: '10%', right: '10%', pointerEvents: 'none' }} />

          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '560px',
            background: 'rgba(30, 41, 59, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
            boxSizing: 'border-box'
          }}>
            {/* Pulsing AI Aura Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.15))',
              border: '1.5px solid rgba(124, 58, 237, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 28px',
              boxShadow: '0 0 30px rgba(124, 58, 237, 0.25)',
              position: 'relative'
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: '40px',
                background: 'linear-gradient(135deg, #a78bfa, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontVariationSettings: "'FILL' 1"
              }}>
                dangerous
              </span>
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              background: 'linear-gradient(to right, #f8fafc, #cbd5e1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              System Disrupted
            </h1>

            <p style={{
              fontSize: '14.5px',
              lineHeight: 1.6,
              color: '#94a3b8',
              marginBottom: '32px',
              maxWidth: '460px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              AXINITE OS intercepted a runtime thread exception. Your work is safely cached. Initialize recovery actions below.
            </p>

            {/* Error detail panel */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '14px',
              padding: '16px 20px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#f1f5f9',
              maxHeight: '140px',
              overflowY: 'auto',
              marginBottom: '36px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Exception: </span>
              {this.state.error?.toString() || 'Unknown runtime error'}
            </div>

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              gap: '14px',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <button 
                onClick={this.handleReload} 
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 10px 28px rgba(124, 58, 237, 0.35)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.25)';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                Restart Application
              </button>

              <button 
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restore</span>
                Reset Local Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
