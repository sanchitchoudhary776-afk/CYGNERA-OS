import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp }     from '@context/AppContext';
import { enhanceNote, inlineComplete } from '@services/ai';
import { AI }         from '@services/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SUBJECT_COLORS, SUBJECTS, fmt, wordCount } from '@utils';
import toast from 'react-hot-toast';
import { usePremium, Counter } from '@components/ui/PremiumUI';

const ALL_SUBS = ['All', ...SUBJECTS.slice(0,7)];

function QuickCapture({ onSave, onClose }) {
  const [content, setContent] = useState('');
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:110,background:'var(--overlay)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'modalFadeIn 200ms ease both' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:480,background:'var(--s1)',borderRadius:'var(--r-xl)',boxShadow:'0 32px 120px rgba(0,0,0,0.5), 0 0 0 1px var(--surface-b)',animation:'modalCenterIn 300ms var(--spring) both', overflow:'hidden', display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--surface-b)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'var(--t1)', display:'flex', alignItems:'center', gap:8 }}><span className="material-symbols-outlined" style={{color:'var(--p)', fontSize:18}}>bolt</span> Quick Capture</h3>
          <button onClick={onClose} className="icon-btn" style={{ background:'var(--s2)', border:'none', borderRadius:'50%', width:28, height:28 }}><span className="material-symbols-outlined" style={{ fontSize:16 }}>close</span></button>
        </div>
        <textarea 
          autoFocus
          value={content} 
          onChange={e=>setContent(e.target.value)} 
          placeholder="Jot down a quick thought or reminder..." 
          style={{ width:'100%', height:180, padding:'20px', background:'transparent', border:'none', color:'var(--t2)', fontSize:15, resize:'none', outline:'none', lineHeight:1.6, fontFamily:'var(--font-sans)' }}
        />
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--surface-b)', background:'var(--s2)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={()=>{ if(!content.trim()){toast.error('Note is empty');return;} onSave({ title:'Quick Note', content, subject:'All', tags:['quick'] })}} className="btn btn-primary" style={{ padding:'8px 24px', fontSize:12, fontWeight:800, background:'var(--t1)', color:'var(--bg)', border:'none' }}>Save Note</button>
        </div>
      </div>
    </div>
  );
}

function NoteCard({ note, onOpen, onDelete }) {
  const color = SUBJECT_COLORS[note.subject] || 'var(--p)';
  const { askConfirm } = usePremium();
  const readTime = Math.max(1, Math.ceil(wordCount(note.content) / 200));

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (await askConfirm('Delete Note', `Permanently delete "${note.title || 'Untitled'}"?`)) {
      onDelete(note.id);
    }
  };

  return (
    <div className="card card-hover tilt-card content-auto gpu" onClick={() => onOpen(note)}
      style={{ 
        padding:0, cursor:'pointer', overflow:'hidden', display:'flex', flexDirection:'column',
        background: `linear-gradient(145deg, var(--s2) 0%, color-mix(in srgb, ${color} 4%, var(--s2)) 100%)`,
        borderTop: `2px solid ${color}`
      }}>
      <div style={{ padding:'20px', flex:1 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12 }}>
          <h4 style={{ fontSize:16, fontWeight:800, color:'var(--t1)', lineHeight:1.3, wordBreak:'break-word' }}>{note.title||'Untitled'}</h4>
          <button onClick={handleDelete} className="icon-btn" style={{ width:28, height:28, opacity:0, transform:'translateX(5px)', transition:'all 200ms ease', background:'var(--s3)', border:'1px solid var(--surface-b)', color:'var(--t4)' }}>
            <span className="material-symbols-outlined" style={{ fontSize:15 }}>delete</span>
          </button>
        </div>
        
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, background:`color-mix(in srgb, ${color} 12%, transparent)`, color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{note.subject}</span>
          {note.aiEnhanced && <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, background:'rgba(96,165,250,0.12)', color:'#3b82f6', border:'1px solid rgba(96,165,250,0.2)', textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{fontSize:12}}>auto_awesome</span> AI</span>}
        </div>

        <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>
          {note.content}
        </p>
        
        {note.tags?.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:16 }}>
            {note.tags.slice(0,3).map(t=><span key={t} style={{ fontSize:10.5, fontWeight:600, color:'var(--t4)' }}>#{t}</span>)}
          </div>
        )}
      </div>

      <div style={{ padding:'12px 20px', borderTop:'1px solid var(--surface-b)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--s1)' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--t4)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{fontSize:14}}>subject</span>{wordCount(note.content)}</span>
          <span style={{ fontSize:11, color:'var(--t4)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{fontSize:14}}>schedule</span>{readTime}m read</span>
        </div>
        <span style={{ fontSize:11, color:'var(--t4)', fontWeight:600 }}>{fmt.shortDate(note.updatedAt)}</span>
      </div>
      
      <style>{`
        .card-hover:hover .icon-btn { opacity: 1 !important; transform: translateX(0) !important; }
        .card-hover:hover .icon-btn:hover { background: var(--danger) !important; color: white !important; border-color: var(--danger) !important; }
      `}</style>
    </div>
  );
}

