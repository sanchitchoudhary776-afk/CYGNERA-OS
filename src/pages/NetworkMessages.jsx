import { useState, useEffect, useRef } from 'react';
import { USERS, getStore, updateStore } from './NetworkData';
import { useAuth } from '@context/AuthContext';
import { initials } from '@utils';

export default function NetworkMessages() {
  const { user } = useAuth();
  const myName = user?.name || 'You';
  const [store, setStore] = useState(getStore);
  const [activeChat, setActiveChat] = useState(null);
  const [msg, setMsg] = useState('');
  const [typingUser, setTypingUser] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef(null);

  const refresh = () => setStore(getStore());

  const following = USERS.filter(u => store.following.includes(u.id) && !u.isMe);
  const notFollowing = USERS.filter(u => !store.following.includes(u.id) && !u.isMe);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat, store.dms, typingUser]);

  const simulateReply = (chatId) => {
    setTypingUser(true);
    setTimeout(() => {
      updateStore(d => {
        if (!d.dms[chatId]) d.dms[chatId] = [];
        
        let replyText = "Hey! Let's study together later in the study room.";
        if (chatId === '1') {
          const physicsReplies = [
            "That formula makes perfect sense! Let's check out the rotation numericals tonight. 🚀",
            "Exactly! The moment of inertia of a hollow cylinder is indeed MR². Let's practice more.",
            "Awesome, I'll join the focus room in 10 minutes. Let's finish the Physics assignment! ⚡",
            "Are you ready for the mock test tomorrow? Physics is going to be tough."
          ];
          replyText = physicsReplies[Math.floor(Math.random() * physicsReplies.length)];
        } else if (chatId === '2') {
          const biologyReplies = [
            "Thanks for adding it! Biology flashcards will make anatomy prep so much easier. 🧬",
            "Great! Did you read the NCERT highlights yet? The diagrams are very important.",
            "Awesome! Share your human physiology notes with me when you can. 🌿",
            "I'm setting up a biology quiz block. Want to join?"
          ];
          replyText = biologyReplies[Math.floor(Math.random() * biologyReplies.length)];
        }
        
        d.dms[chatId].push({ from: Number(chatId), text: replyText, time: 'Just now' });
      });
      setTypingUser(false);
      refresh();
    }, 1500);
  };

  const sendMsg = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    const currentChat = activeChat;
    updateStore(d => {
      if (!d.dms[currentChat]) d.dms[currentChat] = [];
      d.dms[currentChat].push({ from: 'me', text: msg, time: 'Just now' });
    });
    setMsg('');
    refresh();
    
    // Simulate interactive reply
    simulateReply(currentChat);
  };

  if (activeChat) {
    const user = USERS.find(u => u.id === Number(activeChat));
    const msgs = store.dms[activeChat] || [];
    
    // Message search within active chat
    const filteredMsgs = searchQuery.trim() 
      ? msgs.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
      : msgs;

    return (
      <div className="card" style={{ height:'calc(100vh - 260px)', minHeight:400, display:'flex', flexDirection:'column', overflow:'hidden', padding:0 }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--card-b)', display:'flex', alignItems:'center', gap:12, background:'var(--s2)', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>{setActiveChat(null); setSearchQuery('');}} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', display:'flex', padding:4, borderRadius:'50%' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--t2)', fontSize:13, position:'relative' }}>
              {user?.avatar}
              {user?.online && <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:'#09cd83', border:'2px solid var(--s2)' }} />}
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:'var(--t1)', margin:0 }}>{user?.name}</p>
              <p style={{ fontSize:11, color: user?.online?'var(--p)':'var(--t4)', margin:0 }}>{user?.online?'Online':'Offline'}</p>
            </div>
          </div>
          
          {/* Inline Chat Search */}
          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <input 
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Search chat..."
              style={{ padding:'6px 12px 6px 30px', fontSize:12, background:'var(--s3)', border:'1px solid var(--card-b)', borderRadius:16, color:'var(--t1)', outline:'none', width:120, transition:'all 0.2s' }}
              onFocus={e=>e.target.style.width = '180px'}
              onBlur={e=>e.target.style.width = '120px'}
            />
            <span className="material-symbols-outlined" style={{ position:'absolute', left:8, fontSize:16, color:'var(--t4)' }}>search</span>
            {searchQuery && (
              <span onClick={()=>setSearchQuery('')} className="material-symbols-outlined" style={{ position:'absolute', right:8, fontSize:16, color:'var(--t4)', cursor:'pointer' }}>close</span>
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:12, background:'linear-gradient(180deg,var(--bg),var(--s1))' }}>
          {filteredMsgs.length === 0 && (
            <div style={{ textAlign:'center', padding:40, color:'var(--t4)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>chat</span>
              <p style={{ fontSize:14, margin:0 }}>{searchQuery ? 'No matching messages found.' : `Say hi to ${user?.name?.split(' ')[0]}! 👋`}</p>
            </div>
          )}
          {filteredMsgs.map((m, i) => {
            const isMe = m.from === 'me';
            return (
              <div 
                key={i} 
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ alignSelf: isMe?'flex-end':'flex-start', maxWidth:'75%', position:'relative', display:'flex', flexDirection:'column', alignItems: isMe?'flex-end':'flex-start' }}
              >
                {/* Emojis reaction toolbar on hover */}
                {hoveredIndex === i && (
                  <div style={{
                    position: 'absolute',
                    top: -24,
                    right: isMe ? 4 : 'auto',
                    left: isMe ? 'auto' : 4,
                    background: 'var(--s4)',
                    border: '1px solid var(--card-b)',
                    borderRadius: 20,
                    padding: '2px 8px',
                    display: 'flex',
                    gap: 8,
                    zIndex: 10,
                    boxShadow: 'var(--sh-lg)',
                    animation: 'scaleIn 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
                  }}>
                    {['👍', '❤️', '🔥', '💡', '💯'].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => {
                          updateStore(d => {
                            const chatMsgs = d.dms[activeChat];
                            if (chatMsgs && chatMsgs[i]) {
                              if (!chatMsgs[i].reactions) chatMsgs[i].reactions = {};
                              chatMsgs[i].reactions[emoji] = (chatMsgs[i].reactions[emoji] || 0) + 1;
                            }
                          });
                          refresh();
                        }}
                        style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:13, transition:'transform 0.1s' }}
                        onMouseEnter={e => e.target.style.transform = 'scale(1.25)'}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message Bubble */}
                <div style={{ 
                  padding:'10px 16px', 
                  borderRadius: isMe?'16px 16px 4px 16px':'16px 16px 16px 4px', 
                  background: isMe?'linear-gradient(135deg, var(--p), var(--p-lt))':'var(--s3)', 
                  border: isMe?'none':'1px solid var(--card-b)',
                  color: isMe?'#002214':'var(--t1)', 
                  fontSize:13.5, 
                  lineHeight:1.45,
                  fontWeight: isMe?600:400,
                  boxShadow: isMe?'0 3px 10px rgba(9, 205, 131, 0.15)':'none'
                }}>
                  {m.text}
                </div>
                
                {/* Reactions Render */}
                {m.reactions && Object.keys(m.reactions).length > 0 && (
                  <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                    {Object.entries(m.reactions).map(([emoji, count]) => (
                      <div key={emoji} style={{ display:'flex', alignItems:'center', gap:3, background:'var(--s4)', border:'1px solid var(--card-b)', borderRadius:12, padding:'2px 6px', fontSize:10, color:'var(--t2)', fontWeight:700 }}>
                        <span>{emoji}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <p style={{ fontSize:10, color:'var(--t4)', marginTop:3, textAlign: isMe?'right':'left', paddingLeft:4, paddingRight:4, margin:0 }}>{m.time}</p>
              </div>
            );
          })}
          
          {/* Simulated Typing State */}
          {typingUser && (
            <div style={{ alignSelf: 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ padding: '10px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--s3)', color: 'var(--t3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--card-b)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--p)' }}>{user?.name?.split(' ')[0]}</span>
                <div className="ai-dots" style={{ display:'flex', gap:3 }}><span/><span/><span/></div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMsg} style={{ padding:'14px 20px', borderTop:'1px solid var(--card-b)', background:'var(--s2)', display:'flex', gap:10 }}>
          <input 
            value={msg} 
            onChange={e=>setMsg(e.target.value)} 
            placeholder={`Message ${user?.name?.split(' ')[0]}...`} 
            style={{ flex:1, padding:'10px 16px', background:'var(--s3)', border:'1px solid var(--card-b)', borderRadius:24, color:'var(--t1)', fontSize:13.5, outline:'none' }} 
          />
          <button type="submit" style={{ width:40, height:40, borderRadius:'50%', background: msg.trim()?'var(--p)':'var(--s4)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', color: msg.trim()?'#000':'var(--t4)', cursor: msg.trim()?'pointer':'default', transition:'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>send</span>
          </button>
        </form>
        
        <style>{`
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9) translateY(4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Search friend */}
      <div style={{ position:'relative' }}>
        <span className="material-symbols-outlined" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--t4)', fontSize:20 }}>search</span>
        <input 
          value={searchQuery}
          onChange={e=>setSearchQuery(e.target.value)}
          placeholder="Filter messages list..."
          style={{ width:'100%', padding:'10px 16px 10px 42px', background:'var(--s2)', border:'1px solid var(--card-b)', borderRadius:'var(--r-md)', color:'var(--t1)', fontSize:13, outline:'none' }}
        />
      </div>

      {/* Following / Can message */}
      <p style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.12em', margin:0 }}>Following · Can Message</p>
      {following.length === 0 ? (
        <div className="card" style={{ padding:32, textAlign:'center', color:'var(--t4)' }}>
          <p style={{ margin:0 }}>Follow students from the Leaderboard to message them!</p>
        </div>
      ) : (
        following
          .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(u => {
            const hasUnread = store.dms[u.id]?.length > 0;
            return (
              <div key={u.id} onClick={()=>setActiveChat(String(u.id))} className="card card-hover" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--t2)', fontSize:14, position:'relative', flexShrink:0 }}>
                  {u.avatar}
                  {u.online && <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:'#09cd83', border:'2px solid var(--s2)' }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)', margin:0 }}>{u.name}</p>
                    {u.isPro && <span style={{ fontSize:9, padding:'1px 5px', background:'var(--p)', color:'#000', borderRadius:3, fontWeight:800 }}>PRO</span>}
                  </div>
                  <p style={{ fontSize:12, color:'var(--t4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:'3px 0 0' }}>
                    {store.dms[u.id]?.slice(-1)[0]?.text || 'Start a conversation'}
                  </p>
                </div>
                {hasUnread && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--p)', flexShrink:0 }} />}
              </div>
            );
          })
      )}

      {/* Not following */}
      {notFollowing.length > 0 && (
        <>
          <p style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.12em', marginTop:8, margin:0 }}>Not Following · Follow to Message</p>
          {notFollowing.slice(0, 4).map(u => (
            <div key={u.id} className="card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14, opacity:0.6 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--t2)', fontSize:14 }}>{u.avatar}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)', margin:0 }}>{u.name}</p>
                <p style={{ fontSize:12, color:'var(--t4)', margin:'2px 0 0' }}>Follow to unlock messaging</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--t4)' }}>lock</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
