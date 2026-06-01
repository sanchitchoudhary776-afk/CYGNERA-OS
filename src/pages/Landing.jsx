import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoFull } from '@components/ui/Logo';

export default function Landing() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: 'psychology',
      title: 'AI-Powered Learning',
      description: 'Adaptive algorithms learn your style and optimize every session for maximum retention'
    },
    {
      icon: 'trending_up',
      title: 'Predictive Insights',
      description: 'Know exactly what you\'ll forget before you do. Science-backed spaced repetition'
    },
    {
      icon: 'timer',
      title: 'Focus Mastery',
      description: 'Scientifically-tuned session optimization keeps you in the flow state longer'
    },
    {
      icon: 'shield_check',
      title: 'Your Data, Your Control',
      description: 'Military-grade encryption. Zero ads. We\'ll never sell your learning data'
    },
    {
      icon: 'bolt',
      title: 'Lightning Fast',
      description: 'Optimized for speed. Every interaction is instant. No unnecessary waiting'
    },
    {
      icon: 'hub',
      title: 'Connected Learning',
      description: 'Learn with a community. Share insights. Grow together with peers'
    }
  ];

  const stats = [
    { number: '50k+', label: 'Active Learners', subtext: 'Growing daily' },
    { number: '2M+', label: 'Focus Sessions', subtext: 'Completed' },
    { number: '43', label: 'Premium Features', subtext: 'All free forever' }
  ];

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--t1)', overflow: 'hidden' }}>
      {/* Animated gradient background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: 'var(--bg)',
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(9,205,131,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          top: '15%',
          right: '10%',
          animation: 'float 8s ease-in-out infinite',
          filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute',
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          bottom: '10%',
          left: '5%',
          animation: 'float 10s ease-in-out infinite 1s',
          filter: 'blur(40px)'
        }} />
      </div>

      {/* Navigation */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(9,205,131,0.1)',
        padding: '16px 32px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoFull size={40} />
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--p)', letterSpacing: '-0.03em' }}>AXINITE</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link to="/login" style={{
              padding: '10px 24px',
              borderRadius: 'var(--r-md)',
              background: 'transparent',
              border: '1px solid rgba(9,205,131,0.3)',
              color: 'var(--p)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 200ms ease',
              display: 'block'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(9,205,131,0.1)';
                e.currentTarget.style.borderColor = 'rgba(9,205,131,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(9,205,131,0.3)';
              }}
            >
              Sign In
            </Link>
            <Link to="/signup" style={{
              padding: '10px 24px',
              borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, var(--p), var(--p-lt))',
              color: '#000',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 200ms ease',
              display: 'block',
              boxShadow: '0 8px 20px rgba(9,205,131,0.3)'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(9,205,131,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(9,205,131,0.3)';
              }}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: '80px', paddingBottom: '120px' }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          textAlign: 'center'
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'rgba(9,205,131,0.1)',
            border: '1px solid rgba(9,205,131,0.2)',
            borderRadius: 'var(--r-full)',
            marginBottom: 24,
            animation: 'slideUp 600ms var(--bounce) both'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>spark</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--p)' }}>AI-Powered Learning Platform</span>
          </div>

          {/* Main heading */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 24,
            animation: 'slideUp 600ms var(--bounce) 100ms both',
            background: 'linear-gradient(135deg, var(--t1) 0%, var(--t2) 30%, var(--p) 70%, var(--p-lt) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Learn Smarter,<br />Not Harder
          </h1>

          {/* Subheading */}
          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
            color: 'var(--t2)',
            maxWidth: '700px',
            margin: '0 auto 40px',
            lineHeight: 1.6,
            animation: 'slideUp 600ms var(--bounce) 200ms both'
          }}>
            The AI study platform that adapts to <span style={{ color: 'var(--p)', fontWeight: 700 }}>how you learn</span>. Get personalized insights, master any subject, and achieve your goals faster.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'slideUp 600ms var(--bounce) 300ms both',
            marginBottom: 60
          }}>
            <Link to="/signup" style={{
              padding: '16px 40px',
              borderRadius: 'var(--r-lg)',
              background: 'linear-gradient(135deg, var(--p), var(--p-lt))',
              color: '#000',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              transition: 'all 200ms ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 12px 30px rgba(9,205,131,0.4)',
              border: 'none'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(9,205,131,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(9,205,131,0.4)';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>play_arrow</span>
              Start Learning Free
            </Link>

            <Link to="/login" style={{
              padding: '16px 40px',
              borderRadius: 'var(--r-lg)',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--t1)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              transition: 'all 200ms ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>
              Sign In Instead
            </Link>
          </div>

          {/* Trust badges */}
          <div style={{
            display: 'flex',
            gap: 24,
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'slideUp 600ms var(--bounce) 400ms both',
            paddingTop: 24,
            borderTop: '1px solid rgba(9,205,131,0.1)'
          }}>
            {[
              { icon: 'verified_user', text: 'Military-Grade Security' },
              { icon: 'trending_up', text: '50k+ Active Learners' },
              { icon: 'star', text: '4.9/5 Rating' }
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--p)' }}>{icon}</span>
                <span style={{ fontSize: 13, color: 'var(--t3)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(9,205,131,0.03)',
        border: '1px solid rgba(9,205,131,0.1)',
        borderRadius: 'var(--r-xl)',
        padding: '60px 32px',
        margin: '0 auto 120px',
        maxWidth: '1400px',
        width: 'calc(100% - 48px)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 40
        }}>
          {stats.map(({ number, label, subtext }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 900,
                background: 'linear-gradient(135deg, var(--p), var(--p-lt))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                letterSpacing: '-0.03em'
              }}>
                {number}
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', margin: '8px 0 4px' }}>{label}</p>
              <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>{subtext}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px 120px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 3.5vw, 3rem)',
            fontWeight: 800,
            color: 'var(--t1)',
            marginBottom: 16,
            letterSpacing: '-0.02em'
          }}>
            Everything You Need to <span style={{ color: 'var(--p)' }}>Master Any Subject</span>
          </h2>
          <p style={{
            fontSize: 16,
            color: 'var(--t3)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Premium features designed by learning scientists to accelerate your progress
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24
        }}>
          {features.map(({ icon, title, description }, idx) => (
            <div
              key={title}
              style={{
                padding: 32,
                borderRadius: 'var(--r-lg)',
                background: 'rgba(9,205,131,0.03)',
                border: '1px solid rgba(9,205,131,0.1)',
                cursor: 'pointer',
                transition: 'all 300ms ease',
                animation: `slideUp 600ms var(--bounce) ${300 + idx * 50}ms both`
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(9,205,131,0.08)';
                e.currentTarget.style.borderColor = 'rgba(9,205,131,0.3)';
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(9,205,131,0.03)';
                e.currentTarget.style.borderColor = 'rgba(9,205,131,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--r-md)',
                background: 'rgba(9,205,131,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                transition: 'all 300ms ease'
              }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 28,
                  color: 'var(--p)',
                  fontVariationSettings: "'FILL' 0"
                }}>
                  {icon}
                </span>
              </div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--t1)',
                margin: '0 0 12px',
                letterSpacing: '-0.01em'
              }}>
                {title}
              </h3>
              <p style={{
                fontSize: 14,
                color: 'var(--t3)',
                margin: 0,
                lineHeight: 1.6
              }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(9,205,131,0.05)',
        border: '1px solid rgba(9,205,131,0.15)',
        borderRadius: 'var(--r-xl)',
        padding: '80px 32px',
        margin: '0 auto 60px',
        maxWidth: '1400px',
        width: 'calc(100% - 48px)',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
          fontWeight: 800,
          color: 'var(--t1)',
          marginBottom: 16,
          letterSpacing: '-0.02em'
        }}>
          Ready to Transform Your Learning?
        </h2>
        <p style={{
          fontSize: 18,
          color: 'var(--t2)',
          maxWidth: '600px',
          margin: '0 auto 40px',
          lineHeight: 1.6
        }}>
          Join thousands of students who are learning smarter with AXINITE OS
        </p>
        <Link to="/signup" style={{
          padding: '18px 48px',
          borderRadius: 'var(--r-lg)',
          background: 'linear-gradient(135deg, var(--p), var(--p-lt))',
          color: '#000',
          textDecoration: 'none',
          fontWeight: 800,
          fontSize: 18,
          cursor: 'pointer',
          transition: 'all 200ms ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 16px 40px rgba(9,205,131,0.4)',
          border: 'none'
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 50px rgba(9,205,131,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 16px 40px rgba(9,205,131,0.4)';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>flash_on</span>
          Start Your Journey Today
        </Link>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        borderTop: '1px solid rgba(9,205,131,0.1)',
        padding: '40px 32px',
        textAlign: 'center',
        color: 'var(--t3)',
        fontSize: 13
      }}>
        <p style={{ margin: 0, marginBottom: 16 }}>
          © 2024 AXINITE OS. All rights reserved. Made with <span style={{ color: 'var(--p)' }}>❤️</span>
        </p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#" style={{ color: 'var(--t3)', textDecoration: 'none', transition: 'color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--p)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}>Privacy</a>
          <a href="#" style={{ color: 'var(--t3)', textDecoration: 'none', transition: 'color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--p)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}>Terms</a>
          <a href="#" style={{ color: 'var(--t3)', textDecoration: 'none', transition: 'color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--p)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}>Contact</a>
        </div>
      </footer>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(9, 205, 131, 0.3), 0 0 40px rgba(9, 205, 131, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(9, 205, 131, 0.5), 0 0 60px rgba(9, 205, 131, 0.2);
          }
        }
      `}</style>
    </div>
  );
}
