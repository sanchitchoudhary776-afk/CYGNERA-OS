import { useState,useEffect,useRef } from 'react';
import { subjectColor,PRIORITY,MOODS } from '@utils';

export { ThemeToggle } from './ThemeToggle';

// ── Spinner ──────────────────────────────────
export function Spinner({ size=20, color='var(--p)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation:'spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
              strokeDasharray="40" strokeDashoffset="10" />
    </svg>
  );
}

// ── AI Thinking ──────────────────────────────
export function AIThinking({ text='Thinking...' }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(9,205,131,0.06)',border:'1px solid rgba(9,205,131,0.15)',borderRadius:12 }}>
      <div className="ai-dots"><span/><span/><span/></div>
      <span style={{ fontSize:13,color:'var(--t3)' }}>{text}</span>
    </div>
  );
}

// ── AI Bubble ────────────────────────────────
export function AIBubble({ content, loading }) {
  if (!content && !loading) return null;
  return (
    <div className="animate-fade-up" style={{ background:'rgba(9,205,131,0.06)',border:'1px solid rgba(9,205,131,0.18)',borderRadius:16,padding:'14px 16px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
        <span className="material-symbols-outlined icon-fill" style={{ fontSize:16,color:'var(--p)' }}>psychology</span>
        <span style={{ fontSize:11,fontWeight:700,color:'var(--p)',textTransform:'uppercase',letterSpacing:'0.08em' }}>Study Coach</span>
      </div>
      {loading
        ? <div className="ai-dots"><span/><span/><span/></div>
        : <p style={{ fontSize:13.5,color:'var(--t2)',lineHeight:1.65,margin:0 }}>{content}</p>
      }
    </div>
  );
}

// ── Badge ────────────────────────────────────
export function Badge({ children, color='var(--p)', style={} }) {
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:3,
      padding:'3px 9px',borderRadius:999,
      fontSize:10.5,fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',
      background:`${color}18`,color,border:`1px solid ${color}30`,
      ...style
    }}>
      {children}
    </span>
  );
}

export function SubjectBadge({ subject }) {
  const c = subjectColor(subject);
  return <Badge color={c}>{subject}</Badge>;
}

export function PriorityBadge({ priority }) {
  const p = PRIORITY[priority] || PRIORITY.medium;
  return <Badge color={p.color}>{p.label}</Badge>;
}

export function StatusBadge({ status }) {
  const cfg = {
    pending:   { color:'#e9cd6e', label:'Pending' },
    completed: { color:'var(--p)', label:'Done'    },
    active:    { color:'var(--p)', label:'Active'  },
    locked:    { color:'#859489', label:'Locked'  },
  };
  const c = cfg[status] || cfg.pending;
  return <Badge color={c.color}>{c.label}</Badge>;
}

// ── Progress Bar ─────────────────────────────
export function ProgressBar({ value=0, color='var(--p)', height=6, animated=true, showGlow=true }) {
  return (
    <div style={{ width:'100%',height,background:'rgba(9,205,131,0.07)',borderRadius:999,overflow:'hidden' }}>
      <div style={{
        height:'100%',width:`${Math.min(value,100)}%`,borderRadius:999,
        background:`linear-gradient(90deg,${color},${color}cc)`,
        boxShadow:showGlow?`0 0 10px ${color}40`:'none',
        transition:animated?'width 900ms cubic-bezier(0.25,0.46,0.45,0.94)':'none',
      }}/>
    </div>
  );
}

// ── Circular Progress ────────────────────────
export function CircularProgress({ value=0,size=80,stroke=7,color='var(--p)',children }) {
  const r=(size-stroke)/2, c=2*Math.PI*r;
  return (
    <div style={{ position:'relative',width:size,height:size,display:'inline-flex',alignItems:'center',justifyContent:'center' }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)',position:'absolute',inset:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(9,205,131,0.08)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c-(Math.min(value,100)/100)*c}
                style={{ transition:'stroke-dashoffset 900ms cubic-bezier(0.25,0.46,0.45,0.94)',filter:`drop-shadow(0 0 6px ${color}60)` }}/>
      </svg>
      {children && <div style={{ position:'absolute' }}>{children}</div>}
    </div>
  );
}

