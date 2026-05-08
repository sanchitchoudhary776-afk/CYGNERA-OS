import { useTheme } from '@context/ThemeContext';

export function ThemeToggle({ size = 40 }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const iconSize = Math.round(size * 0.48);

  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        border: `1.5px solid ${isLight ? 'rgba(5,150,105,0.2)' : 'rgba(9,205,131,0.15)'}`,
        background: isLight
          ? 'linear-gradient(145deg, rgba(5,150,105,0.08), rgba(5,150,105,0.02))'
          : 'linear-gradient(145deg, var(--s3), var(--s2))',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: isLight
          ? '0 2px 12px rgba(5,150,105,0.12), inset 0 1px 0 rgba(255,255,255,0.6)'
          : '0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1) rotate(12deg)';
        e.currentTarget.style.borderColor = isLight ? 'rgba(5,150,105,0.35)' : 'rgba(9,205,131,0.3)';
        e.currentTarget.style.boxShadow = isLight
          ? '0 4px 20px rgba(5,150,105,0.2), inset 0 1px 0 rgba(255,255,255,0.6)'
          : '0 4px 20px rgba(9,205,131,0.15), inset 0 1px 0 rgba(255,255,255,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        e.currentTarget.style.borderColor = isLight ? 'rgba(5,150,105,0.2)' : 'rgba(9,205,131,0.15)';
        e.currentTarget.style.boxShadow = isLight
          ? '0 2px 12px rgba(5,150,105,0.12), inset 0 1px 0 rgba(255,255,255,0.6)'
          : '0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.92) rotate(-6deg)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.1) rotate(12deg)';
      }}
    >
      {/* Sun Icon — shown in light mode */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          position: 'absolute',
          opacity: isLight ? 1 : 0,
          transform: isLight ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.4)',
          transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Sun body */}
        <circle cx="12" cy="12" r="4.5" fill="#059669" />
        {/* Sun rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 12 + Math.cos(rad) * 7;
          const y1 = 12 + Math.sin(rad) * 7;
          const x2 = 12 + Math.cos(rad) * 9.2;
          const y2 = 12 + Math.sin(rad) * 9.2;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#059669"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity={i % 2 === 0 ? 0.9 : 0.5}
            />
          );
        })}
        {/* Inner highlight */}
        <circle cx="10.8" cy="10.5" r="2" fill="rgba(255,255,255,0.3)" />
      </svg>

      {/* Moon Icon — shown in dark mode */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          position: 'absolute',
          opacity: isLight ? 0 : 1,
          transform: isLight ? 'rotate(-90deg) scale(0.4)' : 'rotate(0deg) scale(1)',
          transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Crescent moon */}
        <path
          d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79Z"
          fill="#09cd83"
          opacity="0.9"
        />
        {/* Highlight */}
        <path
          d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79Z"
          fill="url(#moonGrad)"
        />
        {/* Stars */}
        <circle cx="17" cy="6" r="0.8" fill="#09cd83" opacity="0.6" />
        <circle cx="20" cy="9" r="0.5" fill="#09cd83" opacity="0.4" />
        <circle cx="15" cy="4" r="0.5" fill="#09cd83" opacity="0.3" />
        <defs>
          <linearGradient id="moonGrad" x1="11" y1="3" x2="18" y2="16">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}

export default ThemeToggle;
