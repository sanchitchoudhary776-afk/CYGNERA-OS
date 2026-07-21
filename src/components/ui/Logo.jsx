export function Logo({ size = 48 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: 'var(--logo-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        boxShadow: `0 ${size * 0.12}px ${size * 0.35}px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.15)`,
        border: '1px solid var(--logo-border)',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
    >
      {/* Subtle Premium Glass Reflection Sweep */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '60%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)',
          transform: 'skewX(-25deg)',
          animation: 'logoSweep 6s infinite ease-in-out'
        }}
      />

      {/* Ultra-Premium Minimalist Geometric Monogram 'A' Emblem */}
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 100 100"
        fill="none"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <defs>
          <linearGradient id="axiniteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="45%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="axiniteFacetRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="axiniteFacetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Base Architectural Monogram Body */}
        <path
          d="M 50 14 C 52.5 14 75 62 78 70 C 81 77 73.5 83 67 79 L 50 68 L 33 79 C 26.5 83 19 77 22 70 C 25 62 47.5 14 50 14 Z"
          fill="url(#axiniteGrad)"
        />

        {/* Dark Left Depth Facet */}
        <path
          d="M 50 14 C 47.5 14 25 62 22 70 C 19 77 26.5 83 33 79 L 50 68 Z"
          fill="url(#axiniteFacetLeft)"
        />

        {/* Radiant Right Highlight Facet */}
        <path
          d="M 50 14 C 52.5 14 75 62 78 70 C 81 77 73.5 83 67 79 L 50 68 Z"
          fill="url(#axiniteFacetRight)"
        />

        {/* Precision Cut Inner Triangular Void */}
        <path
          d="M 50 34 L 62 58 L 38 58 Z"
          fill="var(--logo-inner-bg, #0b1310)"
        />

        {/* Minimalist Floating Crossbar Beam */}
        <path
          d="M 28 53 C 28 51.5 29.5 50 31.5 50 L 68.5 50 C 70.5 50 72 51.5 72 53 C 72 54.5 70.5 56 68.5 56 L 31.5 56 C 29.5 56 28 54.5 28 53 Z"
          fill="#34d399"
          filter="url(#softGlow)"
        />

        {/* Apex Precision Crystal Point */}
        <circle cx="50" cy="14" r="2" fill="#ffffff" opacity="0.9" />
      </svg>

      <style>{`
        @keyframes logoSweep {
          0% { left: -150%; }
          50% { left: 150%; }
          100% { left: 150%; }
        }
      `}</style>
    </div>
  );
}

export function LogoFull({ size = 48, className = '' }) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.35,
        userSelect: 'none'
      }}
    >
      <Logo size={size} />
      <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.25 }}>
        <span
          style={{
            fontSize: size * 0.52,
            fontWeight: 800,
            color: 'var(--logo-text, #f8fafc)',
            letterSpacing: '0.18em',
            lineHeight: 1,
            fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, system-ui, sans-serif",
            textTransform: 'uppercase',
            margin: 0
          }}
        >
          AXINITE
        </span>

        {/* Ultra-Clean Modern Luxury OS Tag */}
        <span
          style={{
            fontSize: Math.max(size * 0.22, 10),
            fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            lineHeight: 1,
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
            padding: '3px 7px',
            borderRadius: '5px',
            backdropFilter: 'blur(4px)'
          }}
        >
          OS
        </span>
      </div>
    </div>
  );
}

export function LogoCompact({ size = 32, className = '' }) {
  return (
    <div className={className}>
      <Logo size={size} />
    </div>
  );
}

export default Logo;
