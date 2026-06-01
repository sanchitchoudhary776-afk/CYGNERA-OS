export function Logo({ size = 48 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: 'var(--logo-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
      boxShadow: `0 ${size * 0.15}px ${size * 0.4}px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)`,
      border: '1px solid var(--logo-border)',
      overflow: 'hidden'
    }}>
      {/* Premium Light Sweep Animation */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '50%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        transform: 'skewX(-25deg)',
        animation: 'logoSweep 4s infinite linear'
      }} />

      {/* The "A" Shield Emblem (ULTRA PREMIUM) */}
      <svg
        width={size * 0.88}
        height={size * 0.88}
        viewBox="0 0 100 100"
        fill="none"
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))' }}
      >
        <defs>
          <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--p-lt)" />
            <stop offset="45%" stopColor="var(--p)" />
            <stop offset="55%" stopColor="var(--p-dk)" />
            <stop offset="100%" stopColor="#042a1b" />
          </linearGradient>
          <filter id="innerGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Shield - Iridescent Depth */}
        <path d="M50 5 L92 30 L92 70 L50 95 L8 70 L8 30 Z" stroke="url(#metalGrad)" strokeWidth="6.5" fill="rgba(0,0,0,0.2)" />
        
        {/* 2. The Sharp 'A' Form - Triple-Layered Facets */}
        <path d="M50 12 L86 85 L69 85 L50 48 L31 85 L14 85 Z" fill="url(#metalGrad)" />
        
        {/* Light Facet */}
        <path d="M50 12 L69 85 L50 48 Z" fill="rgba(255,255,255,0.18)" />
        {/* Dark Facet */}
        <path d="M50 12 L50 48 L31 85 Z" fill="rgba(0,0,0,0.5)" />
        
        {/* 3. The "Neural Blade" (Crossbar) */}
        <path d="M33 58 L67 58 L62 67 L38 67 Z" fill="var(--logo-accent)" filter="url(#innerGlow)" />
        
        {/* 4. Precision Highlights */}
        <path d="M50 12 L86 85 L69 85 L50 48 L31 85 L14 85 Z" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
        
        {/* Top Tip Reflection */}
        <circle cx="50" cy="12" r="2.5" fill="white" fillOpacity="0.6" filter="blur(1px)" />
      </svg>
      
      <style>{`
        @keyframes logoSweep {
          0% { left: -150%; }
          100% { left: 150%; }
        }
        @keyframes textShine {
          0% { background-position: 100% 0%; }
          100% { background-position: -100% 0%; }
        }
      `}</style>
    </div>
  );
}

export function LogoFull({ size = 48, className = '' }) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: size * 0.45 }}>
      <Logo size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <p style={{
            fontSize: size * 0.65,
            fontWeight: 800,
            color: 'var(--logo-text)',
            letterSpacing: '0.25em',
            lineHeight: 1,
            fontFamily: "'Chakra Petch', sans-serif",
            textTransform: 'uppercase',
            margin: 0
          }}>
            AXINITE
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <div style={{ 
            height: 4, 
            flex: 1, 
            background: 'linear-gradient(90deg, transparent, var(--logo-bar))',
            borderRadius: 2
          }} />
          <p style={{
            fontSize: size * 0.32,
            color: 'var(--logo-os)',
            fontWeight: 700,
            fontFamily: "'Chakra Petch', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.6em',
            lineHeight: 1,
            opacity: 0.9
          }}>
            OS
          </p>
          <div style={{ 
            height: 4, 
            flex: 1, 
            background: 'linear-gradient(90deg, var(--logo-bar), transparent)',
            borderRadius: 2
          }} />
        </div>
      </div>
    </div>
  );
}

export function LogoCompact({ size = 32, className = '' }) {
  return <div className={className}><Logo size={size} /></div>;
}

export default Logo;
