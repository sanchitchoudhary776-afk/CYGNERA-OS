import { useState, useMemo, useRef } from 'react';
import { useApp }   from '@context/AppContext';
import { summarizeVideo, AI } from '@services/ai';
import { SUBJECT_COLORS, SUBJECTS, fmt } from '@utils';
import toast from 'react-hot-toast';
import { usePremium, Counter } from '@components/ui/PremiumUI';

function extractVideoInfo(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^#&?]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (driveMatch) return { type: 'drive', id: driveMatch[1], embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  if (url.startsWith('blob:')) return { type: 'local', id: url };
  return { type: 'direct', id: url };
}

// ── Add Modal ─────────────────────────────────
function AddModal({ onClose, onSave, existingPlaylists }) {
  const [tab, setTab] = useState('link'); // 'link' | 'local'
  const [url,     setUrl]     = useState('');
  const [file,    setFile]    = useState(null);
  const [title,   setTitle]   = useState('');
  const [subject, setSubject] = useState('Web Dev');
  const [playlist, setPlaylist] = useState('');
  const [notes,   setNotes]   = useState('');
  const [transcript, setTranscript] = useState('');
  const [preview, setPreview] = useState(null);
  const [err,     setErr]     = useState('');

  const handleUrl = v => {
    setUrl(v); setErr('');
    const info = extractVideoInfo(v);
    if (info?.type === 'youtube') setPreview(`https://img.youtube.com/vi/${info.id}/mqdefault.jpg`);
    else if (info?.type === 'drive') setPreview('https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png');
    else setPreview(null);
  };

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, ""));
    const objectUrl = URL.createObjectURL(f);
    setUrl(objectUrl);
    setPreview('local');
  };

  const submit = () => {
    if (!url.trim())   { toast.error(tab==='link' ? 'Add a URL' : 'Select a video file'); return; }
    if (!title.trim()) { toast.error('Add a title'); return; }
    
    onSave({ url, title, subject, playlist: playlist.trim(), notes, transcript, watched:false, addedAt: new Date().toISOString() });
    onClose();
    toast.success('Video added to library! 🎬');
  };

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',background:'var(--overlay)',animation:'modalFadeIn 220ms ease both' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:520,maxHeight:'90vh',display:'flex',flexDirection:'column',background:'var(--s2)',border:'1px solid var(--card-b-h)',borderRadius:'var(--r-xl)',boxShadow:'var(--modal-sh)',animation:'scaleIn 340ms var(--bounce) both' }}>
        
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px',borderBottom:'1px solid rgba(9,205,131,0.07)',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18,color:'#ff6b6b',fontVariationSettings:"'FILL' 1" }}>video_library</span>
            <span style={{ fontSize:16,fontWeight:800,color:'var(--t1)' }}>Add Video to Library</span>
          </div>
          <button onClick={onClose} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize:20 }}>close</span></button>
        </div>

        {/* Source Tabs */}
        <div style={{ display:'flex', padding:'16px 20px 0' }}>
          <div style={{ display:'flex', gap:4, background:'var(--s1)', padding:4, borderRadius:'var(--r-md)', width:'100%' }}>
            <button onClick={()=>{setTab('link'); setUrl(''); setFile(null); setPreview(null); setTitle('');}} style={{ flex:1, padding:'8px', borderRadius:'var(--r-sm)', background:tab==='link'?'var(--s3)':'transparent', border:'none', color:tab==='link'?'var(--t1)':'var(--t3)', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all 0.2s' }}>
              <span className="material-symbols-outlined" style={{ fontSize:16 }}>link</span> Web Link / Drive
            </button>
            <button onClick={()=>{setTab('local'); setUrl(''); setFile(null); setPreview(null); setTitle('');}} style={{ flex:1, padding:'8px', borderRadius:'var(--r-sm)', background:tab==='local'?'var(--s3)':'transparent', border:'none', color:tab==='local'?'var(--t1)':'var(--t3)', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all 0.2s' }}>
              <span className="material-symbols-outlined" style={{ fontSize:16 }}>folder_open</span> Local File
            </button>
          </div>
        </div>

        <div style={{ padding:'18px 20px',display:'flex',flexDirection:'column',gap:14,overflowY:'auto' }}>
          
          {tab === 'link' ? (
            <div>
              <label className="label">Video URL (YouTube, Google Drive, MP4)</label>
              <input className="input" placeholder="https://..." value={url} onChange={e=>handleUrl(e.target.value)}/>
              {err && <p style={{ fontSize:11,color:'var(--danger)',marginTop:4 }}>{err}</p>}
            </div>
          ) : (
            <div>
              <label className="label">Select Video from Device</label>
              <div style={{ position:'relative', padding:'20px', border:'2px dashed var(--p-border)', borderRadius:'var(--r-md)', background:'var(--s1)', textAlign:'center', cursor:'pointer' }} onClick={()=>document.getElementById('fileUpload').click()}>
                <span className="material-symbols-outlined" style={{ fontSize:32, color:'var(--p)', marginBottom:8 }}>upload_file</span>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{file ? file.name : 'Click to select a video file'}</p>
                <p style={{ fontSize:11, color:'var(--t4)', marginTop:4 }}>Will play instantly within the app. (Session only)</p>
                <input id="fileUpload" type="file" accept="video/*" onChange={handleFile} style={{ display:'none' }}/>
              </div>
            </div>
          )}

          {preview && preview !== 'local' && preview !== 'direct' && (
            <div style={{ borderRadius:'var(--r-md)',overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)',aspectRatio:'16/9',background:'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {preview.includes('wikimedia') ? (
                 <img src={preview} alt="Drive" style={{ width:'64px', opacity:0.8 }}/>
              ) : (
                 <img src={preview} alt="thumbnail" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
              )}
            </div>
          )}

          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="Video title…" value={title} onChange={e=>setTitle(e.target.value)}/>
          </div>

          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <label className="label">Subject</label>
              <select className="input" value={subject} onChange={e=>setSubject(e.target.value)}>
                {SUBJECTS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label className="label">Custom Playlist (Optional)</label>
              <input className="input" list="playlists" placeholder="e.g. Masterclass" value={playlist} onChange={e=>setPlaylist(e.target.value)}/>
              <datalist id="playlists">
                {existingPlaylists.map(p => <option key={p} value={p}/>)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} placeholder="What you want to learn…" value={notes} onChange={e=>setNotes(e.target.value)} style={{ resize:'none' }}/>
          </div>
          <div>
            <label className="label">Full Transcript (optional · for AI Summary)</label>
            <textarea className="input" rows={3} placeholder="Paste transcript here to enable full AI summarization…" value={transcript} onChange={e=>setTranscript(e.target.value)} style={{ resize:'none', fontSize:11 }}/>
          </div>
        </div>
        <div style={{ display:'flex',gap:10,padding:'14px 20px',borderTop:'1px solid rgba(9,205,131,0.07)',paddingBottom:'max(14px,env(safe-area-inset-bottom))' }}>
          <button onClick={onClose} className="btn btn-surface" style={{ padding:'11px 20px' }}>Cancel</button>
          <button onClick={submit} className="btn btn-primary" style={{ flex:1,padding:'11px' }}>
            <span className="material-symbols-outlined" style={{ fontSize:17 }}>add_circle</span> Add to Library
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Guide Modal ────────────────────────────
function AISummaryModal({ video, onClose }) {
  const [data, setData] = useState(video.aiGuide || null);
  const [loading, setLoading] = useState(false);

  const runAI = async () => {
    if (!AI.enabled()) { toast('Add API key for AI ✦', {icon:'🔑'}); return; }
    setLoading(true);
    const r = await summarizeVideo(video.title, video.subject, video.transcript, video.notes);
    setLoading(false);
    if (r) setData(r);
    else toast.error('AI failed to generate guide');
  };

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',background:'rgba(0,0,0,0.85)',animation:'modalFadeIn 300ms ease-out both' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:560,height:'min(800px, 92dvh)',background:'var(--s2)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:32,boxShadow:'0 30px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',display:'flex',flexDirection:'column',overflow:'hidden',animation:'scaleIn 400ms cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'24px 28px',borderBottom:'1px solid rgba(255,255,255,0.04)',background:'rgba(139,92,246,0.04)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:16 }}>
            <div style={{ width:44,height:44,borderRadius:14,background:'linear-gradient(135deg, #8b5cf6, #6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 16px rgba(139,92,246,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:22,color:'#fff',fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>
            </div>
            <div>
              <span style={{ fontSize:17,fontWeight:900,color:'var(--t1)',display:'block',letterSpacing:'-0.02em' }}>Aura Intelligence</span>
              <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:3 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px #10b981' }}></span>
                <span style={{ fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em' }}>AI Summarization Active</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" style={{ background:'rgba(255,255,255,0.03)',width:36,height:36,borderRadius:12,border:'1px solid rgba(255,255,255,0.05)' }}><span className="material-symbols-outlined" style={{ fontSize:20 }}>close</span></button>
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:'32px',WebkitOverflowScrolling:'touch',scrollbarWidth:'none' }}>
          {!data ? (
            <div style={{ textAlign:'center',padding:'60px 20px' }}>
              <div style={{ width:84,height:84,borderRadius:24,background:'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.02))',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 28px',transform:'rotate(-4deg)',border:'1px solid rgba(139,92,246,0.1)' }}>
                <span className="material-symbols-outlined" style={{ fontSize:42,color:'#8b5cf6',animation:loading?'pulse 1.5s infinite':'' }}>smart_display</span>
              </div>
              <h3 style={{ fontSize:24,fontWeight:900,color:'var(--t1)',marginBottom:14,letterSpacing:'-0.03em' }}>Unlock Study Insights</h3>
              <p style={{ fontSize:15,color:'var(--t4)',lineHeight:1.6,marginBottom:40,maxWidth:360,marginInline:'auto' }}>
                {video.transcript 
                  ? "We'll perform a deep analysis of the transcript to generate a structured study roadmap for you." 
                  : "No transcript found, but Aura can still predict the core learning outcomes from the title."}
              </p>
              <button onClick={runAI} disabled={loading} className="btn btn-primary" style={{ width:'100%',maxWidth:300,padding:'16px',background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',border:'none',boxShadow:'0 12px 30px rgba(139,92,246,0.3)',fontWeight:800,fontSize:14,gap:12,borderRadius:16 }}>
                {loading ? <div className="spinner" style={{ width:20,height:20,borderWidth:3 }}/> : <><span className="material-symbols-outlined" style={{ fontSize:20 }}>bolt</span> Generate Guide</>}
              </button>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:40, paddingBottom:60 }}>
              {/* Summary Section */}
              <section>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:20,color:'#8b5cf6' }}>article</span>
                    <label style={{ fontSize:12,fontWeight:900,color:'var(--t1)',textTransform:'uppercase',letterSpacing:'0.06em' }}>Executive Summary</label>
                  </div>
                  <span style={{ fontSize:10,fontWeight:800,color:'#8b5cf6',padding:'4px 10px',background:'rgba(139,92,246,0.1)',borderRadius:6 }}>CORE CONTENT</span>
                </div>
                <div style={{ position:'relative',padding:'20px',borderRadius:20,background:'var(--s3)',border:'1px solid rgba(255,255,255,0.04)',boxShadow:'0 4px 20px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize:15,color:'var(--t2)',lineHeight:1.75,fontWeight:500 }}>{data.summary}</p>
                </div>
              </section>

              {/* Concepts Section */}
              <section>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:20,color:'#8b5cf6' }}>layers</span>
                  <label style={{ fontSize:12,fontWeight:900,color:'var(--t1)',textTransform:'uppercase',letterSpacing:'0.06em' }}>Knowledge Architecture</label>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))',gap:10 }}>
                  {data.concepts?.map((c,i)=>(
                    <div key={i} style={{ padding:'12px 16px',borderRadius:14,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',fontSize:13,color:'var(--t2)',fontWeight:700,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>{c}</div>
                  ))}
                </div>
              </section>

              {/* Questions Section */}
              <section>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:20,color:'#8b5cf6' }}>psychology</span>
                  <label style={{ fontSize:12,fontWeight:900,color:'var(--t1)',textTransform:'uppercase',letterSpacing:'0.06em' }}>Mental Simulations</label>
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
                  {data.questions?.map((q,i)=>(
                    <div key={i} style={{ display:'flex',gap:18,padding:'20px',background:'var(--s3)',borderRadius:20,border:'1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ width:30,height:30,borderRadius:10,background:'linear-gradient(135deg, #8b5cf6, #7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 10px rgba(139,92,246,0.2)' }}>
                        <span style={{ fontSize:13,fontWeight:900,color:'#fff' }}>{i+1}</span>
                      </div>
                      <p style={{ fontSize:14,color:'var(--t2)',fontWeight:600,lineHeight:1.6 }}>{q}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Takeaway Section */}
              <section style={{ padding:'24px',borderRadius:24,background:'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))',border:'1px solid rgba(139,92,246,0.2)',position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',bottom:-20,right:-20,fontSize:120,opacity:0.03,color:'#8b5cf6',transform:'rotate(-15deg)' }} className="material-symbols-outlined">auto_awesome</div>
                <div style={{ display:'flex',gap:16,alignItems:'flex-start',position:'relative',zIndex:1 }}>
                  <div style={{ width:48,height:48,borderRadius:16,background:'#8b5cf6',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 10px 20px rgba(139,92,246,0.4)',flexShrink:0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:24,color:'#fff' }}>verified</span>
                  </div>
                  <div>
                    <p style={{ fontSize:11,fontWeight:900,color:'#8b5cf6',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6 }}>Master Insight</p>
                    <p style={{ fontSize:16,color:'var(--t1)',fontWeight:900,lineHeight:1.5,letterSpacing:'-0.01em' }}>{data.takeaway}</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
        <div style={{ padding:'16px 32px',background:'rgba(255,255,255,0.02)',borderTop:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
          <span className="material-symbols-outlined" style={{ fontSize:14,color:'var(--t4)' }}>verified_user</span>
          <p style={{ fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.1em' }}>Encrypted Intelligence Protocol · Google Cloud</p>
        </div>
      </div>
    </div>
  );
}

// ── Video Card ─────────────────────────────────
function VideoCard({ video, onToggle, onNote, onDelete }) {
  const [editNote,   setEditNote]   = useState(false);
  const [note,       setNote]       = useState(video.notes||'');
  const [showPlayer, setShowPlayer] = useState(false);
  const [showAI,     setShowAI]     = useState(false);
  const [imgError,   setImgError]   = useState(false);
  const { askConfirm } = usePremium();
  const color = SUBJECT_COLORS[video.subject]||'var(--p)';
  
  const info = extractVideoInfo(video.url);
  const thumb = info?.type === 'youtube' ? `https://img.youtube.com/vi/${info.id}/mqdefault.jpg` : 
                info?.type === 'drive' ? 'https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png' : null;

  const handleDelete = async () => {
    if (await askConfirm('Delete Video', `Remove "${video.title}" from your library?`)) {
      onDelete(video.id);
    }
  };

  return (
    <div className="card" style={{ padding:0,overflow:'hidden', display:'flex', flexDirection:'column', width:'100%', height:'100%' }}>
      {/* Thumbnail */}
      <div style={{ position:'relative',aspectRatio:'16/9',background:'var(--s3)',cursor:'pointer',overflow:'hidden',flexShrink:0 }} onClick={()=>setShowPlayer(true)}>
        
        {/* Placeholder (Always rendered but positioned behind or shown on error) */}
        <div style={{ position:'absolute',inset:0,display:(!thumb || imgError)?'flex':'none',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg, var(--s2), var(--s3))', zIndex:0 }}>
          <span className="material-symbols-outlined" style={{ fontSize:40,color:info?.type==='local'?'var(--p)':'var(--s5)' }}>{info?.type==='local'?'movie':'smart_display'}</span>
          {info?.type==='local' && <span style={{ fontSize:11, color:'var(--t4)', marginTop:6, fontWeight:700 }}>Local File</span>}
        </div>

        {thumb && !imgError && (
          <img src={thumb} alt={video.title} 
            style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:info?.type==='drive'?'contain':'cover',transition:'transform 350ms ease', opacity:info?.type==='drive'?0.4:1, zIndex:1 }}
            onError={() => setImgError(true)}
            onMouseEnter={e=>e.target.style.transform='scale(1.05)'}
            onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
        )}

        {/* Play overlay */}
        <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0)',transition:'background 200ms' }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.3)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0)'}>
          <div style={{ width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,0.92)',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'opacity 200ms' }}
            onMouseEnter={e=>{ e.currentTarget.parentElement.style.background='rgba(0,0,0,0.3)'; e.currentTarget.style.opacity=1; }}
            onMouseLeave={e=>{ e.currentTarget.parentElement.style.background='rgba(0,0,0,0)'; e.currentTarget.style.opacity=0; }}>
            <span className="material-symbols-outlined" style={{ fontSize:28,color:'#ff0000',fontVariationSettings:"'FILL' 1" }}>play_arrow</span>
          </div>
        </div>
        {/* Badges */}
        {video.watched && <div style={{ position:'absolute',top:8,right:8,padding:'3px 8px',borderRadius:99,background:'rgba(9,205,131,0.9)',display:'flex',alignItems:'center',gap:4 }}><span className="material-symbols-outlined" style={{ fontSize:11,color:'var(--bg-deep)',fontVariationSettings:"'FILL' 1" }}>check_circle</span><span style={{ fontSize:10,fontWeight:700,color:'var(--bg-deep)' }}>Watched</span></div>}
        <div style={{ position:'absolute',bottom:8,left:8,padding:'2px 8px',borderRadius:99,background:`${color}ee`,fontSize:10,fontWeight:700,color:'#fff' }}>{video.subject}</div>
        {video.playlist && <div style={{ position:'absolute',bottom:8,right:8,padding:'2px 8px',borderRadius:99,background:'var(--s1)',border:'1px solid var(--surface-b)',fontSize:10,fontWeight:700,color:'var(--t2)',display:'flex',alignItems:'center',gap:4 }}><span className="material-symbols-outlined" style={{fontSize:12}}>featured_play_list</span>{video.playlist}</div>}
      </div>

      {/* Content */}
      <div style={{ padding:'14px 14px 12px', display:'flex', flexDirection:'column', flex:1 }}>
        <h4 style={{ fontSize:13.5,fontWeight:700,color:'var(--t1)',marginBottom:7,lineHeight:1.3 }}>{video.title}</h4>
        <p style={{ fontSize:11,color:'var(--t4)',marginBottom:12 }}>Added {fmt.ago(video.addedAt)}</p>

        {/* Notes */}
        <div style={{ flex:1 }}>
          {editNote ? (
            <div style={{ marginBottom:14 }}>
              <textarea className="input" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Your notes…" style={{ resize:'none',fontSize:12,marginBottom:8, background:'var(--s1)', border:'1px solid var(--surface-b)' }}/>
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={()=>{ onNote(video.id,note); setEditNote(false); toast.success('Note saved'); }} className="btn btn-primary" style={{ padding:'6px 14px',fontSize:11, background:'var(--p)' }}>Save</button>
                <button onClick={()=>{ setEditNote(false); setNote(video.notes||''); }} className="btn btn-surface" style={{ padding:'6px 12px',fontSize:11 }}>Cancel</button>
              </div>
            </div>
          ) : video.notes ? (
            <div style={{ marginBottom:14,padding:'10px 12px',borderRadius:'var(--r-md)',background:'var(--s3)',borderLeft:`2px solid ${color}`, position:'relative' }}>
              <p style={{ fontSize:11.5,color:'var(--t2)',lineHeight:1.55, fontWeight:500 }}>{video.notes}</p>
              <button onClick={()=>setEditNote(true)} style={{ position:'absolute', top:4, right:4, fontSize:16, color:'var(--t4)', background:'none', border:'none', cursor:'pointer' }} className="material-symbols-outlined">edit_note</button>
            </div>
          ) : (
            <button onClick={()=>setEditNote(true)} style={{ fontSize:11,fontWeight:700,color:'var(--t4)',background:'var(--s3)',border:'1px dashed var(--surface-b)',borderRadius:'var(--r-md)', width:'100%', cursor:'pointer',marginBottom:14,padding:'8px',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
              <span className="material-symbols-outlined" style={{ fontSize:15 }}>add_comment</span>Add Note
            </button>
          )}
        </div>

        {/* Actions Row 1: Primary Controls */}
        <div style={{ display:'flex',gap:6, marginBottom:6 }}>
          <button onClick={()=>onToggle(video.id)}
            style={{ flex:1.2,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px 10px',borderRadius:'var(--r-md)',border:`1px solid ${video.watched?'rgba(9,205,131,0.3)':'var(--surface-b)'}`,background:video.watched?'rgba(9,205,131,0.08)':'var(--s3)',color:video.watched?'#10b981':'var(--t2)',cursor:'pointer',fontSize:11,fontWeight:800,transition:'all 180ms ease' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16,fontVariationSettings:video.watched?"'FILL' 1":"'FILL' 0" }}>{video.watched?'task_alt':'circle'}</span>
            {video.watched?'Watched':'Mark Done'}
          </button>
          
          <button onClick={()=>setShowAI(true)}
            style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px 10px',borderRadius:'var(--r-md)',border:'1px solid rgba(139,92,246,0.3)',color:'#8b5cf6',fontSize:11,fontWeight:800,background:'rgba(139,92,246,0.04)',transition:'all 180ms ease' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16,fontVariationSettings:"'FILL' 1" }}>auto_awesome</span>
            AI Guide
          </button>
        </div>

        {/* Actions Row 2: Secondary Controls */}
        <div style={{ display:'flex',gap:6, alignItems:'center' }}>
          <a href={video.url} target="_blank" rel="noreferrer"
            style={{ flex:1, display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'7px 10px',borderRadius:'var(--r-md)',border:'1px solid var(--surface-b)',color:'var(--t3)',textDecoration:'none',fontSize:11,fontWeight:700,background:'var(--s4)',transition:'all 180ms ease' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16, color:'#ff4e4e', fontVariationSettings:"'FILL' 1" }}>play_circle</span>
            Open External
          </a>
          
          <button onClick={handleDelete} className="icon-btn" style={{ background:'var(--s4)', border:'1px solid var(--surface-b)', width:32, height:32, flexShrink:0 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--danger)' }}>delete</span>
          </button>
        </div>
      </div>

      {/* AI Guide Modal */}
      {showAI && <AISummaryModal video={video} onClose={()=>setShowAI(false)}/>}

      {/* Inline player */}
      {showPlayer && info && (
        <div onClick={()=>setShowPlayer(false)} style={{ position:'fixed',inset:0,zIndex:110,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'var(--overlay)',animation:'modalFadeIn 220ms ease both' }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:860,borderRadius:'var(--r-xl)',overflow:'hidden',boxShadow:'0 0 80px rgba(0,0,0,0.9)',animation:'scaleIn 280ms var(--bounce)', background:'#000' }}>
            <div style={{ position:'relative',paddingTop:'56.25%',background:'#000' }}>
              
              {(info.type === 'youtube' || info.type === 'drive') && (
                <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--s3)',animation:'pulse 1.5s infinite ease-in-out' }}>
                  <div className="spinner" style={{ width:24,height:24,borderWidth:3,borderColor:'var(--p) transparent var(--p) transparent' }}/>
                  <p style={{ fontSize:11,color:'var(--t4)',marginTop:12,fontWeight:700 }}>Loading Studio…</p>
                </div>
              )}

              {info.type === 'youtube' && (
                <iframe src={`https://www.youtube.com/embed/${info.id}?autoplay=1`} title={video.title}
                  onLoad={(e) => e.target.previousSibling.style.display = 'none'}
                  style={{ position:'absolute',inset:0,width:'100%',height:'100%',border:'none',zIndex:1 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
              )}

              {info.type === 'drive' && (
                <iframe src={info.embedUrl} title={video.title}
                  onLoad={(e) => e.target.previousSibling.style.display = 'none'}
                  style={{ position:'absolute',inset:0,width:'100%',height:'100%',border:'none',zIndex:1 }}
                  allow="autoplay; fullscreen" allowFullScreen/>
              )}

              {(info.type === 'local' || info.type === 'direct') && (
                <video src={info.id} controls autoPlay style={{ position:'absolute',inset:0,width:'100%',height:'100%',border:'none', outline:'none', zIndex:1 }} 
                  onError={(e) => { e.target.outerHTML = '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;text-align:center;padding:20px;z-index:2;background:var(--s2)"><span class="material-symbols-outlined" style="font-size:48px;color:#ff6b6b;margin-bottom:12px">error</span><p style="font-weight:700;font-size:16px;color:var(--t1)">Video source unavailable or expired.</p><p style="font-size:13px;color:var(--t4);margin-top:8px;max-width:300px">If this was a local file from your gallery, you must re-add it. Object URLs expire after closing the app for security.</p></div>'; }} />
              )}
            </div>
            <div style={{ padding:'14px 18px',background:'var(--s2)',display:'flex',alignItems:'center',justifyContent:'space-between', borderTop:'1px solid var(--surface-b)' }}>
              <p style={{ fontSize:14,fontWeight:700,color:'var(--t1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0 }}>{video.title}</p>
              <button onClick={()=>setShowPlayer(false)} className="btn btn-surface" style={{ padding:'7px 16px',fontSize:12,marginLeft:12,flexShrink:0 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Playlist Builder Modal ─────────────────────────
function PlaylistBuilderModal({ videos, playlists, onClose, onSave }) {
  const [playlistName, setPlaylistName] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggle = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = () => {
    if (!playlistName.trim()) { toast.error('Enter playlist name'); return; }
    if (selectedIds.size === 0) { toast.error('Select at least one video'); return; }
    onSave(playlistName.trim(), Array.from(selectedIds));
  };

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',background:'var(--overlay)',animation:'modalFadeIn 220ms ease both' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:500,maxHeight:'80vh',background:'var(--s2)',border:'1px solid var(--card-b-h)',borderRadius:'var(--r-xl)',boxShadow:'var(--modal-sh)',animation:'scaleIn 340ms var(--bounce) both',display:'flex',flexDirection:'column' }}>
        
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--surface-b)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span className="material-symbols-outlined" style={{ fontSize:20,color:'var(--p)',fontVariationSettings:"'FILL' 1" }}>featured_play_list</span>
            <span style={{ fontSize:16,fontWeight:800,color:'var(--t1)' }}>Create Playlist</span>
          </div>
          <button onClick={onClose} className="icon-btn"><span className="material-symbols-outlined" style={{ fontSize:20 }}>close</span></button>
        </div>

        <div style={{ padding:'24px',display:'flex',flexDirection:'column',gap:20,overflowY:'auto',flex:1 }}>
          <div>
            <label className="section-label" style={{ marginBottom:8 }}>Select or Create Playlist</label>
            {playlists?.length > 0 && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                {playlists.map(p => (
                  <button key={p} onClick={()=>setPlaylistName(p)}
                    style={{ padding:'6px 14px', borderRadius:99, border:`1px solid ${playlistName===p?'#a78bfa':'var(--surface-b)'}`, background:playlistName===p?'rgba(167,139,250,0.1)':'var(--s1)', color:playlistName===p?'#a78bfa':'var(--t3)', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.2s' }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
            <input className="input" autoFocus placeholder="Or type a new playlist name..." value={playlistName} onChange={e=>setPlaylistName(e.target.value)} />
          </div>

          <div>
            <label className="section-label" style={{ marginBottom:12,display:'flex',justifyContent:'space-between' }}>
              Select Videos 
              <span style={{ color:'var(--p)' }}>{selectedIds.size} selected</span>
            </label>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {videos.length === 0 ? <p style={{ fontSize:13,color:'var(--t4)' }}>No videos in library.</p> : null}
              {videos.map(v => (
                <div key={v.id} onClick={()=>toggle(v.id)} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px',borderRadius:'var(--r-md)',background:'var(--s3)',border:`1px solid ${selectedIds.has(v.id)?'var(--p)':'transparent'}`,cursor:'pointer',transition:'all 0.2s' }}>
                  <div style={{ width:18,height:18,borderRadius:4,border:`2px solid ${selectedIds.has(v.id)?'var(--p)':'var(--t4)'}`,background:selectedIds.has(v.id)?'var(--p)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s', flexShrink:0 }}>
                    {selectedIds.has(v.id) && <span className="material-symbols-outlined" style={{ fontSize:14,color:'var(--bg)',fontWeight:900 }}>check</span>}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:700,color:'var(--t1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{v.title}</p>
                    <p style={{ fontSize:11,color:'var(--t4)' }}>{v.subject}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding:'20px 24px',borderTop:'1px solid var(--surface-b)',background:'var(--s1)',display:'flex',justifyContent:'flex-end',gap:12 }}>
          <button onClick={onClose} className="btn btn-surface" style={{ padding:'10px 20px',fontWeight:700 }}>Cancel</button>
          <button onClick={handleSave} className="btn btn-primary" style={{ padding:'10px 24px',fontWeight:700,display:'flex',gap:8,alignItems:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>save</span> Create
          </button>
        </div>

      </div>
    </div>
  );
}

export default function Videos() {
  const { videos, A } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [showPlaylistBuilder, setShowPlaylistBuilder] = useState(false);
  const [subject, setSubject] = useState('All');
  const [activePlaylist, setActivePlaylist] = useState('All');
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');

  const playlists = useMemo(() => Array.from(new Set(videos.map(v => v.playlist).filter(Boolean))), [videos]);

  const filtered = useMemo(() => {
    let v = videos;
    if (subject!=='All')        v = v.filter(x=>x.subject===subject);
    if (activePlaylist!=='All') v = v.filter(x=>x.playlist===activePlaylist);
    if (filter==='watched')     v = v.filter(x=>x.watched);
    if (filter==='unwatched')   v = v.filter(x=>!x.watched);
    if (search.trim())          v = v.filter(x=>x.title?.toLowerCase().includes(search.toLowerCase())||x.subject?.toLowerCase().includes(search.toLowerCase())||x.playlist?.toLowerCase().includes(search.toLowerCase()));
    return v;
  }, [videos, subject, activePlaylist, filter, search]);

  const watched   = videos.filter(v=>v.watched).length;
  const unwatched = videos.length - watched;

  const handleCreatePlaylist = (name, ids) => {
    ids.forEach(id => {
      const v = videos.find(x => x.id === id);
      if (v) A.video.update({ ...v, playlist: name });
    });
    toast.success(`Created playlist "${name}"`);
    setShowPlaylistBuilder(false);
  };

  return (
    <div className="page">
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
      `}</style>

      <div className="fadeup" style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h1 className="shimmer-text page-title">Video Library</h1>
          <p style={{ fontSize:13,color:'var(--t3)',marginTop:4 }}>{watched} watched · {unwatched} to watch</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>setShowPlaylistBuilder(true)} className="btn btn-surface" style={{ padding:'10px 18px', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>featured_play_list</span>Create Playlist
          </button>
          <button onClick={()=>setShowAdd(true)} className="btn btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>add_circle</span>Add Video
          </button>
        </div>
      </div>

      <div className="grid-3 fadeup" style={{ gap:12,marginBottom:20 }}>
        {[
          { l:'Total Videos', v:videos.length, c:'var(--p)',  icon:'video_library' },
          { l:'Playlists',    v:playlists.length, c:'#a78bfa',  icon:'featured_play_list' },
          { l:'In Queue',     v:unwatched,     c:'#e9cd6e',  icon:'schedule'      },
        ].map(({ l,v,c,icon },i) => (
          <div key={l} className={`card fadeup d${i+1}`} style={{ padding:'16px 14px',textAlign:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:20,color:c,display:'block',marginBottom:6 }}>{icon}</span>
            <p style={{ fontSize:22,fontWeight:800,color:c,letterSpacing:'-0.02em',lineHeight:1 }}><Counter value={v}/></p>
            <p style={{ fontSize:11,color:'var(--t4)',marginTop:4, fontWeight:700 }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="fadeup d3" style={{ display:'flex',flexDirection:'column',gap:12,marginBottom:24 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <span className="material-symbols-outlined" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'var(--t4)',pointerEvents:'none' }}>search</span>
            <input className="input" style={{ paddingLeft:42, width:'100%' }} placeholder="Search titles or playlists…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
            {['all','watched','unwatched'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:'6px 16px',borderRadius:99,border:`1px solid ${filter===f?'var(--p)':'rgba(255,255,255,0.07)'}`,background:filter===f?'rgba(9,205,131,0.10)':'transparent',color:filter===f?'var(--p)':'var(--t3)',cursor:'pointer',fontWeight:700,fontSize:12,textTransform:'capitalize',transition:'all 160ms ease' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Subjects & Playlists Row */}
        <div style={{ display:'flex',gap:16,overflowX:'auto',paddingBottom:4, alignItems:'center' }}>
          <div style={{ display:'flex',gap:6, alignItems:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--t4)' }}>category</span>
            {['All',...SUBJECTS.slice(0,5)].map(s=>{
              const c = SUBJECT_COLORS[s]||'var(--p)';
              return (
                <button key={s} onClick={()=>setSubject(s)}
                  style={{ padding:'5px 14px',borderRadius:99,border:`1px solid ${subject===s?c:'rgba(255,255,255,0.07)'}`,background:subject===s?`${c}14`:'transparent',color:subject===s?c:'var(--t4)',cursor:'pointer',fontWeight:700,fontSize:11.5,whiteSpace:'nowrap',transition:'all 160ms ease',flexShrink:0 }}>
                  {s}
                </button>
              );
            })}
          </div>

          {playlists.length > 0 && (
            <>
              <div style={{ width:1, height:20, background:'var(--surface-b)', flexShrink:0 }}/>
              <div style={{ display:'flex',gap:6, alignItems:'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize:16, color:'#a78bfa' }}>featured_play_list</span>
                <button onClick={()=>setActivePlaylist('All')}
                  style={{ padding:'5px 14px',borderRadius:99,border:`1px solid ${activePlaylist==='All'?'#a78bfa':'rgba(255,255,255,0.07)'}`,background:activePlaylist==='All'?'rgba(167,139,250,0.1)':'transparent',color:activePlaylist==='All'?'#a78bfa':'var(--t4)',cursor:'pointer',fontWeight:700,fontSize:11.5,whiteSpace:'nowrap',transition:'all 160ms ease',flexShrink:0 }}>
                  All Playlists
                </button>
                {playlists.map(p => (
                  <button key={p} onClick={()=>setActivePlaylist(p)}
                    style={{ padding:'5px 14px',borderRadius:99,border:`1px solid ${activePlaylist===p?'#a78bfa':'rgba(255,255,255,0.07)'}`,background:activePlaylist===p?'rgba(167,139,250,0.1)':'transparent',color:activePlaylist===p?'#a78bfa':'var(--t4)',cursor:'pointer',fontWeight:700,fontSize:11.5,whiteSpace:'nowrap',transition:'all 160ms ease',flexShrink:0 }}>
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Video grid */}
      {filtered.length > 0 ? (
        <div className="tilt-container" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16 }}>
          {filtered.map((v,i) => (
            <div key={v.id} className="fadeup tilt-card" style={{ animationDelay:`${i*0.04}s`, display:'flex' }}>
              <VideoCard video={v}
                onToggle={id=>{ A.video.update({...v,watched:!v.watched}); toast.success(v.watched?'Marked unwatched':'Marked watched ✅'); }}
                onNote={(id,note)=>A.video.update({...v,notes:note})}
                onDelete={id=>{ A.video.remove(id); toast.success('Removed'); }}/>
            </div>
          ))}
        </div>
      ) : (
        <div className="fadeup card" style={{ textAlign:'center',padding:'80px 20px', background:'var(--s1)', border:'1px dashed var(--surface-b)' }}>
          <div className="empty-illust" style={{ fontSize:64,marginBottom:20,display:'inline-block' }}>🎬</div>
          <p style={{ fontSize:16,fontWeight:800,color:'var(--t1)' }}>{search||subject!=='All'||filter!=='all'||activePlaylist!=='All'?'No results found':'Library is empty'}</p>
          <p style={{ fontSize:13,color:'var(--t4)',marginTop:8, maxWidth:400, marginInline:'auto' }}>{search||subject!=='All'||filter!=='all'||activePlaylist!=='All'?'Try clearing your search or filters.':'Curate your knowledge by saving educational videos from YouTube, Google Drive, or your device.'}</p>
          {!search&&subject==='All'&&filter==='all'&&activePlaylist==='All'&&<button onClick={()=>setShowAdd(true)} className="btn btn-primary" style={{ padding:'12px 32px', marginTop:24 }}>Add First Video</button>}
        </div>
      )}

      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onSave={A.video.add} existingPlaylists={playlists}/>}
      {showPlaylistBuilder && <PlaylistBuilderModal videos={videos} playlists={playlists} onClose={()=>setShowPlaylistBuilder(false)} onSave={handleCreatePlaylist} />}
    </div>
  );
}
