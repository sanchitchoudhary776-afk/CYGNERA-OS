
export function Logo({ size = 48 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: 'linear-gradient(135deg, #0ee68a, #05a86e)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
      boxShadow: '0 6px 20px rgba(9,205,131,0.4), inset 0 2px 2px rgba(255,255,255,0.3)',
      overflow: 'hidden'
    }}>
      {/* Dynamic ambient sweep */}
      <div style={{
        position: 'absolute',
        inset: '-50%',
        background: 'conic-gradient(transparent, rgba(255,255,255,0.4), transparent)',
        animation: 'logoSpin 4s linear infinite',
      }} />
      <div style={{
        position: 'absolute',
        inset: 2,
        borderRadius: size * 0.25,
        background: 'linear-gradient(135deg, #09cd83, #05a86e)',
        zIndex: 0
      }} />

      {/* SVG Icon - Tech Crescent & Star */}
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 24 24"
        fill="none"
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.15))' }}
      >
        <defs>
          <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#004d40" />
            <stop offset="100%" stopColor="#001f12" />
          </linearGradient>
        </defs>

        {/* Outer Tech Arc (The 'C') */}
        <path d="M 18 4 A 10 10 0 1 0 18 20" fill="none" stroke="url(#moonGrad)" strokeWidth="3.5" strokeLinecap="round" />
        
        {/* Inner Arc (Neural Ring) */}
        <path d="M 16 8 A 6 6 0 1 0 16 16" fill="none" stroke="url(#starGrad)" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />

        {/* Central Core Star */}
        <path d="M 12 7 L 13.5 10.5 L 17 12 L 13.5 13.5 L 12 17 L 10.5 13.5 L 7 12 L 10.5 10.5 Z" fill="url(#moonGrad)" />
        
        {/* Data Nodes */}
        <circle cx="18" cy="4" r="2" fill="#ffffff" />
        <circle cx="18" cy="20" r="2" fill="#ffffff" />
        <circle cx="16" cy="8" r="1.5" fill="#001f12" />
        <circle cx="16" cy="16" r="1.5" fill="#001f12" />
      </svg>
      <style>{`
        @keyframes logoSpin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function LogoFull({ size = 48, className = '' }) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: size * 0.25 }}>
      <Logo size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{
          fontSize: size * 0.58,
          fontWeight: 900,
          color: 'var(--t1)',
          letterSpacing: '0.02em',
          lineHeight: 1,
          fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
          textShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          CYGNERA <span style={{ color: 'var(--p)' }}>OS</span>
        </p>
        <p style={{
          fontSize: size * 0.22,
          color: 'var(--t4)',
          fontWeight: 700,
          marginTop: Math.max(2, size * 0.08),
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          lineHeight: 1,
        }}>
          Elite Learning Workspace
        </p>
      </div>
    </div>
  );
}

export function LogoCompact({ size = 32, className = '' }) {
  return <div className={className}><Logo size={size} /></div>;
}

export default Logo;
