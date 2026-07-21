import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp }     from '@context/AppContext';
import { useNetwork } from '@context/NetworkContext';
import { enhanceNote, inlineComplete } from '@services/ai';
import { AI }         from '@services/ai';
import { SUBJECT_COLORS, SUBJECTS } from '@utils';
import toast from 'react-hot-toast';
import { Portal } from '@components/ui';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.bubble.css';

/* ──────────────────────────────────────────────────
   Mobile-optimised Note Editor
   Designed for <768px viewports.
   
   Key differences from desktop:
   • Compact header (single row, icon-only buttons)
   • No side-by-side sidebar — replaced with a slide-up
     bottom-sheet overlay (full-screen on small phones)
   • Font size controls removed from inline toolbar
   • Title font scaled down (32px vs 48px)
   ────────────────────────────────────────────────── */

const FONT_OPTIONS = [
  { name: 'Plus Jakarta', value: "'Plus Jakarta Sans', sans-serif" },
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
];

function getWordCount(html) {
  if (!html) return 0;
  const cleanText = html.replace(/<\/?[^>]+(>|$)/g, "");
  return cleanText.trim().split(/\s+/).filter(Boolean).length;
}

function extractVideoInfo(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^#&?]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (driveMatch) return { type: 'drive', id: driveMatch[1], embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  if (url.startsWith('blob:')) return { type: 'local', id: url };
  return { type: 'direct', id: url };
}

