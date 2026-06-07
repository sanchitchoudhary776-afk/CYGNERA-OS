import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MOCK_PEERS, buildUsersList, getStore, updateStore } from './NetworkData';
import { useAuth } from '@context/AuthContext';
import { useApp } from '@context/AppContext';
import { initials } from '@utils';
import { messageService } from '@services/messageService';

// ── Smart reply engine for mock peers ────────────────────────
const SMART_REPLIES = {
  1: [ // Aarav — Physics/JEE
    "That formula makes perfect sense! Let's check out the rotation numericals tonight. 🚀",
    "Exactly! The moment of inertia of a hollow cylinder is indeed MR². Let's practice more.",
    "Are you ready for the mock test tomorrow? Physics is going to be tough.",
    "I just finished the Electrostatics chapter — want my formula sheet? ⚡",
    "Great insight! Let's discuss this in the study room later.",
  ],
  2: [ // Ananya — Biology/NEET
    "Thanks! Biology flashcards will make anatomy prep so much easier. 🧬",
    "Great! Did you read the NCERT highlights yet? The diagrams are very important.",
    "I'm setting up a biology quiz block. Want to join? 🌿",
    "Just completed the Human Physiology chapter — 200+ flashcards created!",
    "That's a great question. Let me check my notes and get back to you.",
  ],
  3: [ // Kabir — Physics
    "Interesting approach! I solved it differently using energy conservation.",
    "Let's discuss the Irodov problem set tonight. Some tricky ones there.",
    "The key to rotational mechanics is understanding the parallel axis theorem deeply.",
    "I've been stuck on this optics problem. Can you help?",
  ],
  4: [ // Riya — Chemistry
    "Organic chemistry reactions are all about practice. Keep at it! 🧪",
    "The GOC concepts clicked for me after I drew all the mechanisms.",
    "Want to do a quick chemistry revision session this evening?",
    "Just finished the Aldehydes chapter. So many named reactions!",
  ],
  5: [ // Dev — Math
    "That integral has a neat substitution trick. Try t = tan(x/2).",
    "Calculus is beautiful once you see the patterns. Keep going!",
    "I can share my coordinate geometry shortcuts if you want.",
    "The key to JEE math is speed + accuracy. Practice timed sets!",
  ],
  6: [ // Priya — Bio
    "NCERT is the bible for NEET Biology. Read every line! 📖",
    "Genetics chapter is scoring if you master Punnett squares.",
    "Just completed a 3-hour ecology marathon. My brain needs rest 😅",
    "The plant physiology diagrams in NCERT are exam-critical!",
  ],
  7: [ // Arjun — Code
    "Balancing coding and JEE is tough but worth it! 💻",
    "Try using graph theory concepts for some Physics problems — surprisingly helpful!",
    "Just solved 5 Codeforces problems. Now back to Physics 😂",
  ],
  8: [ // Sanchit — Admin
    "Thanks for the feedback! I'll push an update tonight. 🛡️",
    "Glad you're enjoying the platform! More features coming soon.",
    "That's a great feature suggestion. Added to the roadmap! ✨",
    "Keep grinding! Your streak is looking impressive.",
  ],
};

function getSmartReply(peerId) {
  const replies = SMART_REPLIES[peerId] || SMART_REPLIES[1];
  return replies[Math.floor(Math.random() * replies.length)];
}

