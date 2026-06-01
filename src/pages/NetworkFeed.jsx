import { useState } from 'react';
import { USERS, getStore, updateStore } from './NetworkData';
import { useAuth } from '@context/AuthContext';
import { initials } from '@utils';

const SUBJ_COLORS = { Physics:'#60a5fa', Biology:'#09cd83', Mathematics:'#a78bfa', Chemistry:'#e9cd6e' };
const TYPE_ICONS = { question:'help', achievement:'emoji_events', post:'article' };
const TYPE_LABELS = { question:'Asked a Doubt', achievement:'Achievement Unlocked', post:'Shared an Update' };

export default function NetworkFeed() {
  const { user } = useAuth();
  const myName = user?.name || 'You';
  const myAvatar = initials(myName);
  const [store, setStore] = useState(getStore);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('post');
  const [postSubject, setPostSubject] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [feedFilter, setFeedFilter] = useState('all');
  
  const refresh = () => setStore(getStore());

  const toggleLike = (pid) => {
    updateStore(d => {
      if (d.myLikes.includes(pid)) { 
        d.myLikes = d.myLikes.filter(x=>x!==pid); 
        const p=d.posts.find(x=>x.id===pid); 
        if(p) p.likes--; 
      } else { 
        d.myLikes.push(pid); 
        const p=d.posts.find(x=>x.id===pid); 
        if(p) p.likes++; 
      }
    });
    refresh();
  };

  const submitPost = () => {
    if (!newPost.trim()) return;
    updateStore(d => {
      d.posts.unshift({ 
        id:'p'+Date.now(), 
        userId: 'me', 
        type:postType, 
        content:newPost, 
        likes:0, 
        comments:[], 
        time:'Just now', 
        authorName: myName,
        authorAvatar: myAvatar,
        subject: postSubject || undefined
      });
    });
    setNewPost(''); 
    setPostSubject('');
    setShowCompose(false); 
    refresh();
  };

  const addComment = (pid) => {
    const txt = commentText[pid];
    if (!txt?.trim()) return;
    updateStore(d => {
      const p = d.posts.find(x=>x.id===pid);
      if(p) p.comments.push({ id:'c'+Date.now(), userId:'me', text:txt, time:'Just now', authorName: myName, authorAvatar: myAvatar });
    });
    setCommentText(prev=>({...prev,[pid]:''})); 
    refresh();
  };

  const filteredPosts = store.posts.filter(p => {
    if (feedFilter === 'all') return true;
    return p.type === feedFilter;
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Compose Feed Item */}
      {!showCompose ? (
        <div onClick={()=>setShowCompose(true)} className="card card-hover" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12, cursor:'pointer', border:'1px solid var(--card-b)' }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:'var(--p)',display:'flex',alignItems:'center',justifyContent:'center',color:'#002214',fontWeight:800,fontSize:14 }}>{myAvatar}</div>
          <p style={{ flex:1, color:'var(--t4)', fontSize:13.5, margin:0 }}>What's on your mind? Ask a doubt, share an achievement...</p>
          <span className="material-symbols-outlined" style={{ color:'var(--p)', fontSize:20 }}>edit</span>
        </div>
      ) : (
        <div className="card" style={{ padding:20, border:'1px solid var(--card-b)', animation:'fadeIn 200ms ease' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ display:'flex', gap:8 }}>
              {['post','question','achievement'].map(t=>(
                <button key={t} onClick={()=>setPostType(t)} style={{ padding:'6px 14px', borderRadius:99, border: postType===t?'1px solid var(--p)':'1px solid var(--card-b)', background: postType===t?'var(--p-sub)':'transparent', color: postType===t?'var(--p)':'var(--t4)', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4, transition:'all 0.2s' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>{TYPE_ICONS[t]}</span>
                  {t==='post'?'Post':t==='question'?'Doubt':'Win'}
                </button>
              ))}
            </div>
            
            {/* Subject Selector */}
            <select 
              value={postSubject} 
              onChange={e=>setPostSubject(e.target.value)}
              style={{ background:'var(--s3)', border:'1px solid var(--card-b)', borderRadius:12, padding:'5px 10px', fontSize:11.5, color:'var(--t2)', outline:'none' }}
            >
              <option value="">General</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
          <textarea 
            value={newPost} 
            onChange={e=>setNewPost(e.target.value)} 
            placeholder={postType==='question'?'What concept or problem are you stuck on? Ask the community...':postType==='achievement'?'Share your learning milestone! NCERT highlights done? Mock test high score? 🎉':'Write an update for the community...'} 
            style={{ width:'100%', minHeight:90, background:'var(--s3)', border:'1px solid var(--card-b)', borderRadius:12, padding:14, color:'var(--t1)', fontSize:13.5, resize:'vertical', outline:'none', fontFamily:'inherit', lineHeight:1.5 }} 
          />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
            <button onClick={()=>setShowCompose(false)} style={{ padding:'8px 18px', borderRadius:8, background:'var(--s3)', border:'1px solid var(--card-b)', color:'var(--t3)', fontSize:13, fontWeight:700, cursor:'pointer' }}>Cancel</button>
            <button onClick={submitPost} className="btn btn-primary" style={{ padding:'8px 20px', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
              <span className="material-symbols-outlined" style={{ fontSize:16 }}>send</span>Publish
            </button>
          </div>
        </div>
      )}

      {/* Feed Filters */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
        {[
          { id:'all', label:'All Feed', icon:'list' },
          { id:'question', label:'Doubts ❓', icon:'help' },
          { id:'achievement', label:'Wins 🏆', icon:'emoji_events' },
          { id:'post', label:'Updates 📢', icon:'article' }
        ].map(filter => (
          <button 
            key={filter.id}
            onClick={()=>setFeedFilter(filter.id)}
            style={{ 
              padding:'6px 12px', 
              borderRadius:14, 
              border:'1px solid var(--card-b)', 
              background: feedFilter === filter.id ? 'var(--p)' : 'var(--s2)', 
              color: feedFilter === filter.id ? '#000' : 'var(--t3)', 
              fontSize:12, 
              fontWeight:700, 
              cursor:'pointer', 
              display:'flex', 
              alignItems:'center', 
              gap:4,
              transition:'all 0.2s'
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Feed List */}
      {filteredPosts.length === 0 && (
        <div className="card" style={{ padding:40, textAlign:'center', color:'var(--t4)', border:'1px solid var(--card-b)' }}>
          <span className="material-symbols-outlined" style={{ fontSize:40, marginBottom:8, opacity:0.5 }}>rss_feed</span>
          <p style={{ margin:0 }}>No posts found in this category.</p>
        </div>
      )}

      {filteredPosts.map(post => {
        const author = post.authorName 
          ? { name: post.authorName, avatar: post.authorAvatar || '??', handle: '', isAdmin: false, isPro: false, isMe: post.userId === 'me' }
          : (USERS.find(u=>u.id===post.userId) || { avatar:'??', name:'User', handle:'', isAdmin: false, isPro: false });
        const liked = store.myLikes.includes(post.id);
        const sc = SUBJ_COLORS[post.subject];
        
        return (
          <div key={post.id} className="card" style={{ padding:0, overflow:'hidden', border:'1px solid var(--card-b)' }}>
            {/* Post Header */}
            <div style={{ padding:'16px 20px 0', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background: author.isAdmin?'linear-gradient(135deg,var(--p),#06b6d4)':'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', color: author.isAdmin?'#000':'var(--t2)', fontWeight:800, fontSize:14, flexShrink:0 }}>
                {author.avatar}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>{author.name}</span>
                  {author.isAdmin && <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>verified</span>}
                  {author.isPro && !author.isAdmin && <span style={{ fontSize:9, padding:'1px 5px', background:'var(--p)', color:'#000', borderRadius:3, fontWeight:800 }}>PRO</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'4px 8px', fontSize:11, color:'var(--t4)', flexWrap:'wrap' }}>
                  <span>{author.handle}</span>
                  <span>•</span>
                  <span>{post.time}</span>
                  {post.type!=='post' && (
                    <>
                      <span>•</span>
                      <span style={{ display:'flex', alignItems:'center', gap:2, whiteSpace:'nowrap' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:11 }}>{TYPE_ICONS[post.type]}</span>
                        {TYPE_LABELS[post.type]}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {sc && (
                <span style={{ fontSize:10.5, padding:'3px 8px', borderRadius:99, background:`${sc}18`, color:sc, fontWeight:800, border:`1px solid ${sc}22` }}>
                  {post.subject}
                </span>
              )}
            </div>

            {/* Content */}
            <div style={{ padding:'12px 20px 16px' }}>
              <p style={{ fontSize:13.5, color:'var(--t1)', lineHeight:1.6, margin:0, whiteSpace:'pre-wrap' }}>{post.content}</p>
            </div>

            {/* Actions */}
            <div style={{ padding:'0 20px 12px', display:'flex', gap:16 }}>
              <button 
                onClick={()=>toggleLike(post.id)} 
                style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color: liked?'#ff6b6b':'var(--t4)', fontSize:12.5, fontWeight:700, transition:'all 150ms', padding:0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize:18, fontVariationSettings: liked?"'FILL' 1":"'FILL' 0" }}>favorite</span>
                {post.likes}
              </button>
              <button style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'var(--t4)', fontSize:12.5, fontWeight:700, padding:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:18 }}>chat_bubble</span>
                {post.comments.length}
              </button>
            </div>

            {/* Comments Thread */}
            {post.comments.length > 0 && (
              <div style={{ borderTop:'1px solid var(--card-b)', padding:'12px 20px', display:'flex', flexDirection:'column', gap:10, background:'var(--s1)' }}>
                {post.comments.map(c => {
                  const ca = c.authorName 
                    ? { name: c.authorName, avatar: c.authorAvatar || '??' }
                    : (USERS.find(u=>u.id===c.userId) || { avatar:'??', name:'User' });
                  return (
                    <div key={c.id} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--t2)', flexShrink:0 }}>{ca.avatar}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--t2)' }}>{ca.name}</span>
                          <span style={{ fontSize:10, color:'var(--t4)' }}>{c.time}</span>
                        </div>
                        <span style={{ fontSize:12.5, color:'var(--t2)', display:'block', marginTop:2, lineHeight:1.4 }}>{c.text}</span>
                        
                        {/* Quick Reply Interaction */}
                        <button 
                          onClick={() => {
                            setCommentText(p => ({
                              ...p,
                              [post.id]: `@${ca.name.split(' ')[0]} `
                            }));
                          }}
                          style={{ background:'none', border:'none', padding:0, color:'var(--p)', fontSize:10, fontWeight:700, cursor:'pointer', marginTop:4 }}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Comment Input */}
            <div style={{ borderTop:'1px solid var(--card-b)', padding:'10px 20px', display:'flex', gap:8, alignItems:'center' }}>
              <input 
                value={commentText[post.id]||''} 
                onChange={e=>setCommentText(p=>({...p,[post.id]:e.target.value}))} 
                onKeyDown={e=>e.key==='Enter'&&addComment(post.id)} 
                placeholder="Write a comment or answer doubt..." 
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--t1)', fontSize:13 }} 
              />
              {(commentText[post.id]||'').trim() && (
                <button onClick={()=>addComment(post.id)} style={{ background:'none', border:'none', color:'var(--p)', cursor:'pointer', fontWeight:700, fontSize:13, padding:0 }}>
                  Post
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