const sanitizeHtml = (html) => {
  if (!html) return '';
  // 1. Remove dangerous tags
  let clean = html.replace(/<(script|iframe|object|embed|form|link|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/<(script|iframe|object|embed|form|link|style)[^>]*\/?>/gi, '');
  // 2. Remove event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*(['"])(.*?)\1/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*([^\s>]+)/gi, '');
  // 3. Remove javascript: pseudo-protocol
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


export default function MobileNoteEditor({ note, onSave, onClose }) {
  const isNew = !note?.id;
  const { videos, tasks, A } = useApp();
  const { isOnline } = useNetwork();

  const [form, setForm] = useState({
    title: note?.title || '',
    content: convertMarkdownToHtml(note?.content || ''),
    subject: note?.subject || 'Web Dev',
    tags: note?.tags?.join(', ') || ''
  });
  const [font, setFont]           = useState(note?.font || FONT_OPTIONS[0].value);
  const [ai, setAi]               = useState(note?.aiEnhanced ? { flashcards: note.flashcards, summary: note.summary, concepts: note.concepts } : null);
  const [aiLoad, setAiLoad]       = useState(false);
  const [viewMode, setViewMode]   = useState('write');
  const [showHub, setShowHub]     = useState(false);     // bottom-sheet toggle
  const [hubTab, setHubTab]       = useState('workflow');
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const quillRef = useRef(null);

  const subColor = SUBJECT_COLORS[form.subject] || 'var(--p)';

  const subjectTasks  = useMemo(() => (tasks || []).filter(t => t.status === 'pending' && t.subject === form.subject), [tasks, form.subject]);
  const subjectVideos = useMemo(() => (videos || []).filter(v => v.subject === form.subject), [videos, form.subject]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Debounced auto-save
  useEffect(() => {
    if (!form.title && !form.content) return;
    setSaveStatus('Saving...');
    const t = setTimeout(() => {
      save(true);
      setSaveStatus('Saved');
    }, 1500);
    return () => clearTimeout(t);
  }, [form.title, form.content, form.subject, form.tags, ai, font]);

  const handleContentChange = (value) => setForm(p => ({ ...p, content: value }));

  const runAI = async () => {
    if (!isOnline) { toast.error('Connect to the internet 📡'); return; }
    const rawText = quillRef.current?.getEditor()?.getText() || '';
    if (rawText.length < 50) { toast.error('Write 50+ chars first'); return; }
    if (!AI.enabled()) { toast('Add API key ✦', { icon: '🔑' }); return; }
    setAiLoad(true);
    const r = await enhanceNote(rawText);
    setAiLoad(false);
    if (r) { setAi(r); toast.success('Enhanced ✦'); }
    else toast.error('AI failed');
  };

  const save = (isAuto = false) => {
    if (!form.title.trim() && !form.content.trim()) return;
    const payload = {
      ...note, ...form, font,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      aiEnhanced: !!ai, flashcards: ai?.flashcards, summary: ai?.summary, concepts: ai?.concepts
    };
    onSave(payload, isAuto);
  };

  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'modalFadeIn 200ms ease both' }}>

        {/* ── Compact Mobile Header ─────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', height: 52, borderBottom: '1px solid var(--surface-b)', background: 'var(--s1)', flexShrink: 0, zIndex: 10 }}>
          {/* Left: Back + Subject */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={onClose} className="icon-btn" style={{ background: 'var(--s2)', border: '1px solid var(--surface-b)', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--t2)' }}>arrow_back</span>
            </button>
            <select value={form.subject} onChange={set('subject')} style={{ background: `color-mix(in srgb, ${subColor} 12%, transparent)`, color: subColor, border: `1px solid color-mix(in srgb, ${subColor} 25%, transparent)`, padding: '0 10px', height: 30, borderRadius: 999, fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer', maxWidth: 100 }}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Middle: Save status */}
          <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            {saveStatus === 'Saving...' ? <div className="spinner" style={{ width: 8, height: 8, borderWidth: 2, borderColor: 'var(--t4)', borderTopColor: 'transparent' }} /> : <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--t4)' }}>cloud_done</span>}
            {saveStatus.toUpperCase()}
          </span>

          {/* Right: Mode toggle + Hub + Done */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setViewMode(viewMode === 'write' ? 'read' : 'write')} className="icon-btn" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--surface-b)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--t2)' }}>{viewMode === 'write' ? 'visibility' : 'edit'}</span>
            </button>
            <button onClick={() => setShowHub(!showHub)} style={{ width: 34, height: 34, borderRadius: 10, background: showHub ? 'var(--p-sub)' : 'var(--s2)', border: showHub ? '1px solid var(--p)' : '1px solid var(--surface-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: showHub ? 'var(--p)' : 'var(--t2)', fontVariationSettings: "'FILL' 1" }}>grid_view</span>
            </button>
            <button onClick={() => save()} style={{ height: 34, padding: '0 16px', borderRadius: 10, background: `linear-gradient(135deg, ${subColor}, color-mix(in srgb, ${subColor} 70%, black))`, border: 'none', fontSize: 12, fontWeight: 900, color: '#00150a', cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>

        {/* ── Mobile Compact Toolbar ──────────── */}
        {viewMode === 'write' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderBottom: '1px solid var(--surface-b)', background: 'var(--s2)', flexShrink: 0 }}>
            <select value={font} onChange={e => setFont(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer', maxWidth: 100, padding: '4px 0' }}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value} style={{ background: 'var(--s1)', color: 'var(--t1)' }}>{f.name}</option>)}
            </select>
            <div style={{ width: 1, height: 16, background: 'var(--surface-b)' }} />
            {['bold', 'italic'].map(fmt => (
              <button key={fmt} onClick={() => {
                const quill = quillRef.current?.getEditor();
                if (!quill) return;
                quill.focus();
                const range = quill.getSelection();
                if (range) {
                  const cur = quill.getFormat(range);
                  quill.format(fmt, !cur[fmt]);
                }
              }} style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{fmt === 'bold' ? 'format_bold' : 'format_italic'}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 700 }}>{getWordCount(form.content)} words</span>
          </div>
        )}

        {/* ── Editor Area ────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
          <div style={{ padding: '24px 16px 120px', maxWidth: 600, margin: '0 auto' }}>
            {viewMode === 'write' ? (
              <>
                <input
                  className="editor-title-input"
                  value={form.title} onChange={set('title')} placeholder="Title"
                  style={{ fontSize: '1.8rem', fontWeight: 900, background: 'transparent', border: 'none', color: 'var(--t1)', outline: 'none', marginBottom: 24, padding: 0, width: '100%', letterSpacing: '-0.02em', lineHeight: 1.2 }}
                  autoFocus
                />
                <ReactQuill
                  ref={quillRef}
                  value={form.content}
                  onChange={handleContentChange}
                  placeholder="Start writing…"
                  theme="bubble"
                  modules={{ toolbar: false }}
                  style={{ width: '100%' }}
                />
                <style>{`
                  .ql-container { font-family: ${font} !important; font-size: 16px !important; }
                  .ql-editor { padding: 0 !important; line-height: 1.75 !important; color: var(--t2) !important; min-height: 200px; }
                  .ql-editor.ql-blank::before { left: 0 !important; right: 0 !important; color: var(--t4) !important; font-style: normal !important; }
                  .ql-editor strong { font-weight: 700; }
                  .ql-editor em { font-style: italic; }
                `}</style>
              </>
            ) : (
              <div style={{ animation: 'modalFadeIn 300ms ease' }}>
                <h1 className="editor-title-view" style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--t1)', marginBottom: 24, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{form.title || 'Untitled'}</h1>
                <div className="ql-editor" style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--t2)', fontFamily: font, padding: 0 }} dangerouslySetInnerHTML={{ __html: form.content || '<span style="color:var(--t4); font-style:italic">No content yet...</span>' }} />
                <style>{`
                  .ql-editor h1, .ql-editor h2, .ql-editor h3 { color: var(--t1); margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 800; }
                  .ql-editor p { margin-bottom: 1em; }
                  .ql-editor ul, .ql-editor ol { padding-left: 1.5em; margin-bottom: 1em; }
                  .ql-editor strong { font-weight: 700; }
                  .ql-editor em { font-style: italic; }
                `}</style>
              </div>
            )}
          </div>
        </div>

        {/* ── Workflow Hub Bottom Sheet ────── */}
        {showHub && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {/* Scrim */}
            <div onClick={() => setShowHub(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', animation: 'modalFadeIn 200ms ease' }} />

            {/* Sheet */}
            <div onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 1, maxHeight: '75vh', background: 'var(--s1)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', animation: 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}>

              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--surface-b)' }} />
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-b)', padding: '0 16px', gap: 8 }}>
                {[
                  { key: 'workflow', icon: 'hub', label: 'Workflow' },
                  { key: 'insights', icon: 'auto_awesome', label: 'AI Insights' }
                ].map(tab => (
                  <button key={tab.key} onClick={() => setHubTab(tab.key)} style={{ flex: 1, padding: '10px 4px', border: 'none', borderBottom: hubTab === tab.key ? '2px solid var(--p)' : '2px solid transparent', background: 'transparent', color: hubTab === tab.key ? 'var(--p)' : 'var(--t4)', fontWeight: 800, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>

              {/* Sheet Content */}
              <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 16 }}>
                {hubTab === 'workflow' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Fast Actions */}
                    <button
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        A.schedule.add({ subject: form.subject, topic: `Review: ${form.title || 'Untitled'}`, startTime: '10:00', durationMinutes: 45, day: tomorrow.toISOString().slice(0, 10) });
                        toast.success('Scheduled for tomorrow 📅');
                      }}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--surface-b)', background: 'var(--s2)', color: 'var(--t2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fb923c' }}>event</span>
                      Schedule Study Block Tomorrow
                    </button>

                    {/* Subject Tasks */}
                    <div>
                      <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{form.subject} Tasks ({subjectTasks.length})</h4>
                      <form onSubmit={e => { e.preventDefault(); if (!newTaskTitle.trim()) return; A.task.add({ title: newTaskTitle.trim(), subject: form.subject, priority: 'medium' }); toast.success('Task added ✅'); setNewTaskTitle(''); }} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input className="input" placeholder="Quick add task…" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} style={{ height: 34, fontSize: 12, padding: '0 10px', background: 'var(--s2)' }} />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0 12px', height: 34, fontSize: 12 }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span></button>
                      </form>
                      {subjectTasks.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {subjectTasks.map(t => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--surface-b)' }}>
                              <button onClick={() => { A.task.done(t.id); toast.success('Done 🎉'); }} style={{ width: 18, height: 18, borderRadius: 999, border: '2px solid var(--t4)', background: 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: 12, background: 'var(--s2)', borderRadius: 10, border: '1px dashed var(--surface-b)', textAlign: 'center', fontSize: 11, color: 'var(--t4)' }}>No pending tasks</div>
                      )}
                    </div>

                    {/* Subject Videos */}
                    <div>
                      <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Videos ({subjectVideos.length})</h4>
                      {subjectVideos.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {subjectVideos.slice(0, 5).map(v => (
                            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--surface-b)' }}>
                              <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{v.title}</span>
                              {v.watched && <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#10b981', fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: 12, background: 'var(--s2)', borderRadius: 10, border: '1px dashed var(--surface-b)', textAlign: 'center', fontSize: 11, color: 'var(--t4)' }}>No videos</div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── AI Insights Tab ──── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!ai ? (
                      <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--nebula-purple)', marginBottom: 8, display: 'block' }}>auto_awesome</span>
                        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--t1)' }}>No Insights Yet</p>
                        <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 6, marginBottom: 14, lineHeight: 1.5 }}>Let AI generate flashcards, summaries, and concepts.</p>
                        <button onClick={runAI} disabled={aiLoad || !isOnline} className="btn btn-primary" style={{ width: '100%', height: 36, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none' }}>
                          {aiLoad ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} /> : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>Analyze Note</>}
                        </button>
                      </div>
                    ) : (
                      <>
                        {ai.summary && (
                          <div>
                            <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Summary</h4>
                            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--surface-b)' }}>
                              <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.55 }}>{ai.summary}</p>
                            </div>
                          </div>
                        )}
                        {ai.concepts?.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Core Concepts</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {ai.concepts.map(c => (
                                <span key={c} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(124, 58, 237, 0.08)', color: '#a78bfa', fontSize: 11, fontWeight: 700, border: '1px solid rgba(124, 58, 237, 0.15)' }}>{c}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {ai.flashcards?.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Flashcards ({ai.flashcards.length})</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {ai.flashcards.map((fc, i) => (
                                <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--surface-b)' }}>
                                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}><span style={{ color: 'var(--p)' }}>Q.</span> {fc.question || fc.q}</p>
                                  <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.4 }}><span style={{ color: 'var(--t4)', fontWeight: 800 }}>A.</span> {fc.answer || fc.a}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
          @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </Portal>
  );
}