// ── Stat Card ────────────────────────────────
export function StatCard({ icon,label,value,sub,color='var(--p)',delay=0,onClick }) {
  return (
    <div className={`card animate-fade-up${onClick?' cursor-pointer':''}`}
         style={{ padding:'18px 20px',animationDelay:`${delay}s` }}
         onClick={onClick}>
      <div style={{ width:38,height:38,borderRadius:10,background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12 }}>
        <span className="material-symbols-outlined icon-fill" style={{ fontSize:20,color }}>{icon}</span>
      </div>
      <p style={{ fontSize:26,fontWeight:800,color,lineHeight:1,letterSpacing:'-0.02em' }}>{value}</p>
      <p style={{ fontSize:12.5,fontWeight:600,color:'var(--t2)',marginTop:4 }}>{label}</p>
      {sub&&<p style={{ fontSize:11,color:'var(--t3)',marginTop:2 }}>{sub}</p>}
    </div>
  );
}

// ── Modal ────────────────────────────────────
export function Modal({ open,onClose,title,icon,children,footer,maxWidth=520 }) {
  useEffect(()=>{
    if(open) document.body.style.overflow='hidden';
    else document.body.style.overflow='';
    return()=>{document.body.style.overflow=''};
  },[open]);
  if(!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth }} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            {icon&&<span className="material-symbols-outlined" style={{ fontSize:20,color:'var(--p)' }}>{icon}</span>}
            <h3 style={{ fontSize:15,fontWeight:700,color:'var(--text)' }}>{title}</h3>
          </div>
          <button className="btn btn-icon" onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>close</span>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer&&<div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Form Row ─────────────────────────────────
export function FormRow({ label, children, col=false }) {
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
      {label&&<label className="label" style={{ color:'var(--t3)' }}>{label}</label>}
      {col ? <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>{children}</div> : children}
    </div>
  );
}

// ── Input ────────────────────────────────────
export function Input({ label,type='text',value,onChange,placeholder,icon,required,style:{},disabled,...rest }) {
  return (
    <FormRow label={label}>
      <div style={{ position:'relative' }}>
        {icon&&<span className="material-symbols-outlined" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'var(--t4)',pointerEvents:'none' }}>{icon}</span>}
        <input className="input" type={type} value={value} onChange={onChange} placeholder={placeholder}
               required={required} disabled={disabled} style={{ paddingLeft:icon?40:14,...(disabled?{opacity:0.5,cursor:'not-allowed'}:{}) }} {...rest}/>
      </div>
    </FormRow>
  );
}

// ── Textarea ─────────────────────────────────
export function Textarea({ label,value,onChange,placeholder,rows=4 }) {
  return (
    <FormRow label={label}>
      <textarea className="input" rows={rows} value={value} onChange={onChange} placeholder={placeholder}
                style={{ resize:'vertical',lineHeight:1.65 }}/>
    </FormRow>
  );
}

// ── Select ───────────────────────────────────
export function Select({ label,value,onChange,options }) {
  return (
    <FormRow label={label}>
      <select className="input" value={value} onChange={onChange}>
        {options.map(o=>(
          <option key={o.value??o} value={o.value??o} style={{ background:'var(--s3)' }}>
            {o.label??o}
          </option>
        ))}
      </select>
    </FormRow>
  );
}

