import React, { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import { useApp }     from '@context/AppContext';
import { useNetwork } from '@context/NetworkContext';
import { enhanceNote, inlineComplete } from '@services/ai';
import { AI }         from '@services/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SUBJECT_COLORS, SUBJECTS, fmt, wordCount } from '@utils';
import toast from 'react-hot-toast';
import { usePremium, Counter } from '@components/ui/PremiumUI';
import { Portal } from '@components/ui';
import { useIsMobile } from '@utils/platform';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.bubble.css';

// Register all desired font sizes so Quill can apply/read them
const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = ['10px','11px','12px','13px','14px','15px','18px','20px','22px','24px','28px','32px','36px','42px','48px','60px','72px'];
Quill.register(SizeStyle, true);

// Register Align Style attributor to write inline styles instead of class names
const AlignStyle = Quill.import('attributors/style/align');
Quill.register(AlignStyle, true);

function extractVideoInfo(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^#&?]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (driveMatch) return { type: 'drive', id: driveMatch[1], embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  if (url.startsWith('blob:')) return { type: 'local', id: url };
  return { type: 'direct', id: url };
}

function getWordCount(html) {
  if (!html) return 0;
  const cleanText = html.replace(/<\/?[^>]+(>|$)/g, "");
  return cleanText.trim().split(/\s+/).filter(Boolean).length;
}

function getCleanPreview(html) {
  if (!html) return '';
  let clean = html.replace(/<\/?[^>]+(>|$)/g, " ");
  return clean.replace(/\s+/g, ' ').trim();
}

const ALL_SUBS = ['All', ...SUBJECTS.slice(0,7)];

const FONT_OPTIONS = [
  { name: 'Plus Jakarta', value: "'Plus Jakarta Sans', sans-serif" },
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'Playfair Display', value: "'Playfair Display', serif" },
  { name: 'Lora', value: "'Lora', serif" },
  { name: 'Fira Code', value: "'Fira Code', monospace" },
  { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { name: 'Patrick Hand', value: "'Patrick Hand', cursive" },
];

function QuickCapture({ onSave, onClose }) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Web Dev');
  const [tagsStr, setTagsStr] = useState('');

  const handleSave = () => {
    if (!content.trim() && !title.trim()) {
      toast.error('Note content or title is empty');
      return;
    }
    const tags = tagsStr.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    if (!tags.includes('quick')) tags.push('quick');
    onSave({
      title: title.trim() || 'Quick Note',
      content,
      subject,
      tags
    });
  };

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:110,background:'var(--overlay)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'modalFadeIn 200ms ease both' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:520,background:'var(--s1)',borderRadius:'var(--r-xl)',boxShadow:'0 32px 120px rgba(0,0,0,0.5), 0 0 0 1px var(--surface-b)',animation:'modalCenterIn 300ms var(--spring) both', overflow:'hidden', display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--surface-b)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'var(--t1)', display:'flex', alignItems:'center', gap:8 }}><span className="material-symbols-outlined" style={{color:'var(--p)', fontSize:20}}>bolt</span> Quick Capture Note</h3>
          <button onClick={onClose} className="icon-btn" style={{ background:'var(--s2)', border:'none', borderRadius:'50%', width:28, height:28 }}><span className="material-symbols-outlined" style={{ fontSize:15 }}>close</span></button>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
          <input
            className="input"
            value={title}
            onChange={e=>setTitle(e.target.value)}
            placeholder="Note Title (Optional)..."
            style={{ fontSize:14, fontWeight:700, padding:'10px 14px' }}
          />
          <div style={{ display:'flex', gap:10 }}>
            <select
              value={subject}
              onChange={e=>setSubject(e.target.value)}
              style={{ flex:1, background:'var(--s2)', border:'1px solid var(--surface-b)', color:'var(--t1)', borderRadius:10, padding:'8px 12px', fontSize:12, fontWeight:700, outline:'none' }}
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              className="input"
              value={tagsStr}
              onChange={e=>setTagsStr(e.target.value)}
              placeholder="Tags (e.g. #exam, #todo)..."
              style={{ flex:1.5, fontSize:12, padding:'8px 12px' }}
            />
          </div>
          <textarea
            autoFocus
            value={content}
            onChange={e=>setContent(e.target.value)}
            placeholder="Jot down a quick thought, concept, or reminder..."
            style={{ width:'100%', height:160, padding:'14px', background:'var(--s2)', borderRadius:12, border:'1px solid var(--surface-b)', color:'var(--t1)', fontSize:14, resize:'none', outline:'none', lineHeight:1.6, fontFamily:'var(--font-sans)' }}
          />
        </div>
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--surface-b)', background:'var(--s2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--t4)', fontWeight:600 }}>Tip: Press Alt + N anytime for Quick Note</span>
          <button onClick={handleSave} className="btn btn-primary" style={{ padding:'8px 24px', fontSize:12, fontWeight:800 }}>Save Note</button>
        </div>
      </div>
    </div>
  );
}

const NoteCard = memo(function NoteCard({ note, viewStyle = 'grid', onOpen, onDelete, onTogglePin, onDuplicate }) {
  const color = SUBJECT_COLORS[note.subject] || 'var(--p)';
  const { askConfirm } = usePremium();
  const readTime = Math.max(1, Math.ceil(getWordCount(note.content) / 200));

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (await askConfirm('Delete Note', `Permanently delete "${note.title || 'Untitled'}"?`)) {
      onDelete(note.id);
    }
  };

  const handlePin = (e) => {
    e.stopPropagation();
    onTogglePin(note);
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    onDuplicate(note);
  };

  if (viewStyle === 'list') {
    return (
      <div
        className="card card-hover content-auto gpu"
        onClick={() => onOpen(note)}
        style={{
          padding: '14px 18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: note.pinned ? `linear-gradient(90deg, color-mix(in srgb, ${color} 10%, var(--s2)), var(--s2))` : 'var(--s2)',
          borderLeft: `4px solid ${color}`,
          borderTop: '1px solid var(--surface-b)',
          borderRight: '1px solid var(--surface-b)',
          borderBottom: '1px solid var(--surface-b)',
          borderRadius: 12,
          transition: 'all 200ms ease'
        }}
      >
        {note.pinned && (
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--p)', flexShrink: 0, fontVariationSettings: "'FILL' 1" }} title="Pinned Note">push_pin</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h4 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--t1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {note.title || 'Untitled'}
            </h4>
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: `color-mix(in srgb, ${color} 14%, transparent)`, color, textTransform: 'uppercase', flexShrink: 0 }}>
              {note.subject}
            </span>
            {note.aiEnhanced && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: 'rgba(96,165,250,0.12)', color: '#3b82f6', border: '1px solid rgba(96,165,250,0.2)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 10 }}>auto_awesome</span> AI
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--t3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {getCleanPreview(note.content) || 'Empty note...'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>{getWordCount(note.content)} words</span>
          <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>{fmt.shortDate(note.updatedAt)}</span>

          <div className="card-actions" style={{ display: 'flex', gap: 4 }}>
            <button onClick={handlePin} className="icon-btn" style={{ width: 28, height: 28, background: 'var(--s3)', border: '1px solid var(--surface-b)', color: note.pinned ? 'var(--p)' : 'var(--t4)' }} title={note.pinned ? 'Unpin' : 'Pin'}>
              <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: note.pinned ? "'FILL' 1" : "'FILL' 0" }}>push_pin</span>
            </button>
            <button onClick={handleDuplicate} className="icon-btn" style={{ width: 28, height: 28, background: 'var(--s3)', border: '1px solid var(--surface-b)', color: 'var(--t4)' }} title="Duplicate">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>content_copy</span>
            </button>
            <button onClick={handleDelete} className="icon-btn" style={{ width: 28, height: 28, background: 'var(--s3)', border: '1px solid var(--surface-b)', color: 'var(--t4)' }} title="Delete">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-hover tilt-card content-auto gpu" onClick={() => onOpen(note)}
      style={{
        padding:0, cursor:'pointer', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative',
        background: `linear-gradient(145deg, var(--s2) 0%, color-mix(in srgb, ${color} 5%, var(--s2)) 100%)`,
        borderTop: `3px solid ${color}`,
        boxShadow: note.pinned ? `0 0 20px color-mix(in srgb, ${color} 15%, transparent)` : 'none'
      }}>
      <div style={{ padding:'20px', flex:1 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:0 }}>
            {note.pinned && <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--p)', flexShrink:0, fontVariationSettings:"'FILL' 1" }} title="Pinned Note">push_pin</span>}
            <h4 style={{ fontSize:15, fontWeight:800, color:'var(--t1)', lineHeight:1.3, wordBreak:'break-word', margin:0 }}>{note.title||'Untitled'}</h4>
          </div>
          <div style={{ display:'flex', gap:4, opacity:0, transition:'all 200ms ease' }} className="card-hover-actions">
            <button onClick={handlePin} className="icon-btn" style={{ width:26, height:26, background:'var(--s3)', border:'1px solid var(--surface-b)', color: note.pinned?'var(--p)':'var(--t4)' }} title={note.pinned?'Unpin':'Pin'}>
              <span className="material-symbols-outlined" style={{ fontSize:14, fontVariationSettings: note.pinned?"'FILL' 1":"'FILL' 0" }}>push_pin</span>
            </button>
            <button onClick={handleDuplicate} className="icon-btn" style={{ width:26, height:26, background:'var(--s3)', border:'1px solid var(--surface-b)', color:'var(--t4)' }} title="Duplicate">
              <span className="material-symbols-outlined" style={{ fontSize:14 }}>content_copy</span>
            </button>
            <button onClick={handleDelete} className="icon-btn" style={{ width:26, height:26, background:'var(--s3)', border:'1px solid var(--surface-b)', color:'var(--t4)' }} title="Delete">
              <span className="material-symbols-outlined" style={{ fontSize:14 }}>delete</span>
            </button>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, background:`color-mix(in srgb, ${color} 12%, transparent)`, color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{note.subject}</span>
          {note.aiEnhanced && <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, background:'rgba(96,165,250,0.12)', color:'#3b82f6', border:'1px solid rgba(96,165,250,0.2)', textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{fontSize:12}}>auto_awesome</span> AI</span>}
        </div>
        <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', margin:0 }}>{getCleanPreview(note.content) || 'Empty note...'}</p>
        {note.tags?.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:14 }}>
            {note.tags.slice(0,3).map(t=><span key={t} style={{ fontSize:10.5, fontWeight:600, color:'var(--t4)' }}>#{t}</span>)}
          </div>
        )}
      </div>
      <div style={{ padding:'12px 20px', borderTop:'1px solid var(--surface-b)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--s1)' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--t4)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{fontSize:14}}>subject</span>{getWordCount(note.content)}</span>
          <span style={{ fontSize:11, color:'var(--t4)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{fontSize:14}}>schedule</span>{readTime}m read</span>
        </div>
        <span style={{ fontSize:11, color:'var(--t4)', fontWeight:600 }}>{fmt.shortDate(note.updatedAt)}</span>
      </div>
      <style>{`
        .card-hover:hover .card-hover-actions { opacity: 1 !important; }
        .card-hover .icon-btn:hover { background: var(--s4) !important; color: var(--t1) !important; }
      `}</style>
    </div>
  );
});

