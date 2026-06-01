import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.bubble.css';

// Register all desired font sizes so Quill can apply/read them
const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = ['10px','11px','12px','13px','14px','15px','18px','20px','22px','24px','28px','32px','36px','42px','48px','60px','72px'];
Quill.register(SizeStyle, true);

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
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:110,background:'var(--overlay)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'modalFadeIn 200ms ease both' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:480,background:'var(--s1)',borderRadius:'var(--r-xl)',boxShadow:'0 32px 120px rgba(0,0,0,0.5), 0 0 0 1px var(--surface-b)',animation:'modalCenterIn 300ms var(--spring) both', overflow:'hidden', display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--surface-b)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'var(--t1)', display:'flex', alignItems:'center', gap:8 }}><span className="material-symbols-outlined" style={{color:'var(--p)', fontSize:18}}>bolt</span> Quick Capture</h3>
          <button onClick={onClose} className="icon-btn" style={{ background:'var(--s2)', border:'none', borderRadius:'50%', width:28, height:28 }}><span className="material-symbols-outlined" style={{ fontSize:15 }}>close</span></button>
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
  const readTime = Math.max(1, Math.ceil(getWordCount(note.content) / 200));

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
          <h4 style={{ fontSize:15, fontWeight:800, color:'var(--t1)', lineHeight:1.3, wordBreak:'break-word' }}>{note.title||'Untitled'}</h4>
          <button onClick={handleDelete} className="icon-btn" style={{ width:28, height:28, opacity:0, transform:'translateX(5px)', transition:'all 200ms ease', background:'var(--s3)', border:'1px solid var(--surface-b)', color:'var(--t4)' }}>
            <span className="material-symbols-outlined" style={{ fontSize:15 }}>delete</span>
          </button>
        </div>
        
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, background:`color-mix(in srgb, ${color} 12%, transparent)`, color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{note.subject}</span>
          {note.aiEnhanced && <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, background:'rgba(96,165,250,0.12)', color:'#3b82f6', border:'1px solid rgba(96,165,250,0.2)', textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{fontSize:12}}>auto_awesome</span> AI</span>}
        </div>

        <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>
          {getCleanPreview(note.content)}
        </p>
        
        {note.tags?.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:16 }}>
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
        .card-hover:hover .icon-btn { opacity: 1 !important; transform: translateX(0) !important; }
        .card-hover:hover .icon-btn:hover { background: var(--danger) !important; color: white !important; border-color: var(--danger) !important; }
      `}</style>
    </div>
  );
}

const convertMarkdownToHtml = (md) => {
  if (!md) return '';
  if (md.trim().startsWith('<') || md.includes('</p>') || md.includes('<br')) return md;
  
  let html = md;
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^\s*-\s*\[\s*\]\s*(.*$)/gim, '<li><input type="checkbox"/> $1</li>');
  html = html.replace(/^\s*-\s*(.*$)/gim, '<li>$1</li>');
  html = html.replace(/\n/g, '<br/>');
  return html;
};

function NoteEditor({ note, onSave, onClose }) {
  const isNew = !note?.id;
  const { videos, tasks, A } = useApp();
  const { isOnline } = useNetwork();
  const [form, setForm] = useState({ 
    title: note?.title || '', 
    content: convertMarkdownToHtml(note?.content || ''), 
    subject: note?.subject || 'Web Dev', 
    tags: note?.tags?.join(', ') || '' 
  });
  const [font, setFont] = useState(note?.font || FONT_OPTIONS[0].value);
  const [fontSize, setFontSizeState] = useState('16');
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false });
  const [ai,  setAi]    = useState(note?.aiEnhanced ? { flashcards:note.flashcards, summary:note.summary, concepts:note.concepts } : null);
  const [aiLoad, setAiLoad] = useState(false);
  const [viewMode, setViewMode] = useState('write'); // 'write' or 'read'
  const [showSidebar, setShowSidebar] = useState(true); // Default to true so they see the workspace right away!
  const [sidebarTab, setSidebarTab] = useState('workflow'); // 'insights' | 'workflow'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const [slashMenu, setSlashMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');
  
  const quillRef = useRef(null);

  const subjectTasks = useMemo(() => {
    return (tasks || []).filter(t => t.status === 'pending' && t.subject === form.subject);
  }, [tasks, form.subject]);

  const subjectVideos = useMemo(() => {
    return (videos || []).filter(v => v.subject === form.subject);
  }, [videos, form.subject]);
  
  // Track Quill selection changes to update active format states
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const handler = () => {
      const range = quill.getSelection();
      if (range) {
        const fmt = quill.getFormat(range);
        setActiveFormats({ bold: !!fmt.bold, italic: !!fmt.italic });
        if (fmt.size) {
          setFontSizeState(fmt.size.replace('px', ''));
        } else {
          setFontSizeState('16');
        }
      }
    };
    quill.on('selection-change', handler);
    return () => quill.off('selection-change', handler);
  }, [viewMode]);

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
  };

  const handleContentChange = (value) => {
    setForm(p => ({ ...p, content: value }));
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const text = quill.getText();
      if (text.trim().endsWith('/')) {
        setSlashMenu(true);
      } else {
        setSlashMenu(false);
      }
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
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);
    if (!range) return;

    // Delete the slash
    quill.deleteText(range.index - 1, 1);
    const insertIndex = range.index - 1;

    if (cmd.action) {
      quill.insertText(insertIndex, cmd.action);
      quill.setSelection(insertIndex + cmd.action.length);
      return;
    }

    if (cmd.id && AI.enabled()) {
      if (!isOnline) {
        toast.error('Connect to the internet to run AI commands 📡');
        return;
      }
      setSaveStatus('Writing...');
      const textContext = quill.getText();
      const result = await inlineComplete(cmd.prompt, textContext);
      if (result) {
        quill.insertText(insertIndex, ' ' + result);
        quill.setSelection(insertIndex + 1 + result.length);
      }
      setSaveStatus('Saved');
    }
  };

  const runAI = async () => {
    if (!isOnline) {
      toast.error('Connect to the internet to run AI Note Enhancement 📡');
      return;
    }
    const rawText = quillRef.current?.getEditor()?.getText() || '';
    if (rawText.length < 50) { toast.error('Write 50+ chars first'); return; }
    if (!AI.enabled()) { toast('Add API key for AI ✦', {icon:'🔑'}); return; }
    setAiLoad(true);
    const r = await enhanceNote(rawText);
    setAiLoad(false);
    if (r) { setAi(r); toast.success('Note enhanced ✦'); }
    else toast.error('AI failed — try again');
  };

  const save = (isAuto = false) => {
    if (!form.title.trim() && !form.content.trim()) return;
    const payload = { ...note, ...form, font, tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean), aiEnhanced:!!ai, flashcards:ai?.flashcards, summary:ai?.summary, concepts:ai?.concepts };
    onSave(payload, isAuto);
  };

  const applyFormat = (formatType) => {
    if (viewMode !== 'write') setViewMode('write');
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    quill.focus();
    const range = quill.getSelection();
    if (range) {
      const currentFormat = quill.getFormat(range);
      const newValue = !currentFormat[formatType];
      quill.format(formatType, newValue);
      setActiveFormats(prev => ({ ...prev, [formatType]: newValue }));
    } else {
      const currentFormat = quill.getFormat();
      const newValue = !currentFormat[formatType];
      quill.format(formatType, newValue);
      setActiveFormats(prev => ({ ...prev, [formatType]: newValue }));
    }
  };

  const applyFontSize = (size) => {
    setFontSizeState(size);
    if (viewMode !== 'write') setViewMode('write');
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    quill.focus();
    const range = quill.getSelection();
    const sizeValue = size === '16' ? false : size + 'px';
    if (range) {
      quill.format('size', sizeValue);
    }
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
    <Portal>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:9999,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',animation:'modalFadeIn 200ms ease both' }}>
        <div onClick={e=>e.stopPropagation()} style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)', overflow:'hidden', position:'relative' }}>
        
        {/* Top Header Bar */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:68,borderBottom:'1px solid var(--surface-b)',background:'var(--s1)',flexShrink:0, zIndex:10 }}>
          
          {/* Left: Nav & Subject */}
          <div style={{ display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
            <button onClick={onClose} className="icon-btn" style={{ background:'var(--s2)', border:'1px solid var(--surface-b)', borderRadius:'10px', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--t2)' }}>arrow_back</span>
            </button>
            <div style={{ width:1, height:20, background:'var(--surface-b)' }} />
            <select value={form.subject} onChange={set('subject')} style={{ background:`color-mix(in srgb, ${subColor} 12%, transparent)`, color:subColor, border:`1px solid color-mix(in srgb, ${subColor} 25%, transparent)`, padding:'0 14px', height:32, borderRadius:999, fontSize:12, fontWeight:700, outline:'none', cursor:'pointer' }}>
              {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          {/* Middle: Toolbar & Status */}
          <div className="editor-middle-toolbar" style={{ display:'flex', alignItems:'center', gap:4, background:'var(--s2)', padding:'4px 12px', borderRadius:12, border:'1px solid var(--surface-b)', height:44 }}>
            <select value={font} onChange={e=>setFont(e.target.value)} style={{ background:'transparent', border:'none', color:'var(--t2)', fontSize:12, fontWeight:700, outline:'none', cursor:'pointer', padding:'0 8px', minWidth: 100 }}>
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value} style={{ background:'var(--s1)', color:'var(--t1)' }}>{f.name}</option>
              ))}
            </select>
            <div style={{ width:1, height:16, background:'var(--surface-b)', margin:'0 4px' }} />
            <select
              value={fontSize}
              onChange={e => applyFontSize(e.target.value)}
              title="Font Size"
              style={{ background:'transparent', border:'none', color:'var(--t2)', fontSize:12, fontWeight:700, outline:'none', cursor:'pointer', padding:'0 4px', width:50, textAlign:'center' }}
            >
              {['10','11','12','13','14','15','16','18','20','22','24','28','32','36','42','48','60','72'].map(s => (
                <option key={s} value={s} style={{ background:'var(--s1)', color:'var(--t1)' }}>{s}</option>
              ))}
            </select>
            <div style={{ width:1, height:16, background:'var(--surface-b)', margin:'0 4px' }} />
            <button
              onClick={()=>applyFormat('bold')}
              title="Bold (Ctrl+B)"
              style={{
                background: activeFormats.bold ? 'var(--p)' : 'transparent',
                border: activeFormats.bold ? 'none' : 'none',
                width:32, height:32, borderRadius:8,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: activeFormats.bold ? '#fff' : 'var(--t2)',
                cursor:'pointer', transition:'all 150ms ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize:18, fontVariationSettings:"'wght' 700" }}>format_bold</span>
            </button>
            <button
              onClick={()=>applyFormat('italic')}
              title="Italic (Ctrl+I)"
              style={{
                background: activeFormats.italic ? 'var(--p)' : 'transparent',
                border: 'none',
                width:32, height:32, borderRadius:8,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: activeFormats.italic ? '#fff' : 'var(--t2)',
                cursor:'pointer', transition:'all 150ms ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>format_italic</span>
            </button>
            <div style={{ width:1, height:16, background:'var(--surface-b)', margin:'0 4px' }} />
            <div style={{ display:'flex', alignItems:'center', gap:12, paddingLeft:4 }}>
              <span style={{ fontSize:10, color:'var(--t4)', fontWeight:800, display:'flex', alignItems:'center', gap:4, letterSpacing:'0.05em' }}>
                {saveStatus === 'Saving...' ? <div className="spinner" style={{width:10,height:10,borderWidth:2,borderColor:'var(--t4)',borderTopColor:'transparent'}}/> : <span className="material-symbols-outlined" style={{fontSize:14,color:'var(--t4)'}}>cloud_done</span>}
                {saveStatus.toUpperCase()}
              </span>
              <span style={{ fontSize:10, color:'var(--t4)', fontWeight:800, letterSpacing:'0.05em' }}>{getWordCount(form.content)} WORDS</span>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
            <div style={{ display:'flex', background:'var(--s2)', borderRadius:12, padding:4, border:'1px solid var(--surface-b)', height:40 }}>
              <button onClick={()=>setViewMode('write')} style={{ padding:'0 16px', borderRadius:8, border:'none', background:viewMode==='write'?'var(--s3)':'transparent', color:viewMode==='write'?'var(--t1)':'var(--t4)', fontWeight:800, fontSize:12, cursor:'pointer', transition:'all 200ms' }}>Edit</button>
              <button onClick={()=>setViewMode('read')} style={{ padding:'0 16px', borderRadius:8, border:'none', background:viewMode==='read'?'var(--s3)':'transparent', color:viewMode==='read'?'var(--t1)':'var(--t4)', fontWeight:800, fontSize:12, cursor:'pointer', transition:'all 200ms' }}>Read</button>
            </div>

            <div style={{ width:1, height:24, background:'var(--surface-b)', margin:'0 2px' }} />

            <button 
              onClick={() => setShowSidebar(!showSidebar)} 
              style={{ 
                height:40, display:'flex', alignItems:'center', gap:8, padding:'0 16px', borderRadius:12, border:'none', 
                background:'linear-gradient(135deg, rgba(9, 205, 131, 0.1), rgba(124, 58, 237, 0.1))', color:'var(--t1)', 
                fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:'inset 0 0 0 1px rgba(9, 205, 131, 0.2)', 
                transition:'all 240ms var(--ease)'
              }}
              onMouseOver={e=>e.currentTarget.style.background='linear-gradient(135deg, rgba(9, 205, 131, 0.15), rgba(124, 58, 237, 0.15))'}
              onMouseOut={e=>e.currentTarget.style.background='linear-gradient(135deg, rgba(9, 205, 131, 0.1), rgba(124, 58, 237, 0.1))'}
            >
              <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>
                {showSidebar ? 'right_panel_close' : 'grid_view'}
              </span>
              {showSidebar ? 'Hide' : 'Workflow Hub'}
            </button>

            <button 
              onClick={() => save()} 
              style={{ 
                height:40, padding:'0 24px', borderRadius:12, 
                background: `linear-gradient(135deg, ${subColor}, color-mix(in srgb, ${subColor} 70%, black))`, 
                border:'none', fontSize:13, fontWeight:900, color:'#00150a', cursor:'pointer', 
                transition:'all 240ms var(--bounce)', display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 4px 15px color-mix(in srgb, ${subColor} 25%, transparent)`
              }}
              onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.filter='brightness(1.1)'}}
              onMouseOut={e=>{e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'}}
            >
              Done
            </button>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>
          
          {/* Document Editor (Center) */}
          <div style={{ flex:1, overflowY:'auto', display:'flex', justifyContent:'center', paddingBottom:120, position:'relative' }}>
            <div className="editor-inner-container" style={{ width:'100%', maxWidth:800, padding:'60px 40px', position:'relative' }}>
              {viewMode === 'write' ? (
                <>
                  <input 
                    className="editor-title-input"
                    value={form.title} onChange={set('title')} placeholder="Document Title" 
                    style={{ fontSize:48, fontWeight:900, background:'transparent', border:'none', color:'var(--t1)', outline:'none', marginBottom:40, padding:0, width:'100%', letterSpacing:'-0.03em', lineHeight:1.1 }}
                    autoFocus
                  />
                  <div style={{ position:'relative' }}>
                    <ReactQuill 
                      ref={quillRef}
                      value={form.content} 
                      onChange={handleContentChange} 
                      placeholder="Start writing, or type '/' for commands..." 
                      theme="bubble"
                      modules={{ toolbar: false }}
                      style={{ flex:1, width:'100%', overflow:'hidden' }}
                    />
                    
                    <style>{`
                      .ql-container {
                        font-family: ${font} !important;
                        font-size: 18px !important;
                      }
                      .ql-editor {
                        padding: 0 !important;
                        line-height: 1.8 !important;
                        color: var(--t2) !important;
                        min-height: 300px;
                      }
                      .ql-editor.ql-blank::before {
                        left: 0 !important;
                        right: 0 !important;
                        color: var(--t4) !important;
                        font-style: normal !important;
                      }
                      .ql-editor strong {
                        font-weight: 700;
                      }
                      .ql-editor em {
                        font-style: italic;
                      }
                    `}</style>
                    
                    {slashMenu && (
                      <div className="glass-panel" style={{ position:'absolute', top:'100%', left:0, width:320, background:'var(--s1)', borderRadius:12, border:'1px solid var(--surface-b)', boxShadow:'0 10px 30px rgba(0,0,0,0.3)', padding:8, zIndex:100, animation:'slideUp 200ms ease' }}>
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
                  <div className="ql-editor" style={{ fontSize:18, lineHeight:1.9, color:'var(--t2)', fontFamily:font, padding:0 }} dangerouslySetInnerHTML={{ __html: form.content || '<span style="color:var(--t4); font-style:italic">No content yet...</span>' }} />
                  
                  <style>{`
                    .ql-editor h1, .ql-editor h2, .ql-editor h3 { color: var(--t1); margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 800; }
                    .ql-editor h2 { border-bottom: 1px solid var(--surface-b); padding-bottom: 0.3em; }
                    .ql-editor p { margin-bottom: 1em; }
                    .ql-editor ul, .ql-editor ol { padding-left: 1.5em; margin-bottom: 1em; }
                    .ql-editor li { margin-bottom: 0.25em; }
                    .ql-editor code { background: var(--s2); padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: var(--p); }
                    .ql-editor pre code { display: block; padding: 1em; overflow-x: auto; color: var(--t2); background: #0f1115; border: 1px solid var(--surface-b); border-radius: 8px; }
                    .ql-editor blockquote { border-left: 4px solid var(--p); padding-left: 1em; color: var(--t3); margin: 0 0 1em 0; font-style: italic; }
                    .ql-editor a { color: var(--p); text-decoration: none; }
                    .ql-editor a:hover { text-decoration: underline; }
                    .ql-editor strong { font-weight: 700; }
                    .ql-editor em { font-style: italic; }
                  `}</style>
                </div>
              )}
            </div>
          </div>

          {/* Workspace / Workflow Sidebar */}
          {showSidebar && (
            <div className="editor-sidebar" style={{ width:400, background:'var(--s1)', borderLeft:'1px solid var(--surface-b)', display:'flex', flexDirection:'column', flexShrink:0, animation:'slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
              
              {/* Sidebar Tabs */}
              <div style={{ display:'flex', borderBottom:'1px solid var(--surface-b)', background:'var(--s2)', padding:'12px 16px 0', gap:8, flexShrink:0 }}>
                <button 
                  onClick={() => setSidebarTab('workflow')} 
                  style={{ 
                    flex:1, padding:'10px 8px', border:'none', borderTopLeftRadius:8, borderTopRightRadius:8,
                    background: sidebarTab === 'workflow' ? 'var(--s1)' : 'transparent',
                    color: sidebarTab === 'workflow' ? 'var(--p)' : 'var(--t4)', 
                    borderBottom: sidebarTab === 'workflow' ? '2px solid var(--p)' : 'none',
                    fontWeight: 800, fontSize: 12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize:16 }}>hub</span> Workflow Hub
                </button>
                <button 
                  onClick={() => setSidebarTab('insights')} 
                  style={{ 
                    flex:1, padding:'10px 8px', border:'none', borderTopLeftRadius:8, borderTopRightRadius:8,
                    background: sidebarTab === 'insights' ? 'var(--s1)' : 'transparent',
                    color: sidebarTab === 'insights' ? 'var(--p)' : 'var(--t4)', 
                    borderBottom: sidebarTab === 'insights' ? '2px solid var(--p)' : 'none',
                    fontWeight: 800, fontSize: 12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize:16 }}>auto_awesome</span> Smart AI
                </button>
              </div>

              {/* Active Sidebar Video Player */}
              {activeVideo && (
                <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--surface-b)', background:'rgba(0,0,0,0.2)', flexShrink:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:10, fontWeight:800, color:'var(--p)', textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{ fontSize:12 }}>play_circle</span> PIP Player</span>
                    <button onClick={() => setActiveVideo(null)} style={{ background:'transparent', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:13 }}>close</span> Stop
                    </button>
                  </div>
                  <div style={{ position:'relative', paddingTop:'56.25%', borderRadius:12, overflow:'hidden', border:'1px solid var(--surface-b)', background:'#000' }}>
                    {activeVideo.info.type === 'youtube' && (
                      <iframe src={`https://www.youtube.com/embed/${activeVideo.info.id}?autoplay=1`} title={activeVideo.title}
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
                    )}
                    {activeVideo.info.type === 'drive' && (
                      <iframe src={activeVideo.info.embedUrl} title={activeVideo.title}
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }}
                        allow="autoplay; fullscreen" allowFullScreen/>
                    )}
                    {(activeVideo.info.type === 'local' || activeVideo.info.type === 'direct') && (
                      <video src={activeVideo.info.id} controls autoPlay style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none', outline:'none' }} />
                    )}
                  </div>
                  <div style={{ fontSize:11.5, fontWeight:700, color:'var(--t2)', marginTop:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeVideo.title}</div>
                </div>
              )}

              {/* Scrollable Sidebar Content */}
              <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
                {sidebarTab === 'workflow' ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                    
                    {/* Action Panel */}
                    <div>
                      <h4 style={{ fontSize:11, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{ fontSize:15, color:'var(--p)' }}>bolt</span> Fast Actions</h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <button 
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            A.schedule.add({
                              subject: form.subject,
                              topic: `Review notes: ${form.title || 'Untitled note'}`,
                              startTime: '10:00',
                              durationMinutes: 45,
                              day: tomorrow.toISOString().slice(0, 10)
                            });
                            toast.success(`Scheduled 45m study session for tomorrow! 📅`);
                          }}
                          style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--surface-b)', background:'var(--s2)', color:'var(--t2)', fontSize:12.5, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--p)'}
                          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--surface-b)'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize:16, color:'#fb923c' }}>event</span>
                          Schedule Study Block Tomorrow
                        </button>
                      </div>
                    </div>

                    {/* Active Tasks list */}
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                        <h4 style={{ fontSize:11, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{ fontSize:15, color:'var(--p)' }}>checklist</span> {form.subject} Tasks ({subjectTasks.length})</h4>
                      </div>
                      
                      {/* Inline task creator */}
                      <form onSubmit={e => {
                        e.preventDefault();
                        if (!newTaskTitle.trim()) return;
                        A.task.add({ title: newTaskTitle.trim(), subject: form.subject, priority: 'medium' });
                        toast.success('Task added! ✅');
                        setNewTaskTitle('');
                      }} style={{ display:'flex', gap:6, marginBottom:10 }}>
                        <input 
                          className="input" 
                          placeholder="Quick add subject task..." 
                          value={newTaskTitle} 
                          onChange={e => setNewTaskTitle(e.target.value)} 
                          style={{ height:32, fontSize:12, padding:'0 10px', background:'var(--s2)' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding:'0 12px', height:32, fontSize:12 }}><span className="material-symbols-outlined" style={{ fontSize:16 }}>add</span></button>
                      </form>

                      {subjectTasks.length > 0 ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {subjectTasks.map(t => (
                            <div key={t.id} style={{ display:'flex', alignItems:'center', justifyItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--s2)', border:'1px solid var(--surface-b)' }}>
                              <button 
                                onClick={() => {
                                  A.task.done(t.id);
                                  toast.success('Task completed! 🎉');
                                }} 
                                style={{ width:18, height:18, borderRadius:999, border:'2px solid var(--t4)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0 }}
                                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--p)'}
                                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--t4)'}
                              />
                              <span style={{ fontSize:12.5, color:'var(--t2)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{t.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding:'12px', background:'var(--s2)', borderRadius:10, border:'1px dashed var(--surface-b)', textAlign:'center', fontSize:12, color:'var(--t4)' }}>
                          No pending tasks for {form.subject}
                        </div>
                      )}
                    </div>

                    {/* Related Videos */}
                    <div>
                      <h4 style={{ fontSize:11, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{ fontSize:15, color:'var(--p)' }}>smart_display</span> Subject Videos ({subjectVideos.length})</h4>
                      {subjectVideos.length > 0 ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {subjectVideos.map(v => (
                            <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px', borderRadius:12, background:'var(--s2)', border:'1px solid var(--surface-b)' }}>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12, fontWeight:750, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.title}</div>
                                <div style={{ fontSize:10, color:'var(--t4)', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                                  {v.watched ? <span style={{ color:'#10b981', display:'flex', alignItems:'center', gap:2 }}><span className="material-symbols-outlined" style={{ fontSize:10, fontVariationSettings:"'FILL' 1" }}>check_circle</span> Watched</span> : 'In queue'}
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const info = extractVideoInfo(v.url);
                                  if (info) {
                                    setActiveVideo({ ...v, info });
                                    toast.success('Loaded video to side panel!');
                                  } else {
                                    toast.error('Invalid video URL');
                                  }
                                }} 
                                style={{ width:28, height:28, borderRadius:8, background:'var(--s3)', border:'1px solid var(--surface-b)', color:'var(--p)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                                title="Play video inside sidebar"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize:16, fontVariationSettings:"'FILL' 1" }}>play_arrow</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding:'12px', background:'var(--s2)', borderRadius:10, border:'1px dashed var(--surface-b)', textAlign:'center', fontSize:12, color:'var(--t4)' }}>
                          No videos saved for {form.subject}
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                    
                    {!ai && (
                      <div style={{ textAlign:'center', padding:'20px 10px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:32, color:'var(--nebula-purple)', marginBottom:12 }}>auto_awesome</span>
                        <p style={{ fontSize:13, fontWeight:800, color:'var(--t1)' }}>No Insights Generated</p>
                        <p style={{ fontSize:12, color:'var(--t4)', marginTop:6, marginBottom:16, lineHeight:1.5 }}>Let Aura AI analyze your document to generate study flashcards, summary and concept maps.</p>
                        {!isOnline ? (
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.18)', color: '#fb923c', fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>wifi_off</span>
                            Aura AI is offline. Connect to the internet to run analysis.
                          </div>
                        ) : (
                          <button 
                            onClick={runAI} 
                            disabled={aiLoad}
                            className="btn btn-primary" 
                            style={{ width:'100%', height:36, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'linear-gradient(135deg, #7c3aed, #06b6d4)', border:'none' }}
                          >
                            {aiLoad ? <div className="spinner" style={{ width:14,height:14,borderWidth:2,borderColor:'#fff',borderTopColor:'transparent' }}/> : <><span className="material-symbols-outlined" style={{ fontSize:16 }}>bolt</span> Analyze Note</>}
                          </button>
                        )}
                      </div>
                    )}

                    {ai && (
                      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                        {/* Summary */}
                        {ai.summary && (
                          <div>
                            <h4 style={{ fontSize:11, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{fontSize:14}}>psychiatry</span> Summary</h4>
                            <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--s2)', border:'1px solid var(--surface-b)' }}>
                              <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.55 }}>{ai.summary}</p>
                            </div>
                          </div>
                        )}

                        {/* Concepts */}
                        {ai.concepts?.length > 0 && (
                          <div>
                            <h4 style={{ fontSize:11, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{fontSize:14}}>hub</span> Core Concepts</h4>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                              {ai.concepts.map(c=>(
                                <span key={c} style={{ padding:'5px 10px', borderRadius:6, background:'rgba(124, 58, 237, 0.08)', color:'#a78bfa', fontSize:12, fontWeight:700, border:'1px solid rgba(124, 58, 237, 0.15)' }}>{c}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Flashcards */}
                        {ai.flashcards?.length > 0 && (
                          <div>
                            <h4 style={{ fontSize:11, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><span className="material-symbols-outlined" style={{fontSize:14}}>style</span> Flashcards ({ai.flashcards.length})</h4>
                            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                              {ai.flashcards.map((fc,i)=>(
                                <div key={i} className="card-hover" style={{ padding:'12px 14px', borderRadius:10, background:'var(--s2)', border:'1px solid var(--surface-b)' }}>
                                  <p style={{ fontSize:12.5, fontWeight:800, color:'var(--t1)', marginBottom:6, display:'flex', gap:6 }}><span style={{color:'var(--p)'}}>Q.</span> {fc.question||fc.q}</p>
                                  <p style={{ fontSize:12.5, color:'var(--t3)', display:'flex', gap:6, lineHeight:1.45 }}><span style={{color:'var(--t4)', fontWeight:800}}>A.</span> {fc.answer||fc.a}</p>
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
          )}

        </div>
      </div>
    </div>
    </Portal>
  );
}

export default function Notes() {
  const { notes, A } = useApp();
  const [search, setSearch] = useState('');
  const [sub,    setSub]    = useState('All');
  
  // Persistent active note states across reloads using synchronous lazy initializers
  const [editing, setEditing] = useState(() => {
    const savedId = localStorage.getItem('los_active_note_id');
    const savedShow = localStorage.getItem('los_show_note_editor') === 'true';
    if (savedShow && savedId) {
      if (savedId === 'new_note') {
        const draft = localStorage.getItem('los_note_draft');
        try {
          return draft ? JSON.parse(draft) : {};
        } catch (e) {
          return {};
        }
      } else {
        const found = notes.find(n => n.id === savedId);
        if (found) return found;
      }
    }
    return null;
  });

  const [show, setShow] = useState(() => {
    const savedId = localStorage.getItem('los_active_note_id');
    const savedShow = localStorage.getItem('los_show_note_editor') === 'true';
    if (savedShow && savedId) {
      if (savedId === 'new_note') return true;
      return notes.some(n => n.id === savedId);
    }
    return false;
  });

  const [showQuick, setShowQuick] = useState(false);
  const isInitialMount = useRef(true);

  // Sync state changes to localStorage (skipping initial mount run to prevent race key wipe)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (show && editing) {
      localStorage.setItem('los_show_note_editor', 'true');
      localStorage.setItem('los_active_note_id', editing.id || 'new_note');
      if (!editing.id) {
        localStorage.setItem('los_note_draft', JSON.stringify(editing));
      }
    } else {
      localStorage.removeItem('los_show_note_editor');
      localStorage.removeItem('los_active_note_id');
      localStorage.removeItem('los_note_draft');
    }
  }, [show, editing]);

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
      <div className="fadeup" style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
        <div>
          <h1 className="shimmer-text page-title">My Notes</h1>
          <p style={{ fontSize:13,color:'var(--t3)',marginTop:4 }}>{notes.length} notes · {[...new Set(notes.map(n=>n.subject))].length} subjects</p>
        </div>
        <div style={{ display:'flex', gap:'var(--gap-sm)' }}>
          <button onClick={() => setShowQuick(true)} className="btn btn-surface" style={{ padding:'10px 18px', fontSize:13, fontWeight:700 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--p)' }}>bolt</span>Quick Note
          </button>
          <button onClick={() => { setEditing({}); setShow(true); }} className="btn btn-primary" style={{ padding:'10px 20px', fontSize:13, fontWeight:700 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>edit_document</span>Full Document
          </button>
        </div>
      </div>

      <div className="fadeup d1" style={{ display:'flex',flexDirection:'column',gap:'var(--gap-sm)' }}>
        <div style={{ position:'relative' }}>
          <span className="material-symbols-outlined" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'var(--t4)',pointerEvents:'none' }}>search</span>
          <input className="input" style={{ paddingLeft:42 }} placeholder="Search notes…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{ display:'flex',gap:'var(--gap-xs)',overflowX:'auto',paddingBottom:2 }}>
          {ALL_SUBS.map(f => {
            const c = SUBJECT_COLORS[f] || 'var(--p)';
            return (
              <button key={f} onClick={() => setSub(f)} style={{ padding:'6px 15px',borderRadius:999,border:`1px solid ${sub===f?c:'var(--surface-b)'}`,background:sub===f?`${c}14`:'transparent',color:sub===f?c:'var(--t3)',fontWeight:700,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',transition:'all 160ms ease',flexShrink:0 }}>{f}</button>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="tilt-container" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%, 320px), 1fr))',gap:'var(--gap-card)' }}>
          {filtered.map((n,i) => (
            <div key={n.id} className="fadeup tilt-card" style={{ animationDelay:`${i*0.04}s` }}>
              <NoteCard note={n} onOpen={n=>{setEditing(n);setShow(true);}} onDelete={id=>{A.note.remove(id);toast.success('Deleted');}}/>
            </div>
          ))}
        </div>
      ) : (
        <div className="fadeup" style={{ textAlign:'center',padding:'80px 20px' }}>
          <div className="empty-illust" style={{ fontSize:64,marginBottom:20,display:'inline-block' }}>📓</div>
          <p style={{ fontSize:15,fontWeight:800,color:'var(--t1)' }}>{search?'No matches found':'Your knowledge base is empty'}</p>
          <p style={{ fontSize:13,color:'var(--t4)',marginTop:8 }}>{search?'Try a different search term.':'Capture your first insight and let AI help you master it.'}</p>
          {!search && <button onClick={()=>{setEditing({});setShow(true);}} className="btn btn-primary" style={{ padding:'12px 32px', marginTop:24 }}>Create First Note</button>}
        </div>
      )}

      {show && <NoteEditor note={editing} onSave={save} onClose={()=>{setShow(false);setEditing(null);}}/>}
      {showQuick && <QuickCapture onSave={save} onClose={()=>setShowQuick(false)} />}
    </div>
  );
}