// ── Toggle ───────────────────────────────────
export function Toggle({ value,onChange }) {
  return (
    <button onClick={()=>onChange(!value)} style={{
      width:44,height:24,borderRadius:999,border:'none',cursor:'pointer',
      background:value?'var(--p)':'rgba(9,205,131,0.12)',
      transition:'all 220ms var(--ease-out)',
      boxShadow:value?'0 0 12px rgba(9,205,131,0.4)':'none',
      position:'relative',flexShrink:0,
    }}>
      <span style={{
        position:'absolute',top:2,width:20,height:20,borderRadius:'50%',
        background:value?'#002a1a':'var(--t4)',
        left:value?'calc(100% - 22px)':'2px',
        transition:'all 220ms var(--ease-out)',
        boxShadow:'0 2px 6px rgba(0,0,0,0.4)',
      }}/>
    </button>
  );
}

// ── Empty State ──────────────────────────────
export function Empty({ icon,title,desc,action,actionLabel }) {
  return (
    <div className="animate-fade-up" style={{ padding:'64px 32px',textAlign:'center' }}>
      <div style={{ width:72,height:72,borderRadius:20,background:'rgba(9,205,131,0.06)',border:'1px solid rgba(9,205,131,0.1)',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:20 }}>
        <span className="material-symbols-outlined" style={{ fontSize:36,color:'var(--t4)' }}>{icon}</span>
      </div>
      <h3 style={{ fontSize:16,fontWeight:700,color:'var(--t2)',marginBottom:8 }}>{title}</h3>
      {desc&&<p style={{ fontSize:13.5,color:'var(--t3)',lineHeight:1.65,marginBottom:24,maxWidth:320,margin:'0 auto 24px' }}>{desc}</p>}
      {action&&(
        <button className="btn btn-primary" onClick={action} style={{ margin:'0 auto' }}>
          <span className="material-symbols-outlined" style={{ fontSize:16 }}>add</span>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Page Header ──────────────────────────────
export function PageHeader({ title,subtitle,action,actionIcon='add',actionLabel,secondaryAction,secondaryLabel }) {
  return (
    <div className="animate-fade-up" style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:28,flexWrap:'wrap' }}>
      <div>
        <h1 style={{ fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',marginBottom:4 }}>{title}</h1>
        {subtitle&&<p style={{ fontSize:14,color:'var(--t3)' }}>{subtitle}</p>}
      </div>
      {(action||secondaryAction)&&(
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          {secondaryAction&&(
            <button className="btn btn-ghost" onClick={secondaryAction} style={{ padding:'9px 16px' }}>
              {secondaryLabel}
            </button>
          )}
          {action&&(
            <button className="btn btn-primary" onClick={action}>
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>{actionIcon}</span>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section Label ────────────────────────────
export function SectionLabel({ children, sub }) {
  return (
    <div style={{ marginBottom:12 }}>
      <p className="label">{children}</p>
      {sub&&<p style={{ fontSize:12,color:'var(--t4)',marginTop:2 }}>{sub}</p>}
    </div>
  );
}

// ── Countdown ────────────────────────────────
export function Countdown({ deadline, style={} }) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline)-new Date())/86400000);
  const ov = days < 0;
  const ur = !ov && days <= 2;
  const color = ov?'var(--danger)':ur?'var(--warn)':'var(--t3)';
  return (
    <span style={{ fontSize:12,fontWeight:700,color,background:ov?'rgba(255,107,107,0.1)':ur?'rgba(233,205,110,0.1)':'transparent',padding:'2px 8px',borderRadius:6,...style }}>
      {ov?'OVERDUE':days===0?'Today':days===1?'Tomorrow':`${days}d left`}
    </span>
  );
}

// ── Skeleton ─────────────────────────────────
export function Skeleton({ w='100%',h=16,r=8 }) {
  return <div className="skeleton" style={{ width:w,height:h,borderRadius:r }}/>;
}

// ── Mood Display ─────────────────────────────
export function MoodDisplay({ mood }) {
  const m = MOOD_CONFIG(mood);
  return <span style={{ fontSize:22 }} title={m.label}>{m.emoji}</span>;
}
const MOOD_CONFIG = (v) => MOODS.find(m=>m.v===v)||MOODS[2];