// ── Relative time formatter ──────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NetworkMessages() {
  const { user } = useAuth();
  const { progress } = useApp();
  const myId = user?.id || 'me';
  const myName = user?.name || 'You';

  const [store, setStore] = useState(getStore);
  const [activeChat, setActiveChat] = useState(null);
  const [msg, setMsg] = useState('');
  const [typingUser, setTypingUser] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Build the users list dynamically
  const allUsers = useMemo(() => buildUsersList(user, progress), [user, progress]);
  const following = useMemo(() => allUsers.filter(u => store.following.includes(u.id) && !u.isMe), [allUsers, store.following]);
  const notFollowing = useMemo(() => allUsers.filter(u => !store.following.includes(u.id) && !u.isMe), [allUsers, store.following]);

  const refresh = useCallback(() => setStore(getStore()), []);

  // ── Fetch cloud messages on mount ──────────────────────────
  useEffect(() => {
    if (myId) {
      messageService.fetchCloudMessages(myId);
    }
  }, [myId]);

  // ── Subscribe to real-time incoming messages ───────────────
  useEffect(() => {
    if (myId) {
      messageService.subscribeRealtime(myId, (incomingMsg) => {
        // If the incoming message is for the active chat, refresh messages
        setRefreshKey(k => k + 1);
      });
    }
    return () => messageService.unsubscribeRealtime();
  }, [myId]);

  // ── Load messages when active chat changes ─────────────────
  useEffect(() => {
    if (activeChat) {
      const msgs = messageService.getConversation(myId, activeChat);
      setMessages(msgs);
      messageService.markRead(myId, activeChat);
    }
  }, [activeChat, myId, refreshKey]);

  // ── Auto scroll to bottom ──────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [messages, typingUser]);

  // ── Focus input when chat opens ────────────────────────────
  useEffect(() => {
    if (activeChat && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeChat]);

  // ── Simulate reply from mock peers ─────────────────────────
  const simulateReply = useCallback((chatId) => {
    const peer = MOCK_PEERS.find(u => String(u.id) === String(chatId));
    if (!peer) return; // Don't simulate for real users

    setTypingUser(true);
    const delay = 1200 + Math.random() * 1500; // 1.2s – 2.7s realistic delay

    setTimeout(() => {
      const replyText = getSmartReply(peer.id);
      const replyMsg = messageService.sendMessage(String(chatId), String(myId), replyText);

      // Update local messages for this chat
      setMessages(prev => [...prev, { ...replyMsg, sender_id: String(chatId) }]);
      setTypingUser(false);
      setRefreshKey(k => k + 1);
    }, delay);
  }, [myId]);

  // ── Send message ───────────────────────────────────────────
  const sendMsg = useCallback((e) => {
    e.preventDefault();
    if (!msg.trim()) return;

    const sentMsg = messageService.sendMessage(String(myId), String(activeChat), msg.trim());
    setMessages(prev => [...prev, sentMsg]);
    setMsg('');
    setRefreshKey(k => k + 1);

    // Trigger simulated reply for mock peers
    const isMockPeer = MOCK_PEERS.some(p => String(p.id) === String(activeChat));
    if (isMockPeer) {
      simulateReply(activeChat);
    }
  }, [msg, activeChat, myId, simulateReply]);

  // ── React to a message ─────────────────────────────────────
  const handleReaction = useCallback((msgId, emoji) => {
    messageService.reactToMessage(msgId, emoji, myId, activeChat);
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));
  }, [myId, activeChat]);

  // ── Active Chat View ───────────────────────────────────────
  if (activeChat) {
    const chatUser = allUsers.find(u => String(u.id) === String(activeChat));

    return (
      <div className="card" style={{ height:'calc(100vh - 260px)', minHeight:400, display:'flex', flexDirection:'column', overflow:'hidden', padding:0 }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--card-b)', display:'flex', alignItems:'center', gap:12, background:'var(--s2)', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>{setActiveChat(null); setSearchQuery('');}} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', display:'flex', padding:4, borderRadius:'50%' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div style={{ width:36, height:36, borderRadius:'50%', background: chatUser?.isAdmin ? 'linear-gradient(135deg,var(--p),#06b6d4)' : 'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color: chatUser?.isAdmin ? '#000' : 'var(--t2)', fontSize:13, position:'relative' }}>
              {chatUser?.avatar}
              {chatUser?.online && <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:'#09cd83', border:'2px solid var(--s2)' }} />}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <p style={{ fontSize:14, fontWeight:800, color:'var(--t1)', margin:0 }}>{chatUser?.name}</p>
                {chatUser?.isAdmin && <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>verified</span>}
                {chatUser?.isPro && !chatUser?.isAdmin && <span style={{ fontSize:8, padding:'1px 5px', background:'var(--p)', color:'#000', borderRadius:3, fontWeight:800 }}>PRO</span>}
              </div>
              <p style={{ fontSize:11, color: chatUser?.online?'var(--p)':'var(--t4)', margin:0 }}>{chatUser?.online?'Online':'Offline'}</p>
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
          {/* 24h notice */}
          <div style={{ textAlign:'center', padding:'8px 16px', marginBottom:8 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:99, background:'rgba(233,205,110,0.08)', border:'1px solid rgba(233,205,110,0.15)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:13, color:'#e9cd6e' }}>schedule</span>
              <span style={{ fontSize:10.5, color:'#e9cd6e', fontWeight:700 }}>Messages auto-delete after 24 hours</span>
            </div>
          </div>

          {(() => {
            const filteredMsgs = searchQuery.trim() 
              ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
              : messages;

            if (filteredMsgs.length === 0) {
              return (
                <div style={{ textAlign:'center', padding:40, color:'var(--t4)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>chat</span>
                  <p style={{ fontSize:14, margin:0 }}>{searchQuery ? 'No matching messages found.' : `Say hi to ${chatUser?.name?.split(' ')[0]}! 👋`}</p>
                </div>
              );
            }

            return filteredMsgs.map((m, i) => {
              const isMe = String(m.sender_id) === String(myId);
              return (
                <div 
                  key={m.id || i} 
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ alignSelf: isMe?'flex-end':'flex-start', maxWidth:'75%', position:'relative', display:'flex', flexDirection:'column', alignItems: isMe?'flex-end':'flex-start' }}
                >
                  {/* Emoji reaction toolbar on hover */}
                  {hoveredIndex === i && (
                    <div style={{
                      position: 'absolute', top: -28,
                      right: isMe ? 4 : 'auto', left: isMe ? 'auto' : 4,
                      background: 'var(--s4)', border: '1px solid var(--card-b)',
                      borderRadius: 20, padding: '3px 10px', display: 'flex', gap: 8,
                      zIndex: 10, boxShadow: 'var(--sh-lg)',
                      animation: 'msgReactionIn 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
                    }}>
                      {['👍', '❤️', '🔥', '💡', '💯'].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => handleReaction(m.id, emoji)}
                          style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:14, transition:'transform 0.1s' }}
                          onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
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
                    fontSize:13.5, lineHeight:1.45,
                    fontWeight: isMe?600:400,
                    boxShadow: isMe?'0 3px 10px rgba(9, 205, 131, 0.15)':'none',
                    opacity: m._pending ? 0.7 : 1,
                    transition: 'opacity 0.3s ease',
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
                  
                  {/* Timestamp + status */}
                  <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                    <p style={{ fontSize:10, color:'var(--t4)', paddingLeft:4, paddingRight:4, margin:0 }}>{relativeTime(m.created_at)}</p>
                    {isMe && m._pending && (
                      <span className="material-symbols-outlined" style={{ fontSize:11, color:'var(--t4)' }}>schedule</span>
                    )}
                    {isMe && !m._pending && (
                      <span className="material-symbols-outlined" style={{ fontSize:11, color:'var(--p)' }}>done_all</span>
                    )}
                  </div>
                </div>
              );
            });
          })()}
          
          {/* Typing indicator */}
          {typingUser && (
            <div style={{ alignSelf: 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ padding: '10px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--s3)', color: 'var(--t3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--card-b)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--p)' }}>{chatUser?.name?.split(' ')[0]}</span>
                <div className="ai-dots" style={{ display:'flex', gap:3 }}><span/><span/><span/></div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMsg} style={{ padding:'14px 20px', borderTop:'1px solid var(--card-b)', background:'var(--s2)', display:'flex', gap:10, alignItems:'center' }}>
          <input 
            ref={inputRef}
            value={msg} 
            onChange={e=>setMsg(e.target.value)} 
            placeholder={`Message ${chatUser?.name?.split(' ')[0]}...`} 
            style={{ flex:1, padding:'10px 16px', background:'var(--s3)', border:'1px solid var(--card-b)', borderRadius:24, color:'var(--t1)', fontSize:13.5, outline:'none' }} 
          />
          <button type="submit" style={{ width:40, height:40, borderRadius:'50%', background: msg.trim()?'var(--p)':'var(--s4)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', color: msg.trim()?'#000':'var(--t4)', cursor: msg.trim()?'pointer':'default', transition:'all 0.2s', flexShrink:0 }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>send</span>
          </button>
        </form>
        
        <style>{`
          @keyframes msgReactionIn {
            from { opacity: 0; transform: scale(0.85) translateY(4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Chat List View ─────────────────────────────────────────
  const convos = messageService.getAllConversations(myId);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Search */}
      <div style={{ position:'relative' }}>
        <span className="material-symbols-outlined" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--t4)', fontSize:20 }}>search</span>
        <input 
          value={searchQuery}
          onChange={e=>setSearchQuery(e.target.value)}
          placeholder="Filter messages list..."
          style={{ width:'100%', padding:'10px 16px 10px 42px', background:'var(--s2)', border:'1px solid var(--card-b)', borderRadius:'var(--r-md)', color:'var(--t1)', fontSize:13, outline:'none' }}
        />
      </div>

      {/* 24h info banner */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:'var(--r-md)', background:'rgba(233,205,110,0.05)', border:'1px solid rgba(233,205,110,0.12)' }}>
        <span className="material-symbols-outlined" style={{ fontSize:18, color:'#e9cd6e' }}>info</span>
        <p style={{ fontSize:12, color:'var(--t3)', margin:0, lineHeight:1.4 }}>
          Messages are stored for <strong style={{ color:'#e9cd6e' }}>24 hours</strong> and auto-deleted after to keep your conversations fresh and private.
        </p>
      </div>

      {/* Pending sync indicator */}
      {messageService.getPendingCount() > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:'var(--r-md)', background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.15)' }}>
          <div className="spinner" style={{ width:14, height:14, borderWidth:2, borderColor:'#60a5fa transparent #60a5fa transparent' }} />
          <p style={{ fontSize:11, color:'#60a5fa', fontWeight:700, margin:0 }}>{messageService.getPendingCount()} message(s) syncing...</p>
        </div>
      )}

      {/* Following / Can message */}
      <p style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.12em', margin:0 }}>Following · Can Message</p>
      {following.length === 0 ? (
        <div className="card" style={{ padding:32, textAlign:'center', color:'var(--t4)' }}>
          <span className="material-symbols-outlined" style={{ fontSize:40, opacity:0.4, display:'block', marginBottom:8 }}>person_add</span>
          <p style={{ margin:0, fontSize:13 }}>Follow students from the Leaderboard to message them!</p>
        </div>
      ) : (
        following
          .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(u => {
            const convo = convos[String(u.id)];
            const hasUnread = convo?.unread > 0;
            return (
              <div key={u.id} onClick={()=>setActiveChat(String(u.id))} className="card card-hover" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', borderLeft: hasUnread ? '3px solid var(--p)' : 'none' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background: u.isAdmin ? 'linear-gradient(135deg,var(--p),#06b6d4)' : 'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color: u.isAdmin ? '#000' : 'var(--t2)', fontSize:14, position:'relative', flexShrink:0 }}>
                  {u.avatar}
                  {u.online && <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:'#09cd83', border:'2px solid var(--s2)' }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)', margin:0 }}>{u.name}</p>
                    {u.isAdmin && <span className="material-symbols-outlined" style={{ fontSize:13, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>verified</span>}
                    {u.isPro && !u.isAdmin && <span style={{ fontSize:9, padding:'1px 5px', background:'var(--p)', color:'#000', borderRadius:3, fontWeight:800 }}>PRO</span>}
                  </div>
                  <p style={{ fontSize:12, color:'var(--t4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:'3px 0 0' }}>
                    {convo?.lastMessage || 'Start a conversation'}
                  </p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                  {convo?.lastTime && (
                    <span style={{ fontSize:10, color:'var(--t4)', fontWeight:600 }}>{relativeTime(convo.lastTime)}</span>
                  )}
                  {hasUnread && (
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--p)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#000' }}>{convo.unread}</div>
                  )}
                </div>
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