function NoteEditor({ note, onSave, onClose }) {
  const isNew = !note?.id;
  const [form, setForm] = useState({ title:note?.title||'', content:note?.content||'', subject:note?.subject||'Web Dev', tags:note?.tags?.join(', ')||'' });
  const [font, setFont] = useState(note?.font || 'var(--font-sans)');
  const [ai,  setAi]    = useState(note?.aiEnhanced ? { flashcards:note.flashcards, summary:note.summary, concepts:note.concepts } : null);
  const [aiLoad, setAiLoad] = useState(false);
  const [viewMode, setViewMode] = useState('write'); // 'write' or 'read'
  const [showSidebar, setShowSidebar] = useState(!!ai);
  const [slashMenu, setSlashMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');
  
  const textRef = useRef(null);
  
  // Auto-resize textarea like Notion
  useEffect(() => {
    if (textRef.current && viewMode === 'write') {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = textRef.current.scrollHeight + 'px';
    }
  }, [form.content, viewMode]);

  // Debounced Auto-Save
  useEffect(() => {
    if (!form.title && !form.content) return;
    setSaveStatus('Saving...');
    const t = setTimeout(() => {
      save(true);
      setSaveStatus('Saved');
    }, 1500);
    return () => clearTimeout(t);
  }, [form.title, form.content, form.subject, form.tags, ai, font]);

  const set = k => e => {
    setForm(p=>({...p,[k]:e.target.value}));
    if (k === 'content') {
      if (e.target.value.endsWith('/')) setSlashMenu(true);
      else setSlashMenu(false);
    }
  };

  // Close slash menu on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSlashMenu(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const executeSlash = async (cmd) => {
    setSlashMenu(false);
    let newContent = form.content.slice(0, -1); // remove the slash
    
    if (cmd.action) {
      newContent += cmd.action;
      setForm(p => ({ ...p, content: newContent }));
      return;
    }

    if (cmd.id && AI.enabled()) {
      setSaveStatus('Writing...');
      const result = await inlineComplete(cmd.prompt, newContent);
      if (result) {
        setForm(p => ({ ...p, content: newContent + ' ' + result }));
      }
      setSaveStatus('Saved');
    }
  };

  const runAI = async () => {
    if (form.content.length < 50) { toast.error('Write 50+ chars first'); return; }
    if (!AI.enabled()) { toast('Add API key for AI ✦', {icon:'🔑'}); return; }
    setAiLoad(true);
    const r = await enhanceNote(form.content);
    setAiLoad(false);
    if (r) { setAi(r); toast.success('Note enhanced ✦'); }
    else toast.error('AI failed — try again');
  };

  const save = (isAuto = false) => {
    if (!form.title.trim() && !form.content.trim()) return;
    const payload = { ...note, ...form, font, tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean), aiEnhanced:!!ai, flashcards:ai?.flashcards, summary:ai?.summary, concepts:ai?.concepts };
    onSave(payload, isAuto);
  };

  const applyFormat = (prefix, suffix = prefix) => {
    if (viewMode !== 'write') setViewMode('write');
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = form.content;
    const sel = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + sel + suffix + text.substring(end);
    setForm(p => ({ ...p, content: newText }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const subColor = SUBJECT_COLORS[form.subject] || 'var(--p)';

  const slashCommands = [
    { id: 'continue', icon: 'edit_document', label: 'AI Continue Writing', prompt: 'Continue writing the next paragraph naturally.' },
    { id: 'fix', icon: 'spellcheck', label: 'Fix Grammar & Polish', prompt: 'Fix all grammar mistakes and improve the flow of the text.' },
    { id: 'summarize', icon: 'format_align_left', label: 'Summarize', prompt: 'Write a brief 3-sentence summary of everything written so far.' },
    { id: 'h2', icon: 'title', label: 'Heading 2', action: '\n## ' },
    { id: 'todo', icon: 'check_box', label: 'To-Do List', action: '\n- [ ] ' },
  ];

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:100,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',animation:'modalFadeIn 200ms ease both' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)', overflow:'hidden', position:'relative' }}>
        
        {/* Top Header Bar */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 24px',borderBottom:'1px solid var(--surface-b)',background:'var(--s1)',flexShrink:0, zIndex:10 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button onClick={onClose} className="icon-btn" style={{ background:'transparent', border:'1px solid var(--surface-b)', borderRadius:'8px', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--t2)' }}>arrow_back</span>
            </button>
            <div style={{ width:1, height:20, background:'var(--surface-b)' }} />
            <select value={form.subject} onChange={set('subject')} style={{ background:`color-mix(in srgb, ${subColor} 12%, transparent)`, color:subColor, border:`1px solid color-mix(in srgb, ${subColor} 25%, transparent)`, padding:'6px 14px', borderRadius:999, fontSize:12, fontWeight:700, outline:'none', cursor:'pointer' }}>
              {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <input value={form.tags} onChange={set('tags')} placeholder="Add tags..." style={{ background:'transparent', border:'none', color:'var(--t4)', fontSize:13, fontWeight:600, outline:'none', width:120 }} />
            
            <div style={{ width:1, height:20, background:'var(--surface-b)' }} />
            
            {/* Formatting Toolbar */}
            <div style={{ display:'flex', alignItems:'center', gap:2, background:'var(--s2)', padding:'4px 6px', borderRadius:8, border:'1px solid var(--surface-b)' }}>
              <select value={font} onChange={e=>setFont(e.target.value)} style={{ background:'transparent', border:'none', color:'var(--t2)', fontSize:12, fontWeight:600, outline:'none', cursor:'pointer', padding:'0 4px', maxWidth: 90 }}>
                <option value="var(--font-sans)">Sans-serif</option>
                <option value="Georgia, serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
              <div style={{ width:1, height:14, background:'var(--surface-b)', margin:'0 4px' }} />
              <button onClick={()=>applyFormat('**')} title="Bold" className="icon-btn" style={{ background:'transparent', border:'none', width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t2)', cursor:'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize:16, fontVariationSettings:"'wght' 700" }}>format_bold</span>
              </button>
              <button onClick={()=>applyFormat('*')} title="Italic" className="icon-btn" style={{ background:'transparent', border:'none', width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t2)', cursor:'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize:16 }}>format_italic</span>
              </button>
            </div>
          </div>
          
          <div style={{ display:'flex',gap:12,alignItems:'center' }}>
            <span style={{ fontSize:12, color:'var(--t4)', fontWeight:600, marginRight:12, display:'flex', alignItems:'center', gap:6 }}>
              {saveStatus === 'Saving...' ? <div className="spinner" style={{width:10,height:10,borderWidth:2,borderColor:'var(--t4)',borderTopColor:'transparent'}}/> : <span className="material-symbols-outlined" style={{fontSize:14,color:'var(--t4)'}}>cloud_done</span>}
              {saveStatus}
            </span>
            <span style={{ fontSize:12, color:'var(--t4)', fontWeight:600, marginRight:12 }}>{wordCount(form.content)} words</span>
            
            <div style={{ display:'flex', background:'var(--s2)', borderRadius:8, padding:4, border:'1px solid var(--surface-b)' }}>
              <button onClick={()=>setViewMode('write')} style={{ padding:'6px 16px', borderRadius:6, border:'none', background:viewMode==='write'?'var(--s3)':'transparent', color:viewMode==='write'?'var(--t1)':'var(--t4)', fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 150ms' }}>Edit</button>
              <button onClick={()=>setViewMode('read')} style={{ padding:'6px 16px', borderRadius:6, border:'none', background:viewMode==='read'?'var(--s3)':'transparent', color:viewMode==='read'?'var(--t1)':'var(--t4)', fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 150ms' }}>Read</button>
            </div>

            <div style={{ width:1, height:20, background:'var(--surface-b)' }} />

            {AI.enabled() && (
              <button onClick={() => { if(!ai) runAI(); setShowSidebar(!showSidebar); }} disabled={aiLoad && !ai} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.15))',color:'var(--t1)',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'inset 0 0 0 1px rgba(124, 58, 237, 0.4)',transition:'all 200ms ease',opacity:(aiLoad && !ai)?0.6:1 }}>
                {(aiLoad && !ai)?<div className="spinner" style={{ width:14,height:14,borderWidth:2,borderColor:'var(--nebula-purple)',borderTopColor:'transparent' }}/>:<span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--nebula-purple)', fontVariationSettings:"'FILL' 1" }}>{showSidebar ? 'right_panel_close' : 'auto_awesome'}</span>}
                {ai ? (showSidebar ? 'Hide AI' : 'Show AI') : 'Generate AI Notes'}
              </button>
            )}
            <button onClick={() => save()} className="btn btn-primary" style={{ padding:'8px 24px', borderRadius:8, background: `linear-gradient(135deg, ${subColor}, color-mix(in srgb, ${subColor} 70%, black))`, border:'none', fontSize:13, fontWeight:800 }}>
              Done
            </button>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>
          
          {/* Document Editor (Center) */}
          <div style={{ flex:1, overflowY:'auto', display:'flex', justifyContent:'center', paddingBottom:120, position:'relative' }}>
            <div style={{ width:'100%', maxWidth:800, padding:'60px 40px', position:'relative' }}>
              {viewMode === 'write' ? (
                <>
                  <input 
                    value={form.title} onChange={set('title')} placeholder="Document Title" 
                    style={{ fontSize:48, fontWeight:900, background:'transparent', border:'none', color:'var(--t1)', outline:'none', marginBottom:40, padding:0, width:'100%', letterSpacing:'-0.03em', lineHeight:1.1 }}
                    autoFocus
                  />
                  <div style={{ position:'relative' }}>
                    <textarea 
                      ref={textRef}
                      value={form.content} onChange={set('content')} placeholder="Start writing, or type '/' for commands..." 
                      style={{ flex:1, fontSize:18, lineHeight:1.8, background:'transparent', border:'none', color:'var(--t2)', outline:'none', padding:0, resize:'none', width:'100%', overflow:'hidden', fontFamily:font }}
                    />
                    
                    {slashMenu && (
                      <div className="glass-panel" style={{ position:'absolute', top:(textRef.current?.scrollHeight || 0) + 10, left:0, width:320, background:'var(--s1)', borderRadius:12, border:'1px solid var(--surface-b)', boxShadow:'0 10px 30px rgba(0,0,0,0.3)', padding:8, zIndex:100, animation:'slideUp 200ms ease' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px' }}>
                          <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>AI Commands</div>
                          <div style={{ fontSize:9, color:'var(--t4)', background:'var(--s3)', padding:'2px 6px', borderRadius:4 }}>ESC</div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:2 }}>
                          {slashCommands.map(c => (
                            <button key={c.id} onClick={() => executeSlash(c)} className="card-hover" style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'transparent', border:'none', borderRadius:8, color:'var(--t2)', cursor:'pointer', textAlign:'left', fontSize:13, fontWeight:600 }}>
                              <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--p)' }}>{c.icon}</span>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ animation:'modalFadeIn 300ms ease' }}>
                  <h1 style={{ fontSize:48, fontWeight:900, color:'var(--t1)', marginBottom:40, letterSpacing:'-0.03em', lineHeight:1.1 }}>{form.title || 'Untitled Document'}</h1>
                  <div className="markdown-body" style={{ fontSize:18, lineHeight:1.9, color:'var(--t2)', fontFamily:font }}>
                    {form.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
                    ) : (
                      <span style={{color:'var(--t4)', fontStyle:'italic'}}>No content yet...</span>
                    )}
                  </div>
                  
                  <style>{`
                    .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--t1); margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 800; }
                    .markdown-body h2 { border-bottom: 1px solid var(--surface-b); padding-bottom: 0.3em; }
                    .markdown-body p { margin-bottom: 1em; }
                    .markdown-body ul, .markdown-body ol { padding-left: 1.5em; margin-bottom: 1em; }
                    .markdown-body li { margin-bottom: 0.25em; }
                    .markdown-body code { background: var(--s2); padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: var(--p); }
                    .markdown-body pre code { display: block; padding: 1em; overflow-x: auto; color: var(--t2); background: #0f1115; border: 1px solid var(--surface-b); border-radius: 8px; }
                    .markdown-body blockquote { border-left: 4px solid var(--p); padding-left: 1em; color: var(--t3); margin: 0 0 1em 0; font-style: italic; }
                    .markdown-body a { color: var(--p); text-decoration: none; }
                    .markdown-body a:hover { text-decoration: underline; }
                  `}</style>
                </div>
              )}
            </div>
          </div>

          {/* AI Sidebar */}
          {showSidebar && (
            <div style={{ width:400, background:'var(--s1)', borderLeft:'1px solid var(--surface-b)', display:'flex', flexDirection:'column', overflowY:'auto', flexShrink:0, animation:'slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
              
              <div style={{ padding:'24px', borderBottom:'1px solid var(--surface-b)', background:'linear-gradient(180deg, rgba(124, 58, 237, 0.05) 0%, transparent 100%)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:24, color:'var(--nebula-purple)', fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>
                  <h3 style={{ fontSize:18, fontWeight:800, color:'var(--t1)' }}>Smart Insights</h3>
                </div>
                <p style={{ fontSize:13, color:'var(--t3)' }}>Automatically extracted from your document.</p>
                {aiLoad && <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:10, color:'var(--nebula-purple)', fontSize:13, fontWeight:700 }}><div className="spinner" style={{width:14,height:14,borderWidth:2,borderColor:'var(--nebula-purple)',borderTopColor:'transparent'}}/> Analyzing document...</div>}
              </div>

              {ai && (
                <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:32 }}>
                  
                  {/* Summary */}
                  {ai.summary && (
                    <div>
                      <h4 style={{ fontSize:12, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{fontSize:16}}>psychiatry</span> Executive Summary</h4>
                      <div style={{ padding:'16px', borderRadius:12, background:'var(--s2)', border:'1px solid var(--surface-b)' }}>
                        <p style={{ fontSize:14, color:'var(--t2)', lineHeight:1.6 }}>{ai.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Concepts */}
                  {ai.concepts?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize:12, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{fontSize:16}}>hub</span> Core Concepts</h4>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                        {ai.concepts.map(c=>(
                          <span key={c} style={{ padding:'6px 12px', borderRadius:8, background:'rgba(124, 58, 237, 0.1)', color:'#a78bfa', fontSize:13, fontWeight:700, border:'1px solid rgba(124, 58, 237, 0.2)' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flashcards */}
                  {ai.flashcards?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize:12, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{fontSize:16}}>style</span> Study Flashcards ({ai.flashcards.length})</h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        {ai.flashcards.map((fc,i)=>(
                          <div key={i} className="card-hover" style={{ padding:'16px', borderRadius:12, background:'var(--s2)', border:'1px solid var(--surface-b)', cursor:'pointer' }}>
                            <p style={{ fontSize:13, fontWeight:800, color:'var(--t1)', marginBottom:8, display:'flex', gap:8 }}><span style={{color:'var(--p)'}}>Q.</span> {fc.question||fc.q}</p>
                            <p style={{ fontSize:13, color:'var(--t3)', display:'flex', gap:8, lineHeight:1.5 }}><span style={{color:'var(--t4)', fontWeight:800}}>A.</span> {fc.answer||fc.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function Notes() {
  const { notes, A } = useApp();
  const [search, setSearch] = useState('');
  const [sub,    setSub]    = useState('All');
  const [editing, setEditing] = useState(null);
  const [show,    setShow]    = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  const filtered = useMemo(() => notes.filter(n => {
    const ms = sub==='All' || n.subject===sub;
    const mq = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  }), [notes, search, sub]);

  const save = (note, isAuto = false) => {
    let finalNote = { ...note };
    if (!finalNote.id) {
       // Auto-generate ID immediately so subsequent auto-saves hit update instead of add
       finalNote.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
       A.note.add(finalNote);
       setEditing(finalNote); // Lock it in state
       if(!isAuto) toast.success('Note saved');
    } else {
       A.note.update(finalNote);
       if(!isAuto) toast.success('Note updated');
    }
    
    if (!isAuto) {
      setShow(false); setShowQuick(false); setEditing(null);
    }
  };

  return (
    <div className="page">
      <style>{`
        @keyframes modalCenterIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>
      <div className="fadeup" style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:24,flexWrap:'wrap' }}>
        <div>
          <h1 className="shimmer-text page-title">My Notes</h1>
          <p style={{ fontSize:13,color:'var(--t3)',marginTop:4 }}>{notes.length} notes · {[...new Set(notes.map(n=>n.subject))].length} subjects</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setShowQuick(true)} className="btn btn-surface" style={{ padding:'10px 18px', fontSize:13, fontWeight:700 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--p)' }}>bolt</span>Quick Note
          </button>
          <button onClick={() => { setEditing({}); setShow(true); }} className="btn btn-primary" style={{ padding:'10px 20px', fontSize:13, fontWeight:700 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>edit_document</span>Full Document
          </button>
        </div>
      </div>

      <div className="fadeup d1" style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:18 }}>
        <div style={{ position:'relative' }}>
          <span className="material-symbols-outlined" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'var(--t4)',pointerEvents:'none' }}>search</span>
          <input className="input" style={{ paddingLeft:42 }} placeholder="Search notes…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{ display:'flex',gap:6,overflowX:'auto',paddingBottom:2 }}>
          {ALL_SUBS.map(f => {
            const c = SUBJECT_COLORS[f] || 'var(--p)';
            return (
              <button key={f} onClick={() => setSub(f)} style={{ padding:'6px 15px',borderRadius:999,border:`1px solid ${sub===f?c:'var(--surface-b)'}`,background:sub===f?`${c}14`:'transparent',color:sub===f?c:'var(--t3)',fontWeight:700,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',transition:'all 160ms ease',flexShrink:0 }}>{f}</button>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="tilt-container" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%, 320px), 1fr))',gap:20 }}>
          {filtered.map((n,i) => (
            <div key={n.id} className="fadeup tilt-card" style={{ animationDelay:`${i*0.04}s` }}>
              <NoteCard note={n} onOpen={n=>{setEditing(n);setShow(true);}} onDelete={id=>{A.note.remove(id);toast.success('Deleted');}}/>
            </div>
          ))}
        </div>
      ) : (
        <div className="fadeup" style={{ textAlign:'center',padding:'80px 20px' }}>
          <div className="empty-illust" style={{ fontSize:64,marginBottom:20,display:'inline-block' }}>📓</div>
          <p style={{ fontSize:16,fontWeight:800,color:'var(--t1)' }}>{search?'No matches found':'Your knowledge base is empty'}</p>
          <p style={{ fontSize:13,color:'var(--t4)',marginTop:8 }}>{search?'Try a different search term.':'Capture your first insight and let AI help you master it.'}</p>
          {!search && <button onClick={()=>{setEditing({});setShow(true);}} className="btn btn-primary" style={{ padding:'12px 32px', marginTop:24 }}>Create First Note</button>}
        </div>
      )}

      {show && <NoteEditor note={editing} onSave={save} onClose={()=>{setShow(false);setEditing(null);}}/>}
      {showQuick && <QuickCapture onSave={save} onClose={()=>setShowQuick(false)} />}
    </div>
  );
}