const sanitizeHtml = (html) => {
  if (!html) return '';
  let clean = html.replace(/<(script|iframe|object|embed|form|link|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/<(script|iframe|object|embed|form|link|style)[^>]*\/?>/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*(['"])(.*?)\1/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*([^\s>]+)/gi, '');
  clean = clean.replace(/href\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, 'src=""');
  return clean;
};

const convertMarkdownToHtml = (md) => {
  if (!md) return '';
  let html = md;
  if (!md.trim().startsWith('<') && !md.includes('</p>') && !md.includes('<br')) {
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^\s*-\s*\[\s*\]\s*(.*$)/gim, '<li><input type="checkbox"/> $1</li>');
    html = html.replace(/^\s*-\s*(.*$)/gim, '<li>$1</li>');
    html = html.replace(/\n/g, '<br/>');
  }
  return sanitizeHtml(html);
};

// ─── Predefined Document Templates ───────────────────────────────────────────
const NOTES_TEMPLATES = [
  { name: 'Cornell Study Notes', icon: 'school', desc: 'Dual-column layout for cue questions, notes, and an executive summary.',
    content: `<h2><strong>Cornell Notes Format</strong></h2><hr><table style="width:100%;border-collapse:collapse;margin-top:15px;"><tbody><tr><td style="width:30%;border:1px solid var(--surface-b);padding:12px;vertical-align:top;background:rgba(0,0,0,0.03);"><h3><strong>Cues &amp; Questions</strong></h3><p style="color:var(--t4);font-size:13px;">Keywords &amp; study prompts.</p><ul><li>Question 1?</li><li>Key term 2?</li></ul></td><td style="width:70%;border:1px solid var(--surface-b);padding:12px;vertical-align:top;"><h3><strong>Class Notes</strong></h3><p>Record actual notes and details here.</p><ul><li>Main lecture point</li><li>Supporting details</li></ul></td></tr></tbody></table><div style="margin-top:20px;padding:15px;border:1px solid var(--surface-b);background:rgba(0,0,0,0.01);border-radius:8px;"><h3><strong>Summary</strong></h3><p>Brief 3-sentence summary of the learning block.</p></div>` },
  { name: 'Daily Reflection Log', icon: 'today', desc: 'Log priorities, gratitude prompts, challenges, and mood tracks.',
    content: `<h2><strong>Daily Log &amp; Reflection</strong></h2><p>Date: <em>${new Date().toLocaleDateString()}</em> | Mood: [ 🧠 / 🧘 / ⚡ / 😴 ]</p><hr><h3><strong>Today's Focus Priorities</strong></h3><ul><li>[ ] Priority 1</li><li>[ ] Priority 2</li></ul><br><h3><strong>Gratitude Reflections</strong></h3><ol><li>I am grateful for...</li><li>I am happy about...</li></ol><br><h3><strong>Daily Realizations</strong></h3><blockquote>Capture today's biggest breakthrough or challenge solved.</blockquote>` },
  { name: 'Project Brainstorm Brief', icon: 'rocket_launch', desc: 'Structure goals, features checklist, timeline, and open items.',
    content: `<h2><strong>Project Planning Brief</strong></h2><hr><h3><strong>1. Overview &amp; Objective</strong></h3><p>Describe the project goals and why it matters.</p><br><h3><strong>2. Scope &amp; Target Features</strong></h3><ul><li>[ ] Core Feature 1</li><li>[ ] Core Feature 2</li></ul><br><h3><strong>3. Target Timeline &amp; Deadlines</strong></h3><ul><li><strong>Milestone A:</strong> Date / Details</li></ul><br><h3><strong>4. Open Design Questions</strong></h3><blockquote>List any uncertainties that need solving before execution.</blockquote>` },
  { name: 'Academic Essay Outline', icon: 'article', desc: 'Hook introduction, supporting body arguments, and conclusion references.',
    content: `<h2><strong>Academic Essay Outline</strong></h2><hr><h3><strong>I. Introduction</strong></h3><ul><li><strong>Hook:</strong> Engaging opening statement.</li><li><strong>Context:</strong> Background info.</li><li><strong>Thesis Statement:</strong> Main argument.</li></ul><br><h3><strong>II. Body Paragraphs</strong></h3><ul><li><strong>Topic Sentence 1:</strong> First argument.<ul><li>Evidence (Source quote/data)</li><li>Explanation / Analysis</li></ul></li></ul><br><h3><strong>III. Conclusion</strong></h3><ul><li>Restatement of Thesis</li><li>Summary of Main Points</li></ul>` }
];

// ─── Web Audio Sound Synthesis Engine ────────────────────────────────────────
const SoundSynth = {
  audioCtx: null, ambientSource: null, ambientGainNode: null,
  init() {
    if (!this.audioCtx) { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  },
  startAmbient(type, volume = 0.15) {
    try {
      this.init(); this.stopAmbient();
      const ctx = this.audioCtx, bufSz = 2 * ctx.sampleRate;
      const buf = ctx.createBuffer(1, bufSz, ctx.sampleRate), out = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufSz; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'white') out[i] = w;
        else if (type === 'pink') { out[i] = last * 0.95 + w * 0.05; last = out[i]; }
        else if (type === 'brown') { out[i] = last * 0.99 + w * 0.01; last = out[i]; }
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
      filt.frequency.value = type === 'brown' ? 250 : type === 'pink' ? 600 : 1500;
      const gain = ctx.createGain(); gain.gain.value = volume;
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination); src.start();
      this.ambientSource = src; this.ambientGainNode = gain;
    } catch (e) { console.warn('[SoundSynth] ambient error:', e); }
  },
  setAmbientVolume(v) { if (this.ambientGainNode) this.ambientGainNode.gain.setValueAtTime(v, this.audioCtx?.currentTime || 0); },
  stopAmbient() { if (this.ambientSource) { try { this.ambientSource.stop(); } catch(e){} this.ambientSource = null; } },
  playClick(type) {
    try {
      this.init(); const ctx = this.audioCtx; if (!ctx) return;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      if (type === 'mechanical') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(750 + Math.random()*350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
        const bs = 0.005 * ctx.sampleRate, cb = ctx.createBuffer(1, bs, ctx.sampleRate), cd = cb.getChannelData(0);
        for (let i = 0; i < bs; i++) cd[i] = (Math.random()*2-1)*0.12;
        const nn = ctx.createBufferSource(); nn.buffer = cb;
        const ng = ctx.createGain(); ng.gain.setValueAtTime(0.06, ctx.currentTime); ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.008);
        nn.connect(ng); ng.connect(ctx.destination); nn.start();
      } else if (type === 'bubble') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800 + Math.random()*150, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.07, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      } else if (type === 'beep') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(900, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      }
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.08);
    } catch (e) { console.warn('[SoundSynth] click error:', e); }
  }
};

const COLOR_PALETTE = [
  { name: 'Default', value: 'var(--t1)' }, { name: 'Emerald', value: '#10b981' },
  { name: 'Amethyst', value: '#a78bfa' }, { name: 'Rose', value: '#fb7185' },
  { name: 'Amber', value: '#fbbf24' }, { name: 'Sky Blue', value: '#38bdf8' },
  { name: 'Coral', value: '#ff6b6b' }, { name: 'Dark Mode Text', value: '#e8e6e3' },
  { name: 'Light Mode Text', value: '#1a1a1a' }
];

const HIGHLIGHT_PALETTE = [
  { name: 'None', value: 'transparent' },
  { name: 'Emerald Hint', value: 'rgba(16,185,129,0.2)' },
  { name: 'Amethyst Hint', value: 'rgba(167,139,250,0.2)' },
  { name: 'Rose Hint', value: 'rgba(251,113,133,0.2)' },
  { name: 'Amber Hint', value: 'rgba(251,191,36,0.2)' },
  { name: 'Sky Blue Hint', value: 'rgba(56,189,248,0.2)' }
];

