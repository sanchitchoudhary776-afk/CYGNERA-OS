import { useState, useEffect, createContext, useContext, useRef } from 'react';

const PremiumUIContext = createContext();

export function PremiumUIProvider({ children }) {
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, onCancel }
  const [confetti, setConfetti] = useState([]); // Array of particle objects

  const triggerConfetti = (x = window.innerWidth / 2, y = window.innerHeight / 2) => {
    const particles = Array.from({ length: 40 }).map((_, i) => ({
      id: Math.random() + i,
      x, y,
      tx: (Math.random() - 0.5) * 400,
      ty: (Math.random() - 0.5) * 400 - 100,
      tr: Math.random() * 720,
      color: ['#09cd83', '#60a5fa', '#a78bfa', '#e9cd6e', '#ff6b6b'][Math.floor(Math.random() * 5)],
    }));
    setConfetti(prev => [...prev, ...particles]);
    setTimeout(() => {
      setConfetti(prev => prev.filter(p => !particles.includes(p)));
    }, 800);
  };

  const askConfirm = (title, message) => {
    return new Promise(resolve => {
      setConfirm({ title, message, onConfirm: () => { setConfirm(null); resolve(true); }, onCancel: () => { setConfirm(null); resolve(false); } });
    });
  };

  return (
    <PremiumUIContext.Provider value={{ triggerConfetti, askConfirm }}>
      {children}
      {/* Confirm Modal Render */}
      {confirm && (
        <div onClick={confirm.onCancel} style={{ position:'fixed', inset:0, zIndex:2000, background:'var(--overlay)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'modalFadeIn 200ms ease both' }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:340, background:'var(--s2)', border:'1px solid var(--card-b-h)', borderRadius:'var(--r-xl)', padding:24, boxShadow:'var(--modal-sh)', animation:'scaleIn 300ms var(--bounce) both' }}>
            <h3 style={{ fontSize:18, fontWeight:800, color:'var(--t1)', marginBottom:8 }}>{confirm.title}</h3>
            <p style={{ fontSize:14, color:'var(--t3)', lineHeight:1.6, marginBottom:24 }}>{confirm.message}</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={confirm.onCancel} className="btn btn-surface" style={{ flex:1, padding:'12px' }}>Cancel</button>
              <button onClick={confirm.onConfirm} className="btn btn-primary" style={{ flex:1, padding:'12px', background:'var(--danger)', color:'white' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/* Confetti Render */}
      {confetti.map(p => (
        <div key={p.id} className="confetti" style={{ 
          left: p.x, top: p.y, 
          background: p.color,
          '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, '--tr': `${p.tr}deg`
        }} />
      ))}
    </PremiumUIContext.Provider>
  );
}

export const usePremium = () => useContext(PremiumUIContext);

export function Counter({ value, suffix='', prefix='', decimals=0 }) {
  const [display, setDisplay] = useState(parseFloat(value) || 0);
  const animRef = useRef(null);
  const prevValue = useRef(parseFloat(value) || 0);

  useEffect(() => {
    const end = parseFloat(value) || 0;
    if (end === prevValue.current) return;
    const start = prevValue.current;
    prevValue.current = end;
    
    if (animRef.current) cancelAnimationFrame(animRef.current);
    
    const duration = 600;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      setDisplay(current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [value]);

  return <span className="count-up">{prefix}{display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

export function Reveal({ children, delay=0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ 
      opacity: visible ? 1 : 0, 
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`
    }}>
      {children}
    </div>
  );
}
