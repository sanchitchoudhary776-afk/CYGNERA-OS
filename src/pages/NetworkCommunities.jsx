import { useState, useEffect, useRef } from 'react';
import { COMMUNITIES, getStore, updateStore } from './NetworkData';
import { useAuth } from '@context/AuthContext';
import { initials } from '@utils';

export default function NetworkCommunities() {
  const { user } = useAuth();
  const myName = user?.name || 'You';
  const myAvatar = initials(myName);
  const [store, setStore] = useState(getStore);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [postType, setPostType] = useState('text'); // 'text' or 'resource'
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const scrollRef = useRef(null);

  const refresh = () => setStore(getStore());

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeCommunity, store.communities]);

  const simulateCommunityReply = (commId) => {
    setTimeout(() => {
      updateStore(d => {
        if (!d.communities[commId]) d.communities[commId] = [];
        
        let replyText = "Thanks for sharing! This is really helpful.";
        let authorName = "Community Member";
        let avatarInit = "CM";
        let authorRole = "student";
        
        if (commId === 'jee') {
          const replies = [
            "Problem sets like these are exactly what I needed. Thanks! 📚",
            "Are these based on JEE Advanced pattern? I'll attempt them now.",
            "Can you also share the solutions sheet if possible? 🙏",
            "This is amazing. My score is finally improving!"
          ];
          replyText = replies[Math.floor(Math.random() * replies.length)];
          authorName = "JEE Student";
          avatarInit = "JS";
        } else if (commId === 'neet') {
          const replies = [
            "NCERT highlights are literal lifesavers! 🧬",
            "Excellent resource. Thank you!",
            "I'm revising Human Physiology today, this timing is perfect! ✨",
            "Let's create a group study room to discuss these questions!"
          ];
          replyText = replies[Math.floor(Math.random() * replies.length)];
          authorName = "NEET Aspirant";
          avatarInit = "NA";
        }
        
        d.communities[commId].push({
          id: 'c' + Date.now(),
          type: 'text',
          content: replyText,
          date: 'Just now',
          author: authorName,
          role: authorRole,
          avatar: avatarInit
        });
      });
      refresh();
    }, 1200);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const currentComm = activeCommunity;
    
    updateStore(d => {
      if (!d.communities[currentComm]) d.communities[currentComm] = [];
      const newPost = {
        id: 'c' + Date.now(),
        type: postType,
        content: chatMessage,
        date: 'Just now',
        author: myName,
        role: 'member',
        avatar: myAvatar
      };
      if (postType === 'resource') {
        newPost.size = '1.2 MB';
      }
      d.communities[currentComm].push(newPost);
    });
    
    setChatMessage('');
    setPostType('text');
    refresh();
    
    // Simulate community student response
    simulateCommunityReply(currentComm);
  };

  if (activeCommunity) {
    const comm = COMMUNITIES.find(c => c.id === activeCommunity);
    const posts = store.communities[activeCommunity] || [];
    
    return (
      <div className="card" style={{ height: 'calc(100vh - 240px)', minHeight: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {/* Chat Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--card-b)', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--s2)' }}>
          <button onClick={() => setActiveCommunity(null)} style={{ background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', display:'flex' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${comm.color}22`, color: comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{comm.icon}</span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', margin:0 }}>{comm.title}</h2>
            <p style={{ fontSize: 12, color: 'var(--t4)', margin:'2px 0 0' }}>{comm.members} Members • Active Hub</p>
          </div>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>

        {/* Chat Feed */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 14, background: 'linear-gradient(180deg, var(--bg) 0%, var(--s2) 100%)' }}>
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>campaign</span>
              <p>Welcome to {comm.title}! Make the first announcement.</p>
            </div>
          )}
          {posts.map((post, idx) => {
            const isAdmin = post.role === 'admin';
            const isMe = post.author === myName;
            
            return (
              <div 
                key={post.id} 
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ display: 'flex', gap: 12, alignItems: 'flex-end', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', position: 'relative' }}
              >
                {!isMe && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAdmin ? 'linear-gradient(135deg,var(--p),#06b6d4)' : 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800, color: isAdmin ? '#000' : 'var(--t2)' }}>
                    {post.avatar}
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {/* Reaction Toolbar */}
                  {hoveredIndex === idx && (
                    <div style={{
                      position: 'absolute',
                      top: -24,
                      right: isMe ? 4 : 'auto',
                      left: isMe ? 'auto' : 40,
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
                              const commPosts = d.communities[activeCommunity];
                              if (commPosts && commPosts[idx]) {
                                if (!commPosts[idx].reactions) commPosts[idx].reactions = {};
                                commPosts[idx].reactions[emoji] = (commPosts[idx].reactions[emoji] || 0) + 1;
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

                  {!isMe && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: isAdmin ? comm.color : 'var(--t3)' }}>{post.author}</span>
                      {isAdmin && <span className="material-symbols-outlined" style={{ fontSize: 12, color: comm.color, fontVariationSettings: "'FILL' 1" }}>verified</span>}
                    </div>
                  )}
                  
                  <div style={{ 
                    padding: post.type === 'resource' ? '12px' : '10px 16px', 
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMe ? 'linear-gradient(135deg, var(--p), var(--p-lt))' : (isAdmin ? `${comm.color}15` : 'var(--s3)'),
                    border: isAdmin && !isMe ? `1px solid ${comm.color}33` : (isMe ? 'none' : '1px solid var(--card-b)'),
                    color: isMe ? '#002214' : 'var(--t1)',
                    boxShadow: isMe ? '0 3px 10px rgba(9, 205, 131, 0.15)' : 'none'
                  }}>
                    {post.type === 'resource' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: isMe ? 'rgba(0,0,0,0.1)' : comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 2px 0' }}>{post.content}</p>
                          <p style={{ fontSize: 11, color: isMe ? 'rgba(0,0,0,0.6)' : 'var(--t4)', margin:0 }}>{post.size} • PDF Document</p>
                        </div>
                        <button className="btn btn-icon" style={{ background: 'transparent', color: isMe ? '#002214' : comm.color, border: 'none', marginLeft: 8, cursor: 'pointer' }}>
                          <span className="material-symbols-outlined">download</span>
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13.5, lineHeight: 1.45, fontWeight: isMe ? 600 : 400, margin:0 }}>{post.content}</p>
                    )}
                  </div>

                  {/* Render Reactions */}
                  {post.reactions && Object.keys(post.reactions).length > 0 && (
                    <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                      {Object.entries(post.reactions).map(([emoji, count]) => (
                        <div key={emoji} style={{ display:'flex', alignItems:'center', gap:3, background:'var(--s4)', border:'1px solid var(--card-b)', borderRadius:12, padding:'2px 6px', fontSize:10, color:'var(--t2)', fontWeight:700 }}>
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, paddingRight: isMe ? 4 : 0, paddingLeft: isMe ? 0 : 4 }}>{post.date}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Input Area */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-b)', background: 'var(--s2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setPostType(postType === 'text' ? 'resource' : 'text')}
            title={postType === 'resource' ? "Sending Resource" : "Click to send Resource"}
            style={{ 
              background: postType === 'resource' ? comm.color : 'var(--s3)', 
              border: 'none', 
              color: postType === 'resource' ? '#000' : 'var(--t3)', 
              borderRadius: '50%', width: 40, height: 40, flexShrink: 0,
              cursor: 'pointer', transition: 'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>attach_file</span>
          </button>
          <form onSubmit={handleSendMessage} style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--s3)', borderRadius: 24, padding: '4px 4px 4px 16px', border: '1px solid var(--card-b)' }}>
            <input 
              type="text" 
              placeholder={postType === 'resource' ? "Enter document name (e.g. Physics Notes.pdf)..." : "Message the community..."} 
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 14, padding: '8px 0' }}
            />
            <button type="submit" style={{ width: 36, height: 36, borderRadius: '50%', background: chatMessage.trim() ? comm.color : 'var(--s4)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: chatMessage.trim() ? '#000' : 'var(--t4)', cursor: chatMessage.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, transform: 'translateX(1px)' }}>send</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {COMMUNITIES.map(comm => (
        <div key={comm.id} onClick={() => setActiveCommunity(comm.id)} className="card card-hover" style={{ padding: 24, cursor: 'pointer', border: `1px solid ${comm.color}25` }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${comm.color}15`, color: comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>{comm.icon}</span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', marginBottom: 8, margin:0 }}>{comm.title}</h3>
          <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 16, marginTop:8 }}>{comm.desc}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)' }}>{comm.members} Members</span>
            <span className="material-symbols-outlined" style={{ color: comm.color, fontSize: 18 }}>arrow_forward</span>
          </div>
        </div>
      ))}
    </div>
  );
}