// ─── NoteEditor — The full immersive document workspace ──────────────────────
function NoteEditor({ note, onSave, onClose }) {
  const { videos, tasks, A } = useApp();
  const { isOnline } = useNetwork();

  const [writingTheme, setWritingTheme] = useState(note?.writingTheme || 'classic');
  const [ambientSound, setAmbientSound] = useState('none');
  const [ambientVolume, setAmbientVolume] = useState(0.12);
  const [typingSound, setTypingSound] = useState('none');
  const [isZenFocus, setIsZenFocus] = useState(note?.isZenFocus || false);
  const [fontSize, setFontSizeState] = useState(note?.fontSize || '16');

  const [form, setForm] = useState({
    title: note?.title || '',
    content: convertMarkdownToHtml(note?.content || ''),
    subject: note?.subject || 'Web Dev',
    tags: note?.tags?.join(', ') || ''
  });
  const [font, setFont] = useState(note?.font || FONT_OPTIONS[0].value);
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false, strike: false,
    blockquote: false, 'code-block': false, align: '', color: '#ffffff', background: 'transparent'
  });
  const [ai, setAi] = useState(note?.aiEnhanced ? { flashcards:note.flashcards, summary:note.summary, concepts:note.concepts } : null);
  const [aiLoad, setAiLoad] = useState(false);
  const [viewMode, setViewMode] = useState('write');
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('workflow');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const [slashMenu, setSlashMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [activePopover, setActivePopover] = useState(null);
  const [typingStats, setTypingStats] = useState({ wpm: 0, charCount: 0, focusScore: 100 });
  const typingStartTime = useRef(null);
  const initialWordCount = useRef(0);
  const lastActiveTime = useRef(Date.now());
  const pauseTimerRef = useRef(null);
  const quillRef = useRef(null);
  const theme = 'dark';

  const subjectTasks = useMemo(() => (tasks||[]).filter(t => t.status === 'pending' && t.subject === form.subject), [tasks, form.subject]);
  const subjectVideos = useMemo(() => (videos||[]).filter(v => v.subject === form.subject), [videos, form.subject]);

  // Track Quill selection changes to update active format states
  useEffect(() => {
    const quill = quillRef.current?.getEditor(); if (!quill) return;
    const handler = () => {
      const range = quill.getSelection();
      if (range) {
        const f = quill.getFormat(range);
        setActiveFormats({ bold:!!f.bold, italic:!!f.italic, underline:!!f.underline, strike:!!f.strike,
          blockquote:!!f.blockquote, 'code-block':!!f['code-block'], align:f.align||'', color:f.color||'#ffffff', background:f.background||'transparent' });
        setFontSizeState(f.size ? f.size.replace('px','') : '16');
      }
    };
    quill.on('selection-change', handler);
    return () => quill.off('selection-change', handler);
  }, [viewMode]);

  // Debounced Auto-Save
  useEffect(() => {
    if (!form.title && !form.content) return;
    setSaveStatus('Saving...');
    const t = setTimeout(() => { save(true); setSaveStatus('Saved'); }, 1500);
    return () => clearTimeout(t);
  }, [form.title, form.content, form.subject, form.tags, ai, font, writingTheme, isZenFocus, fontSize]);

  useEffect(() => { initialWordCount.current = getWordCount(form.content); lastActiveTime.current = Date.now(); }, [note?.id]);

  useEffect(() => {
    if (ambientSound !== 'none') SoundSynth.startAmbient(ambientSound, ambientVolume);
    else SoundSynth.stopAmbient();
    return () => SoundSynth.stopAmbient();
  }, [ambientSound]);

  useEffect(() => { SoundSynth.setAmbientVolume(ambientVolume); }, [ambientVolume]);

  const handleKeyPress = () => {
    if (!typingStartTime.current) typingStartTime.current = Date.now();
    lastActiveTime.current = Date.now();
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setTypingStats(p => ({ ...p, focusScore: Math.max(30, p.focusScore - 5) }));
    }, 10000);
  };

  const handleEditorKeyDown = () => {
    handleKeyPress();
    if (typingSound !== 'none') SoundSynth.playClick(typingSound);
  };

  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const handleContentChange = (value) => {
    setForm(p => ({ ...p, content: value }));
    const quill = quillRef.current?.getEditor();
    if (quill) { const t = quill.getText(); setSlashMenu(t.trim().endsWith('/')); }
  };

  const outline = useMemo(() => {
    if (!form.content) return [];
    const doc = new DOMParser().parseFromString(form.content, 'text/html');
    return Array.from(doc.querySelectorAll('h1,h2,h3')).map((h,i) => ({ id:`heading-${i}`, text:h.textContent||'', tag:h.tagName.toLowerCase() }));
  }, [form.content]);

  const scrollToHeading = (text) => {
    const el = document.querySelector('.ql-editor'); if (!el) return;
    const found = Array.from(el.querySelectorAll('h1,h2,h3')).find(h => h.textContent === text);
    if (found) found.scrollIntoView({ behavior:'smooth', block:'center' });
  };

  useEffect(() => {
    if (!form.content) return;
    const cw = getWordCount(form.content), chars = form.content.replace(/<\/?[^>]+(>|$)/g,"").length;
    let wpm = 0;
    if (typingStartTime.current) {
      const m = (Date.now()-typingStartTime.current)/60000;
      if (m > 0.05) wpm = Math.round(Math.max(0, cw - initialWordCount.current) / m);
    }
    let fb = isZenFocus ? 20 : 0; if (wpm > 20 && wpm < 130) fb += 10;
    setTypingStats(p => ({ wpm:wpm||p.wpm, charCount:chars, focusScore:Math.min(100,Math.max(10,p.focusScore+fb-(isZenFocus?0:4))) }));
  }, [form.content, isZenFocus]);

  useEffect(() => {
    const h = e => { if (e.key==='Escape') { setSlashMenu(false); setActivePopover(null); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const executeSlash = async (cmd) => {
    setSlashMenu(false);
    const quill = quillRef.current?.getEditor(); if (!quill) return;
    const range = quill.getSelection(true); if (!range) return;
    quill.deleteText(range.index-1, 1); const idx = range.index-1;
    if (cmd.action) { quill.insertText(idx, cmd.action); quill.setSelection(idx+cmd.action.length); return; }
    if (cmd.id && AI.enabled()) {
      if (!isOnline) { toast.error('Connect to the internet to run AI commands 📡'); return; }
      setSaveStatus('Writing...'); const r = await inlineComplete(cmd.prompt, quill.getText());
      if (r) { quill.insertText(idx, ' '+r); quill.setSelection(idx+1+r.length); }
      setSaveStatus('Saved');
    }
  };

  const runAI = async () => {
    if (!isOnline) { toast.error('Connect to the internet to run AI Note Enhancement 📡'); return; }
    const raw = quillRef.current?.getEditor()?.getText() || '';
    if (raw.length < 50) { toast.error('Write 50+ chars first'); return; }
    if (!AI.enabled()) { toast('Add API key for AI ✦', {icon:'🔑'}); return; }
    setAiLoad(true); const r = await enhanceNote(raw); setAiLoad(false);
    if (r) { setAi(r); toast.success('Note enhanced ✦'); } else toast.error('AI failed — try again');
  };

  const save = (isAuto = false) => {
    if (!form.title.trim() && !form.content.trim()) return;
    onSave({ ...note, ...form, font, writingTheme, isZenFocus, fontSize,
      tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean),
      aiEnhanced:!!ai, flashcards:ai?.flashcards, summary:ai?.summary, concepts:ai?.concepts }, isAuto);
  };

  const applyFormat = (formatType, value) => {
    if (viewMode !== 'write') setViewMode('write');
    const quill = quillRef.current?.getEditor(); if (!quill) return;
    quill.focus(); const range = quill.getSelection();
    if (value !== undefined) { quill.format(formatType, value); }
    else {
      const fmt = range ? quill.getFormat(range) : quill.getFormat();
      const nv = !fmt[formatType]; quill.format(formatType, nv);
      setActiveFormats(p => ({ ...p, [formatType]: nv }));
    }
    setActivePopover(null);
  };

  const applyFontSize = (size) => {
    setFontSizeState(size); if (viewMode !== 'write') setViewMode('write');
    const quill = quillRef.current?.getEditor(); if (!quill) return;
    quill.focus(); if (quill.getSelection()) quill.format('size', size === '16' ? false : size + 'px');
  };

  const injectTemplate = (content) => {
    const quill = quillRef.current?.getEditor(); if (!quill) return;
    quill.focus(); const r = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(r ? r.index : 0, content);
    toast.success('Template loaded!'); setActivePopover(null);
  };

  const exportDoc = (format) => {
    const title = form.title || 'Untitled'; setActivePopover(null);
    if (format === 'pdf') { window.print(); return; }
    let out, mime, ext;
    if (format === 'md') {
      out = form.content.replace(/<h1>(.*?)<\/h1>/gi,'# $1\n').replace(/<h2>(.*?)<\/h2>/gi,'## $1\n').replace(/<h3>(.*?)<\/h3>/gi,'### $1\n')
        .replace(/<p>(.*?)<\/p>/gi,'$1\n').replace(/<li>(.*?)<\/li>/gi,'- $1\n').replace(/<strong>(.*?)<\/strong>/gi,'**$1**')
        .replace(/<em>(.*?)<\/em>/gi,'*$1*').replace(/<br\s*\/?>/gi,'\n').replace(/<\/?[^>]+(>|$)/g,'');
      mime='text/markdown'; ext='md';
    } else if (format === 'html') {
      out = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:sans-serif;line-height:1.6;max-width:800px;margin:40px auto;padding:20px;color:#333}h1,h2,h3{color:#111}blockquote{border-left:4px solid #7c3aed;padding-left:15px;margin:20px 0;color:#666;font-style:italic}pre{background:#f4f4f4;padding:15px;border-radius:5px;overflow-x:auto}code{font-family:monospace;background:#eee;padding:2px 4px;border-radius:3px}</style></head><body><h1>${title}</h1>${form.content}</body></html>`;
      mime='text/html'; ext='html';
    } else {
      out = form.content.replace(/<\/?[^>]+(>|$)/g,'\n').replace(/\n+/g,'\n');
      mime='text/plain'; ext='txt';
    }
    const blob = new Blob([out], { type:`${mime};charset=utf-8;` }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.setAttribute('download', `${title}.${ext}`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const togglePopover = (n) => setActivePopover(p => p===n ? null : n);
  const subColor = SUBJECT_COLORS[form.subject] || 'var(--p)';

  const slashCommands = [
    { id:'continue', icon:'edit_document', label:'AI Continue Writing', prompt:'Continue writing the next paragraph naturally.' },
    { id:'fix', icon:'spellcheck', label:'Fix Grammar & Polish', prompt:'Fix all grammar mistakes and improve the flow of the text.' },
    { id:'summarize', icon:'format_align_left', label:'Summarize', prompt:'Write a brief 3-sentence summary of everything written so far.' },
    { id:'h2', icon:'title', label:'Heading 2', action:'\n## ' },
    { id:'todo', icon:'check_box', label:'To-Do List', action:'\n- [ ] ' },
  ];

  // ─── Toolbar button helper ──────────────────────────────────────────────────
  const TBtn = ({icon, title, active, onClick, style:s}) => (
    <button onClick={onClick} title={title} style={{ width:32,height:32,borderRadius:6,border:'none',background:active?'var(--p)':'transparent',color:active?'#000':'var(--t2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center', ...s }}>
      <span className="material-symbols-outlined" style={{ fontSize:18 }}>{icon}</span>
    </button>
  );

  return (
    <Portal>
      <div onClick={onClose} className={`portal-editor-print-area ${isZenFocus?'zen-focus-active':''}`}
        style={{ position:'fixed',inset:0,zIndex:9999,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',animation:'modalFadeIn 200ms ease both' }}>
        <div onClick={e=>e.stopPropagation()} style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)',overflow:'hidden',position:'relative' }}>

        {/* Writing Themes & Print CSS */}
        <style>{`
          .editor-theme-classic { background:#fdfdfb !important; color:#2c2925 !important; }
          .editor-theme-classic-dark { background:#181a1b !important; color:#e8e6e3 !important; }
          .editor-theme-classic .ql-editor,.editor-theme-classic-dark .ql-editor { font-family:'Lora','Georgia',serif !important; }
          .editor-theme-classic .ql-editor { color:#2c2925 !important; }
          .editor-theme-classic-dark .ql-editor { color:#e8e6e3 !important; }
          .editor-theme-zen { background:linear-gradient(135deg,#eef5f0 0%,#dfede2 100%) !important; color:#233027 !important; }
          .editor-theme-zen-dark { background:linear-gradient(135deg,#101612 0%,#17211a 100%) !important; color:#cfded3 !important; }
          .editor-theme-zen .ql-editor { font-family:'Plus Jakarta Sans',sans-serif !important; color:#233027 !important; }
          .editor-theme-zen-dark .ql-editor { font-family:'Plus Jakarta Sans',sans-serif !important; color:#cfded3 !important; }
          .editor-theme-cyberpunk { background:#07070a !important; color:#00ffcc !important; position:relative; }
          .editor-theme-cyberpunk::before { content:""; position:absolute; inset:0; pointer-events:none; z-index:99; opacity:0.15;
            background:linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,0.25) 50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06));
            background-size:100% 4px,6px 100%; }
          .editor-theme-cyberpunk .ql-editor { font-family:'JetBrains Mono','Fira Code',monospace !important; color:#00ffcc !important; text-shadow:0 0 6px rgba(0,255,204,0.4) !important; }
          .editor-theme-cyberpunk input { color:#00ffcc !important; }
          .editor-theme-terminal { background:#050505 !important; color:#33ff33 !important; border:1px solid #33ff331e !important; }
          .editor-theme-terminal .ql-editor { font-family:'Fira Code','Courier New',monospace !important; color:#33ff33 !important; text-shadow:0 0 4px rgba(51,255,51,0.3) !important; }
          .editor-theme-terminal input { color:#33ff33 !important; }
          .zen-focus-active .editor-hide-on-focus { opacity:0 !important; pointer-events:none !important; transform:translateY(-10px); }
          .zen-focus-active .editor-hide-sidebar { width:0 !important; opacity:0 !important; pointer-events:none !important; border-left:none !important; }
          .popover-menu { position:absolute; background:var(--s1); border:1px solid var(--surface-b); border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.3); padding:12px; z-index:1000; animation:modalCenterIn 200ms ease; }
          @media print {
            body * { visibility:hidden; }
            .portal-editor-print-area,.portal-editor-print-area * { visibility:visible; }
            .portal-editor-print-area { position:absolute; left:0; top:0; width:100%; background:white !important; color:black !important; }
            .editor-sidebar,.editor-middle-toolbar,.icon-btn,button,select,.editor-hide-on-focus,.editor-floating-toolbar { display:none !important; }
            .ql-editor { font-size:14pt !important; line-height:1.6 !important; color:black !important; }
          }
        `}</style>

        {/* ─── Top Header Bar ─── */}
        <div className="editor-hide-on-focus" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:68,borderBottom:'1px solid var(--surface-b)',background:'var(--s1)',flexShrink:0,zIndex:10,transition:'all 300ms ease' }}>
          <div style={{ display:'flex',gap:12,alignItems:'center',flexShrink:0 }}>
            <button onClick={onClose} className="icon-btn" style={{ background:'var(--s2)',border:'1px solid var(--surface-b)',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center' }}><span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--t2)' }}>arrow_back</span></button>
            <div style={{ width:1,height:20,background:'var(--surface-b)' }}/>
            <select value={form.subject} onChange={set('subject')} style={{ background:`color-mix(in srgb, ${subColor} 12%, transparent)`,color:subColor,border:`1px solid color-mix(in srgb, ${subColor} 25%, transparent)`,padding:'0 14px',height:32,borderRadius:999,fontSize:12,fontWeight:700,outline:'none',cursor:'pointer' }}>
              {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display:'flex',gap:10,alignItems:'center',flexShrink:0 }}>
            {/* Templates */}
            <div style={{ position:'relative' }}>
              <button onClick={()=>togglePopover('templates')} className="btn btn-surface" style={{ height:40,display:'flex',alignItems:'center',gap:6,padding:'0 14px',fontSize:12.5,fontWeight:800 }}>
                <span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--p)' }}>article</span>Templates
              </button>
              {activePopover==='templates' && (
                <div className="popover-menu" style={{ top:'120%',right:0,width:280 }}>
                  <p style={{ fontSize:10.5,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Study Templates</p>
                  <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                    {NOTES_TEMPLATES.map(t=>(
                      <button key={t.name} onClick={()=>injectTemplate(t.content)} className="card-hover" style={{ display:'flex',flexDirection:'column',width:'100%',padding:'8px 10px',border:'none',borderRadius:8,background:'transparent',color:'var(--t1)',textAlign:'left',cursor:'pointer' }}>
                        <span style={{ fontSize:12.5,fontWeight:800,display:'flex',alignItems:'center',gap:4 }}><span className="material-symbols-outlined" style={{ fontSize:16,color:'var(--p)' }}>{t.icon}</span>{t.name}</span>
                        <span style={{ fontSize:10.5,color:'var(--t4)',marginTop:2 }}>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Edit/Read toggle */}
            <div style={{ display:'flex',background:'var(--s2)',borderRadius:12,padding:4,border:'1px solid var(--surface-b)',height:40 }}>
              <button onClick={()=>setViewMode('write')} style={{ padding:'0 16px',borderRadius:8,border:'none',background:viewMode==='write'?'var(--s3)':'transparent',color:viewMode==='write'?'var(--t1)':'var(--t4)',fontWeight:800,fontSize:12,cursor:'pointer',transition:'all 200ms' }}>Edit</button>
              <button onClick={()=>setViewMode('read')} style={{ padding:'0 16px',borderRadius:8,border:'none',background:viewMode==='read'?'var(--s3)':'transparent',color:viewMode==='read'?'var(--t1)':'var(--t4)',fontWeight:800,fontSize:12,cursor:'pointer',transition:'all 200ms' }}>Read</button>
            </div>
            <div style={{ width:1,height:24,background:'var(--surface-b)',margin:'0 2px' }}/>
            {/* Copy Clipboard */}
            <button onClick={() => {
              const plainText = (form.title ? form.title + '\n\n' : '') + getCleanPreview(form.content);
              navigator.clipboard.writeText(plainText);
              toast.success('Copied text to clipboard! 📋');
            }} className="icon-btn" style={{ background:'var(--s2)',border:'1px solid var(--surface-b)',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center' }} title="Copy to Clipboard">
              <span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--t2)' }}>content_copy</span>
            </button>
            {/* Export */}
            <div style={{ position:'relative' }}>
              <button onClick={()=>togglePopover('export')} className="icon-btn" style={{ background:'var(--s2)',border:'1px solid var(--surface-b)',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center' }} title="Export"><span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--t2)' }}>ios_share</span></button>
              {activePopover==='export' && (
                <div className="popover-menu" style={{ top:'120%',right:0,width:180 }}>
                  <p style={{ fontSize:10.5,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Export Document</p>
                  {[['pdf','picture_as_pdf','#ef4444','Print / Save PDF'],['md','markdown','var(--p)','Markdown File'],['html','html','#3b82f6','Rich HTML File'],['text','description','var(--t3)','Plain Text']].map(([f,ic,cl,lb])=>(
                    <button key={f} onClick={()=>exportDoc(f)} className="card-hover" style={{ display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 10px',border:'none',borderRadius:6,background:'transparent',color:'var(--t2)',fontSize:12.5,fontWeight:700,cursor:'pointer',textAlign:'left' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:16,color:cl }}>{ic}</span>{lb}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Sidebar toggle */}
            <button onClick={()=>setShowSidebar(!showSidebar)} style={{ height:40,display:'flex',alignItems:'center',gap:8,padding:'0 16px',borderRadius:12,border:'none',background:'linear-gradient(135deg,rgba(9,205,131,0.1),rgba(124,58,237,0.1))',color:'var(--t1)',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'inset 0 0 0 1px rgba(9,205,131,0.2)',transition:'all 240ms var(--ease)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--p)',fontVariationSettings:"'FILL' 1" }}>{showSidebar?'right_panel_close':'grid_view'}</span>{showSidebar?'Hide':'Workflow Hub'}
            </button>
            {/* Done button */}
            <button onClick={()=>save()} style={{ height:40,padding:'0 24px',borderRadius:12,background:`linear-gradient(135deg,${subColor},color-mix(in srgb,${subColor} 70%,black))`,border:'none',fontSize:13,fontWeight:900,color:'#00150a',cursor:'pointer',transition:'all 240ms var(--bounce)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 15px color-mix(in srgb,${subColor} 25%,transparent)` }}>Done</button>
          </div>
        </div>

        {/* ─── Formatting Toolbar ─── */}
        <div className="editor-hide-on-focus" style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 24px',borderBottom:'1px solid var(--surface-b)',background:'var(--s2)',flexWrap:'wrap',zIndex:9,transition:'all 300ms ease' }}>
          <select value={font} onChange={e=>setFont(e.target.value)} style={{ background:'var(--s3)',border:'1px solid var(--surface-b)',color:'var(--t2)',fontSize:12,fontWeight:700,outline:'none',cursor:'pointer',padding:'6px 12px',borderRadius:8,minWidth:120 }}>
            {FONT_OPTIONS.map(f=><option key={f.value} value={f.value} style={{ background:'var(--s1)',color:'var(--t1)' }}>{f.name}</option>)}
          </select>
          <select value={fontSize} onChange={e=>applyFontSize(e.target.value)} title="Font Size" style={{ background:'var(--s3)',border:'1px solid var(--surface-b)',color:'var(--t2)',fontSize:12,fontWeight:700,outline:'none',cursor:'pointer',padding:'6px 10px',borderRadius:8,width:60,textAlign:'center' }}>
            {['10','12','13','14','15','16','18','20','22','24','28','32','36','48','60','72'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ width:1,height:24,background:'var(--surface-b)',margin:'0 4px' }}/>
          <div style={{ display:'flex',gap:2 }}>
            <TBtn icon="format_bold" title="Bold" active={activeFormats.bold} onClick={()=>applyFormat('bold')} style={{ fontVariationSettings:"'wght' 700" }} />
            <TBtn icon="format_italic" title="Italic" active={activeFormats.italic} onClick={()=>applyFormat('italic')} />
            <TBtn icon="format_underlined" title="Underline" active={activeFormats.underline} onClick={()=>applyFormat('underline')} />
            <TBtn icon="strikethrough_s" title="Strikethrough" active={activeFormats.strike} onClick={()=>applyFormat('strike')} />
            <TBtn icon="format_quote" title="Blockquote" active={activeFormats.blockquote} onClick={()=>applyFormat('blockquote')} />
            <TBtn icon="code" title="Code Block" active={activeFormats['code-block']} onClick={()=>applyFormat('code-block')} />
          </div>
          <div style={{ width:1,height:24,background:'var(--surface-b)',margin:'0 4px' }}/>
          <div style={{ display:'flex',gap:2 }}>
            <TBtn icon="format_align_left" title="Left" active={activeFormats.align===''} onClick={()=>applyFormat('align','')} />
            <TBtn icon="format_align_center" title="Center" active={activeFormats.align==='center'} onClick={()=>applyFormat('align','center')} />
            <TBtn icon="format_align_right" title="Right" active={activeFormats.align==='right'} onClick={()=>applyFormat('align','right')} />
            <TBtn icon="format_align_justify" title="Justify" active={activeFormats.align==='justify'} onClick={()=>applyFormat('align','justify')} />
          </div>
          <div style={{ width:1,height:24,background:'var(--surface-b)',margin:'0 4px' }}/>
          <div style={{ display:'flex',gap:2 }}>
            <TBtn icon="format_list_bulleted" title="Bullet List" active={activeFormats.list==='bullet'} onClick={()=>applyFormat('list','bullet')} />
            <TBtn icon="format_list_numbered" title="Numbered List" active={activeFormats.list==='ordered'} onClick={()=>applyFormat('list','ordered')} />
          </div>
          <div style={{ width:1,height:24,background:'var(--surface-b)',margin:'0 4px' }}/>
          {/* Color & Highlight */}
          <div style={{ display:'flex',gap:6,position:'relative' }}>
            <button onClick={()=>togglePopover('color')} title="Text Color" className="icon-btn" style={{ width:32,height:32,background:'var(--s3)',border:'1px solid var(--surface-b)',color:activeFormats.color!=='#ffffff'?activeFormats.color:'var(--t2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>format_color_text</span>
            </button>
            {activePopover==='color' && (
              <div className="popover-menu" style={{ top:'120%',left:0,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4,width:150 }}>
                {COLOR_PALETTE.map(c=><button key={c.name} onClick={()=>applyFormat('color',c.value)} title={c.name} style={{ background:c.value==='var(--t1)'?'var(--t1)':c.value,height:26,border:'1px solid rgba(255,255,255,0.2)',borderRadius:4,cursor:'pointer' }}/>)}
              </div>
            )}
            <button onClick={()=>togglePopover('highlight')} title="Highlight" className="icon-btn" style={{ width:32,height:32,background:'var(--s3)',border:'1px solid var(--surface-b)',color:activeFormats.background!=='transparent'?activeFormats.background:'var(--t2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>border_color</span>
            </button>
            {activePopover==='highlight' && (
              <div className="popover-menu" style={{ top:'120%',left:0,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4,width:150 }}>
                {HIGHLIGHT_PALETTE.map(c=><button key={c.name} onClick={()=>applyFormat('background',c.value)} title={c.name} style={{ background:c.value==='transparent'?'rgba(255,255,255,0.05)':c.value,height:26,border:'1px solid rgba(255,255,255,0.2)',borderRadius:4,cursor:'pointer' }}/>)}
              </div>
            )}
          </div>
          <div style={{ width:1,height:24,background:'var(--surface-b)',margin:'0 4px' }}/>
          {/* Theme Picker */}
          <div style={{ position:'relative' }}>
            <button onClick={()=>togglePopover('themes')} className="btn btn-surface" style={{ height:32,display:'flex',alignItems:'center',gap:6,padding:'0 10px',fontSize:11.5,fontWeight:800 }}>
              <span className="material-symbols-outlined" style={{ fontSize:16,color:'var(--p)' }}>palette</span>Theme: {writingTheme.toUpperCase()}
            </button>
            {activePopover==='themes' && (
              <div className="popover-menu" style={{ top:'120%',left:0,width:180 }}>
                <p style={{ fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6 }}>Writing Themes</p>
                {[['classic','📄 Academic Editorial'],['zen','🧘 Deep Focus Zen'],['cyberpunk','🌌 Cosmic Cyberpunk'],['terminal','👾 Hacker Terminal']].map(([k,lb])=>(
                  <button key={k} onClick={()=>{setWritingTheme(k);setActivePopover(null);}} className="card-hover" style={{ width:'100%',padding:8,border:'none',borderRadius:6,background:'transparent',color:'var(--t2)',fontSize:12,fontWeight:700,textAlign:'left',cursor:'pointer' }}>{lb}</button>
                ))}
              </div>
            )}
          </div>
          {/* Sounds Popover */}
          <div style={{ position:'relative' }}>
            <button onClick={()=>togglePopover('sounds')} className="btn btn-surface" style={{ height:32,display:'flex',alignItems:'center',gap:6,padding:'0 10px',fontSize:11.5,fontWeight:800 }}>
              <span className="material-symbols-outlined" style={{ fontSize:16,color:'#fb923c' }}>headphones</span>Focus Audio
            </button>
            {activePopover==='sounds' && (
              <div className="popover-menu" style={{ top:'120%',left:0,width:220 }}>
                <p style={{ fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6 }}>Synthesized Ambient</p>
                <select value={ambientSound} onChange={e=>setAmbientSound(e.target.value)} style={{ width:'100%',padding:6,background:'var(--s2)',border:'1px solid var(--surface-b)',color:'var(--t1)',borderRadius:6,fontSize:12,outline:'none',cursor:'pointer',marginBottom:10 }}>
                  <option value="none">None (Silence)</option><option value="brown">🌧️ Calming Rain</option><option value="pink">🌲 Forest Wind</option><option value="white">🌫️ Static Haze</option>
                </select>
                <p style={{ fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6 }}>Volume</p>
                <input type="range" min="0.01" max="0.5" step="0.01" value={ambientVolume} onChange={e=>setAmbientVolume(parseFloat(e.target.value))} style={{ width:'100%',cursor:'pointer',marginBottom:12 }}/>
                <p style={{ fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6 }}>Keystroke Clicking</p>
                <select value={typingSound} onChange={e=>setTypingSound(e.target.value)} style={{ width:'100%',padding:6,background:'var(--s2)',border:'1px solid var(--surface-b)',color:'var(--t1)',borderRadius:6,fontSize:12,outline:'none',cursor:'pointer' }}>
                  <option value="none">None (Silent)</option><option value="mechanical">⌨️ Mechanical</option><option value="bubble">🫧 Bubble Pops</option><option value="beep">📟 Retro Beeps</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ width:1,height:24,background:'var(--surface-b)',margin:'0 4px' }}/>
          <TBtn icon={isZenFocus?'visibility_off':'visibility'} title="Zen Focus Mode" active={isZenFocus} onClick={()=>setIsZenFocus(!isZenFocus)} />
        </div>

        {/* ─── Main Workspace Area ─── */}
        <div style={{ display:'flex',flex:1,overflow:'hidden',position:'relative' }}>
          {/* Editor */}
          <div className={`editor-theme-${writingTheme} ${writingTheme==='classic'&&theme==='dark'?'editor-theme-classic-dark':''} ${writingTheme==='zen'&&theme==='dark'?'editor-theme-zen-dark':''}`}
            style={{ flex:1,overflowY:'auto',display:'flex',justifyContent:'center',paddingBottom:120,position:'relative',transition:'all 0.3s' }}>
            {writingTheme==='terminal' && <div style={{ position:'absolute',inset:0,background:'linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,0.15) 50%)',backgroundSize:'100% 4px',pointerEvents:'none' }}/>}
            <div style={{ width:'100%',maxWidth:isZenFocus?900:800,padding:isZenFocus?'40px 60px':'60px 40px',position:'relative',transition:'all 0.3s' }}>
              {viewMode==='write' ? (<>
                <input value={form.title} onChange={set('title')} placeholder="Document Title" autoFocus
                  style={{ fontSize:48,fontWeight:900,background:'transparent',border:'none',color:writingTheme==='terminal'?'#33ff33':writingTheme==='cyberpunk'?'#00ffcc':'var(--t1)',outline:'none',marginBottom:40,padding:0,width:'100%',letterSpacing:'-0.03em',lineHeight:1.1,textShadow:writingTheme==='terminal'?'0 0 4px rgba(51,255,51,0.3)':writingTheme==='cyberpunk'?'0 0 6px rgba(0,255,204,0.4)':'none' }}/>
                <div style={{ position:'relative' }} onKeyDown={handleEditorKeyDown}>
                  <ReactQuill ref={quillRef} value={form.content} onChange={handleContentChange} placeholder="Start writing, or type '/' for commands..." theme="bubble" modules={{ toolbar:false }} style={{ flex:1,width:'100%',overflow:'hidden' }}/>
                  <style>{`.ql-container{font-family:${font} !important;font-size:${fontSize}px !important}
                    .ql-editor{padding:0 !important;line-height:1.85 !important;min-height:450px}
                    .ql-editor.ql-blank::before{left:0 !important;right:0 !important;color:var(--t4) !important;font-style:normal !important}
                    .ql-editor strong{font-weight:700} .ql-editor em{font-style:italic}
                    .ql-editor blockquote{border-left:4px solid var(--p);padding-left:16px;color:var(--t3);margin:20px 0;font-style:italic}
                    .ql-editor code{background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;color:var(--p)}
                    .ql-editor pre{background:#0d0e12;padding:16px;border-radius:8px;border:1px solid var(--surface-b);overflow-x:auto;margin:20px 0}
                    .ql-editor pre code{background:transparent;padding:0;color:var(--t2)}`}</style>
                  {slashMenu && (
                    <div className="glass-panel" style={{ position:'absolute',top:'100%',left:0,width:320,background:'var(--s1)',borderRadius:12,border:'1px solid var(--surface-b)',boxShadow:'0 10px 30px rgba(0,0,0,0.3)',padding:8,zIndex:100,animation:'slideUp 200ms ease' }}>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px' }}>
                        <div style={{ fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.1em' }}>AI Commands</div>
                        <div style={{ fontSize:9,color:'var(--t4)',background:'var(--s3)',padding:'2px 6px',borderRadius:4 }}>ESC</div>
                      </div>
                      {slashCommands.map(c=>(
                        <button key={c.id} onClick={()=>executeSlash(c)} className="card-hover" style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'transparent',border:'none',borderRadius:8,color:'var(--t2)',cursor:'pointer',textAlign:'left',fontSize:13,fontWeight:600 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--p)' }}>{c.icon}</span>{c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>) : (
                <div style={{ animation:'modalFadeIn 300ms ease' }}>
                  <h1 style={{ fontSize:48,fontWeight:900,color:'var(--t1)',marginBottom:40,letterSpacing:'-0.03em',lineHeight:1.1 }}>{form.title||'Untitled Document'}</h1>
                  <div className="ql-editor" style={{ fontSize:parseInt(fontSize),lineHeight:1.9,color:'var(--t2)',fontFamily:font,padding:0 }} dangerouslySetInnerHTML={{ __html:form.content||'<span style="color:var(--t4);font-style:italic">No content yet...</span>' }}/>
                </div>
              )}
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          {showSidebar && (
            <div className="editor-sidebar editor-hide-sidebar" style={{ width:400,background:'var(--s1)',borderLeft:'1px solid var(--surface-b)',display:'flex',flexDirection:'column',flexShrink:0,animation:'slideInRight 300ms cubic-bezier(0.16,1,0.3,1)',transition:'all 300ms ease' }}>
              <div style={{ display:'flex',borderBottom:'1px solid var(--surface-b)',background:'var(--s2)',padding:'12px 16px 0',gap:8,flexShrink:0 }}>
                {[['workflow','hub','Workflow'],['outline','toc','Outline'],['insights','auto_awesome','Smart AI']].map(([k,ic,lb])=>(
                  <button key={k} onClick={()=>setSidebarTab(k)} style={{ flex:1,padding:'10px 8px',border:'none',borderTopLeftRadius:8,borderTopRightRadius:8,background:sidebarTab===k?'var(--s1)':'transparent',color:sidebarTab===k?'var(--p)':'var(--t4)',borderBottom:sidebarTab===k?'2px solid var(--p)':'none',fontWeight:800,fontSize:11.5,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'all 0.2s' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:15 }}>{ic}</span>{lb}
                  </button>
                ))}
              </div>
              {activeVideo && (
                <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--surface-b)',background:'rgba(0,0,0,0.2)',flexShrink:0 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                    <span style={{ fontSize:10,fontWeight:800,color:'var(--p)',textTransform:'uppercase',letterSpacing:'0.05em' }}>PIP Player</span>
                    <button onClick={()=>setActiveVideo(null)} style={{ background:'transparent',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:11,fontWeight:700 }}>Stop</button>
                  </div>
                  <div style={{ position:'relative',paddingTop:'56.25%',borderRadius:12,overflow:'hidden',border:'1px solid var(--surface-b)',background:'#000' }}>
                    {activeVideo.info.type==='youtube' && <iframe src={`https://www.youtube.com/embed/${activeVideo.info.id}?autoplay=1`} title={activeVideo.title} style={{ position:'absolute',inset:0,width:'100%',height:'100%',border:'none' }} allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen/>}
                    {activeVideo.info.type==='drive' && <iframe src={activeVideo.info.embedUrl} title={activeVideo.title} style={{ position:'absolute',inset:0,width:'100%',height:'100%',border:'none' }} allow="autoplay;fullscreen" allowFullScreen/>}
                    {(activeVideo.info.type==='local'||activeVideo.info.type==='direct') && <video src={activeVideo.info.id} controls autoPlay style={{ position:'absolute',inset:0,width:'100%',height:'100%' }}/>}
                  </div>
                </div>
              )}
              <div style={{ flex:1,overflowY:'auto',padding:20 }}>
                {sidebarTab==='workflow' && (
                  <div style={{ display:'flex',flexDirection:'column',gap:24 }}>
                    <div>
                      <h4 style={{ fontSize:11,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}><span className="material-symbols-outlined" style={{ fontSize:15,color:'var(--p)' }}>bolt</span>Fast Actions</h4>
                      <button onClick={()=>{const d=new Date();d.setDate(d.getDate()+1);A.schedule.add({subject:form.subject,topic:`Review: ${form.title||'Untitled'}`,startTime:'10:00',durationMinutes:45,day:d.toISOString().slice(0,10)});toast.success('Scheduled study block! 📅');}} style={{ width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid var(--surface-b)',background:'var(--s2)',color:'var(--t2)',fontSize:12.5,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:16,color:'#fb923c' }}>event</span>Schedule Study Block Tomorrow
                      </button>
                    </div>
                    <div>
                      <h4 style={{ fontSize:11,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}><span className="material-symbols-outlined" style={{ fontSize:15,color:'var(--p)' }}>checklist</span>{form.subject} Tasks ({subjectTasks.length})</h4>
                      <form onSubmit={e=>{e.preventDefault();if(!newTaskTitle.trim())return;A.task.add({title:newTaskTitle.trim(),subject:form.subject,priority:'medium'});toast.success('Task added! ✅');setNewTaskTitle('');}} style={{ display:'flex',gap:6,marginBottom:10 }}>
                        <input className="input" placeholder="Quick add task..." value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} style={{ height:32,fontSize:12,padding:'0 10px',background:'var(--s2)' }}/>
                        <button type="submit" className="btn btn-primary" style={{ padding:'0 12px',height:32,fontSize:12 }}><span className="material-symbols-outlined" style={{ fontSize:16 }}>add</span></button>
                      </form>
                      {subjectTasks.length > 0 ? subjectTasks.map(t=>(
                        <div key={t.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'var(--s2)',border:'1px solid var(--surface-b)',marginBottom:6 }}>
                          <button onClick={()=>{A.task.done(t.id);toast.success('Done! 🎉');}} style={{ width:18,height:18,borderRadius:999,border:'2px solid var(--t4)',background:'transparent',cursor:'pointer',flexShrink:0 }}/>
                          <span style={{ fontSize:12.5,color:'var(--t2)',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{t.title}</span>
                        </div>
                      )) : <div style={{ padding:12,background:'var(--s2)',borderRadius:10,border:'1px dashed var(--surface-b)',textAlign:'center',fontSize:12,color:'var(--t4)' }}>No pending tasks for {form.subject}</div>}
                    </div>
                    <div>
                      <h4 style={{ fontSize:11,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}><span className="material-symbols-outlined" style={{ fontSize:15,color:'var(--p)' }}>smart_display</span>Subject Videos ({subjectVideos.length})</h4>
                      {subjectVideos.length > 0 ? subjectVideos.map(v=>(
                        <div key={v.id} style={{ display:'flex',alignItems:'center',gap:10,padding:10,borderRadius:12,background:'var(--s2)',border:'1px solid var(--surface-b)',marginBottom:8 }}>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:750,color:'var(--t2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v.title}</div>
                            <div style={{ fontSize:10,color:'var(--t4)',marginTop:2 }}>{v.watched?<span style={{color:'#10b981'}}>✓ Watched</span>:'In queue'}</div>
                          </div>
                          <button onClick={()=>{const info=extractVideoInfo(v.url);if(info){setActiveVideo({...v,info});toast.success('Loaded video!');}else toast.error('Invalid URL');}} style={{ width:28,height:28,borderRadius:8,background:'var(--s3)',border:'1px solid var(--surface-b)',color:'var(--p)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:16,fontVariationSettings:"'FILL' 1" }}>play_arrow</span>
                          </button>
                        </div>
                      )) : <div style={{ padding:12,background:'var(--s2)',borderRadius:10,border:'1px dashed var(--surface-b)',textAlign:'center',fontSize:12,color:'var(--t4)' }}>No videos for {form.subject}</div>}
                    </div>
                  </div>
                )}
                {sidebarTab==='outline' && (
                  <div>
                    <h4 style={{ fontSize:11,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}><span className="material-symbols-outlined" style={{ fontSize:15,color:'var(--p)' }}>toc</span>Document Outline</h4>
                    {outline.length > 0 ? outline.map(h=>(
                      <button key={h.id} onClick={()=>scrollToHeading(h.text)} className="card-hover" style={{ display:'block',width:'100%',padding:'8px 10px',border:'none',borderRadius:8,background:'transparent',color:'var(--t2)',textAlign:'left',cursor:'pointer',fontSize:12.5,fontWeight:h.tag==='h1'?800:h.tag==='h2'?700:600,paddingLeft:h.tag==='h1'?8:h.tag==='h2'?20:32 }}>{h.text}</button>
                    )) : <div style={{ padding:16,background:'var(--s2)',borderRadius:10,border:'1px dashed var(--surface-b)',textAlign:'center',fontSize:12,color:'var(--t4)',lineHeight:1.5 }}>Create Headings to see an interactive outline here.</div>}
                  </div>
                )}
                {sidebarTab==='insights' && (
                  <div style={{ display:'flex',flexDirection:'column',gap:24 }}>
                    {!ai && (
                      <div style={{ textAlign:'center',padding:'20px 10px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:32,color:'var(--nebula-purple)',marginBottom:12 }}>auto_awesome</span>
                        <p style={{ fontSize:13,fontWeight:800,color:'var(--t1)' }}>No Insights Generated</p>
                        <p style={{ fontSize:12,color:'var(--t4)',marginTop:6,marginBottom:16,lineHeight:1.5 }}>Let Aura AI analyze your document to generate flashcards, summary and concept maps.</p>
                        {!isOnline ? <div style={{ padding:'12px 14px',borderRadius:10,background:'rgba(251,146,60,0.06)',border:'1px solid rgba(251,146,60,0.18)',color:'#fb923c',fontSize:12,fontWeight:700 }}><span className="material-symbols-outlined" style={{ fontSize:16,verticalAlign:'middle',marginRight:6 }}>wifi_off</span>Aura AI is offline.</div>
                        : <button onClick={runAI} disabled={aiLoad} className="btn btn-primary" style={{ width:'100%',height:36,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'linear-gradient(135deg,#7c3aed,#06b6d4)',border:'none' }}>
                            {aiLoad ? <div className="spinner" style={{ width:14,height:14,borderWidth:2,borderColor:'#fff',borderTopColor:'transparent' }}/> : <><span className="material-symbols-outlined" style={{ fontSize:16 }}>bolt</span>Analyze Note</>}
                          </button>}
                      </div>
                    )}
                    {ai && (<div style={{ display:'flex',flexDirection:'column',gap:24 }}>
                      {ai.summary && <div><h4 style={{ fontSize:11,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10 }}>Summary</h4><div style={{ padding:'12px 14px',borderRadius:10,background:'var(--s2)',border:'1px solid var(--surface-b)' }}><p style={{ fontSize:13,color:'var(--t2)',lineHeight:1.55 }}>{ai.summary}</p></div></div>}
                      {ai.concepts?.length > 0 && <div><h4 style={{ fontSize:11,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10 }}>Core Concepts</h4><div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>{ai.concepts.map(c=><span key={c} style={{ padding:'5px 10px',borderRadius:6,background:'rgba(124,58,237,0.08)',color:'#a78bfa',fontSize:12,fontWeight:700,border:'1px solid rgba(124,58,237,0.15)' }}>{c}</span>)}</div></div>}
                      {ai.flashcards?.length > 0 && <div><h4 style={{ fontSize:11,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10 }}>Flashcards ({ai.flashcards.length})</h4>{ai.flashcards.map((fc,i)=><div key={i} style={{ padding:'12px 14px',borderRadius:10,background:'var(--s2)',border:'1px solid var(--surface-b)',marginBottom:10 }}><p style={{ fontSize:12.5,fontWeight:800,color:'var(--t1)',marginBottom:6 }}><span style={{color:'var(--p)'}}>Q.</span> {fc.question||fc.q}</p><p style={{ fontSize:12.5,color:'var(--t3)',lineHeight:1.45 }}><span style={{color:'var(--t4)',fontWeight:800}}>A.</span> {fc.answer||fc.a}</p></div>)}</div>}
                    </div>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Bottom Status Bar ─── */}
        <div className="editor-hide-on-focus" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:44,borderTop:'1px solid var(--surface-b)',background:'var(--s1)',flexShrink:0,zIndex:10,transition:'all 300ms ease' }}>
          <div style={{ display:'flex',gap:16,alignItems:'center' }}>
            <span style={{ fontSize:11,color:'var(--t4)',fontWeight:700 }}>{typingStats.charCount} CHARACTERS</span>
            <span style={{ fontSize:11,color:'var(--t4)',fontWeight:700 }}>{getWordCount(form.content)} WORDS</span>
            <span style={{ fontSize:11,color:'var(--t4)',fontWeight:700 }}>{Math.max(1,Math.ceil(getWordCount(form.content)/200))}M READ TIME</span>
          </div>
          <div style={{ display:'flex',gap:20,alignItems:'center' }}>
            <span style={{ fontSize:11,color:'var(--t4)',fontWeight:700,display:'flex',alignItems:'center',gap:4 }}>
              <span className="material-symbols-outlined" style={{ fontSize:14,color:'var(--p)' }}>speed</span>Speed: <strong style={{ color:'var(--t2)' }}>{typingStats.wpm} WPM</strong>
            </span>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ fontSize:11,color:'var(--t4)',fontWeight:700 }}>Focus:</span>
              <div style={{ width:80,height:6,background:'rgba(255,255,255,0.08)',borderRadius:999,overflow:'hidden',position:'relative' }}>
                <div style={{ position:'absolute',inset:0,width:`${typingStats.focusScore}%`,background:'linear-gradient(90deg,#fb923c,#10b981)',transition:'width 300ms ease' }}/>
              </div>
              <strong style={{ fontSize:11,color:'var(--t2)',minWidth:25 }}>{typingStats.focusScore}%</strong>
            </div>
            <span style={{ fontSize:11,color:'var(--t4)',fontWeight:800,display:'flex',alignItems:'center',gap:4 }}>
              {saveStatus==='Saving...'?<div className="spinner" style={{width:10,height:10,borderWidth:2,borderColor:'var(--t4)',borderTopColor:'transparent'}}/>:<span className="material-symbols-outlined" style={{fontSize:14,color:'var(--t4)'}}>cloud_done</span>}
              {saveStatus.toUpperCase()}
            </span>
          </div>
        </div>

        </div>
      </div>
    </Portal>
  );
}

// ─── Notes Page (List + Editor) ──────────────────────────────────────────────
export default function Notes() {
  const { notes, A } = useApp();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [sub, setSub] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [sortBy, setSortBy] = useState('updated'); // 'updated' | 'title' | 'words' | 'created'
  const [viewStyle, setViewStyle] = useState('grid'); // 'grid' | 'list'

  const [editing, setEditing] = useState(() => {
    const savedId = localStorage.getItem('los_active_note_id');
    const savedShow = localStorage.getItem('los_show_note_editor') === 'true';
    if (savedShow && savedId) {
      if (savedId === 'new_note') { try { return JSON.parse(localStorage.getItem('los_note_draft')||'{}'); } catch { return {}; } }
      return notes.find(n => n.id === savedId) || null;
    }
    return null;
  });

  const [show, setShow] = useState(() => {
    const savedId = localStorage.getItem('los_active_note_id');
    const savedShow = localStorage.getItem('los_show_note_editor') === 'true';
    if (savedShow && savedId) return savedId === 'new_note' || notes.some(n => n.id === savedId);
    return false;
  });

  const [showQuick, setShowQuick] = useState(false);
  const isInitialMount = useRef(true);

  // Global Alt+N keyboard shortcut for Quick Note
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setShowQuick(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (show && editing) {
      localStorage.setItem('los_show_note_editor', 'true');
      localStorage.setItem('los_active_note_id', editing.id || 'new_note');
      if (!editing.id) localStorage.setItem('los_note_draft', JSON.stringify(editing));
    } else {
      localStorage.removeItem('los_show_note_editor');
      localStorage.removeItem('los_active_note_id');
      localStorage.removeItem('los_note_draft');
    }
  }, [show, editing]);

  // Extract all unique tags across notes
  const allTags = useMemo(() => {
    const tagSet = new Set();
    notes.forEach(n => {
      if (Array.isArray(n.tags)) {
        n.tags.forEach(t => { if (t) tagSet.add(t); });
      }
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    let result = notes.filter(n => {
      const ms = sub === 'All' || n.subject === sub;
      const mt = selectedTag === 'All' || (n.tags && n.tags.includes(selectedTag));
      const mq = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase());
      return ms && mt && mq;
    });

    // Sort notes (pinned always rise to top)
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'words') {
        return getWordCount(b.content) - getWordCount(a.content);
      } else if (sortBy === 'created') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else {
        // 'updated'
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      }
    });

    return result;
  }, [notes, search, sub, selectedTag, sortBy]);

  const handleOpenNote = useCallback((n) => { setEditing(n); setShow(true); }, []);
  const handleDeleteNote = useCallback((id) => { A.note.remove(id); toast.success('Note deleted'); }, [A.note]);

  const handleTogglePin = useCallback((n) => {
    A.note.update({ ...n, pinned: !n.pinned });
    toast.success(n.pinned ? 'Unpinned note' : 'Pinned note to top 📌');
  }, [A.note]);

  const handleDuplicateNote = useCallback((n) => {
    const dup = {
      ...n,
      id: undefined,
      title: `Copy of ${n.title || 'Untitled'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    A.note.add(dup);
    toast.success('Note duplicated 📋');
  }, [A.note]);

  const save = (note, isAuto = false) => {
    let finalNote = { ...note };
    if (!finalNote.id) {
      finalNote.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      A.note.add(finalNote); setEditing(finalNote);
      if (!isAuto) toast.success('Note saved');
    } else {
      A.note.update(finalNote);
      if (!isAuto) toast.success('Note updated');
    }
    if (!isAuto) { setShow(false); setShowQuick(false); setEditing(null); }
  };

  const pinnedCount = useMemo(() => notes.filter(n => n.pinned).length, [notes]);

  return (
    <div className="page">
      <style>{`@keyframes modalCenterIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      
      {/* Header */}
      <div className="fadeup" style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
        <div>
          <h1 className="shimmer-text page-title">My Notes & Knowledge Base</h1>
          <p style={{ fontSize:13,color:'var(--t3)',marginTop:4 }}>
            {notes.length} notes · {[...new Set(notes.map(n=>n.subject))].length} subjects {pinnedCount > 0 ? `· ${pinnedCount} pinned 📌` : ''}
          </p>
        </div>
        <div style={{ display:'flex',gap:'var(--gap-sm)',flexWrap:'wrap' }}>
          <button onClick={()=>setShowQuick(true)} className="btn btn-surface" style={{ padding:'10px 18px',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6 }} title="Shortcut: Alt + N">
            <span className="material-symbols-outlined" style={{ fontSize:18,color:'var(--p)' }}>bolt</span>Quick Note
          </button>
          <button onClick={()=>{setEditing({});setShow(true);}} className="btn btn-primary" style={{ padding:'10px 20px',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>edit_document</span>Full Document
          </button>
        </div>
      </div>

      {/* Controls & Filter Section */}
      <div className="fadeup d1" style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {/* Search Bar + Controls */}
        <div style={{ display:'flex',gap:12,alignItems:'center',flexWrap:'wrap' }}>
          <div style={{ position:'relative',flex:1,minWidth:220 }}>
            <span className="material-symbols-outlined" style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'var(--t4)',pointerEvents:'none' }}>search</span>
            <input
              className="input"
              style={{ paddingLeft:42,paddingRight:search?36:14 }}
              placeholder="Search notes by title, concept or content…"
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
            {search && (
              <button onClick={()=>setSearch('')} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--t4)',cursor:'pointer',display:'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize:16 }}>close</span>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div style={{ display:'flex',alignItems:'center',gap:6,background:'var(--s2)',border:'1px solid var(--surface-b)',borderRadius:10,padding:'4px 10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16,color:'var(--t4)' }}>sort</span>
            <select
              value={sortBy}
              onChange={e=>setSortBy(e.target.value)}
              style={{ background:'transparent',border:'none',color:'var(--t2)',fontSize:12,fontWeight:700,outline:'none',cursor:'pointer' }}
            >
              <option value="updated">Recently Modified</option>
              <option value="created">Newly Created</option>
              <option value="title">Title (A-Z)</option>
              <option value="words">Word Count</option>
            </select>
          </div>

          {/* Layout Toggle (Grid vs List) */}
          <div style={{ display:'flex',background:'var(--s2)',borderRadius:10,padding:3,border:'1px solid var(--surface-b)' }}>
            <button
              onClick={()=>setViewStyle('grid')}
              style={{ width:32,height:30,borderRadius:7,border:'none',background:viewStyle==='grid'?'var(--s3)':'transparent',color:viewStyle==='grid'?'var(--p)':'var(--t4)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 150ms' }}
              title="Grid View"
            >
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>grid_view</span>
            </button>
            <button
              onClick={()=>setViewStyle('list')}
              style={{ width:32,height:30,borderRadius:7,border:'none',background:viewStyle==='list'?'var(--s3)':'transparent',color:viewStyle==='list'?'var(--p)':'var(--t4)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 150ms' }}
              title="Compact List View"
            >
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>view_list</span>
            </button>
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div style={{ display:'flex',gap:6,overflowX:'auto',paddingBottom:2,scrollbarWidth:'none' }}>
          {ALL_SUBS.map(f => {
            const c = SUBJECT_COLORS[f] || 'var(--p)';
            const active = sub === f;
            return (
              <button
                key={f}
                onClick={()=>setSub(f)}
                style={{
                  padding:'5px 14px',
                  borderRadius:999,
                  border:`1px solid ${active?c:'var(--surface-b)'}`,
                  background:active?`${c}18`:'transparent',
                  color:active?c:'var(--t3)',
                  fontWeight:750,
                  fontSize:12,
                  cursor:'pointer',
                  whiteSpace:'nowrap',
                  transition:'all 160ms ease',
                  flexShrink:0
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Tag Filter Pills */}
        {allTags.length > 0 && (
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginTop:2 }}>
            <span style={{ fontSize:11,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.06em',marginRight:2 }}>Tags:</span>
            <button
              onClick={()=>setSelectedTag('All')}
              style={{
                padding:'2px 8px',
                borderRadius:6,
                border:'1px solid var(--surface-b)',
                background:selectedTag==='All'?'var(--s3)':'transparent',
                color:selectedTag==='All'?'var(--t1)':'var(--t4)',
                fontSize:11,
                fontWeight:700,
                cursor:'pointer'
              }}
            >
              All Tags
            </button>
            {allTags.map(t => {
              const active = selectedTag === t;
              return (
                <button
                  key={t}
                  onClick={()=>setSelectedTag(t)}
                  style={{
                    padding:'2px 8px',
                    borderRadius:6,
                    border:active?'1px solid var(--p)':'1px solid var(--surface-b)',
                    background:active?'rgba(9,205,131,0.12)':'transparent',
                    color:active?'var(--p)':'var(--t4)',
                    fontSize:11,
                    fontWeight:600,
                    cursor:'pointer'
                  }}
                >
                  #{t}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes Grid / List */}
      {filtered.length > 0 ? (
        viewStyle === 'grid' ? (
          <div className="tilt-container" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,320px),1fr))',gap:'var(--gap-card)' }}>
            {filtered.map((n,i) => (
              <div key={n.id} className="fadeup tilt-card" style={{ animationDelay:`${i*0.03}s` }}>
                <NoteCard
                  note={n}
                  viewStyle="grid"
                  onOpen={handleOpenNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                  onDuplicate={handleDuplicateNote}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {filtered.map((n,i) => (
              <div key={n.id} className="fadeup" style={{ animationDelay:`${i*0.02}s` }}>
                <NoteCard
                  note={n}
                  viewStyle="list"
                  onOpen={handleOpenNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                  onDuplicate={handleDuplicateNote}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="fadeup" style={{ textAlign:'center',padding:'80px 20px',background:'var(--s2)',borderRadius:20,border:'1px solid var(--surface-b)' }}>
          <div style={{ fontSize:56,marginBottom:16,display:'inline-block' }}>📓</div>
          <p style={{ fontSize:15,fontWeight:800,color:'var(--t1)' }}>{search || selectedTag !== 'All' ? 'No matching notes found' : 'Your knowledge base is empty'}</p>
          <p style={{ fontSize:13,color:'var(--t4)',marginTop:6 }}>{search || selectedTag !== 'All' ? 'Try adjusting your search query or active tag filter.' : 'Capture your first insight and let AI help you master it.'}</p>
          {!(search || selectedTag !== 'All') && (
            <button onClick={()=>{setEditing({});setShow(true);}} className="btn btn-primary" style={{ padding:'12px 32px',marginTop:20 }}>
              Create First Note
            </button>
          )}
        </div>
      )}

      {show && (isMobile
        ? <MobileNoteEditor note={editing} onSave={save} onClose={()=>{setShow(false);setEditing(null);}}/>
        : <NoteEditor note={editing} onSave={save} onClose={()=>{setShow(false);setEditing(null);}}/>)}
      
      {showQuick && <QuickCapture onSave={save} onClose={()=>setShowQuick(false)}/>}
    </div>
  );
}
