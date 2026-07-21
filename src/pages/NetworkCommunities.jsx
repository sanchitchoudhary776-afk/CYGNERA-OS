import { useState, useEffect, useRef } from 'react';
import { COMMUNITIES, getStore, updateStore } from './NetworkData';
import { useAuth } from '@context/AuthContext';
import { initials } from '@utils';
import toast from 'react-hot-toast';

export default function NetworkCommunities() {
  const { user } = useAuth();
  const myName = user?.name || 'You';
  const myAvatar = initials(myName);

  const [store, setStore] = useState(getStore);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [postType, setPostType] = useState('text'); // 'text' | 'resource'
  const [commTab, setCommTab] = useState('all'); // 'all' | 'resources'
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const scrollRef = useRef(null);

  const refresh = () => setStore(getStore());

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeCommunity, store.communities]);

  const simulateCommunityReply = (commId) => {
    setTimeout(() => {
      updateStore(d => {
        if (!d.communities[commId]) d.communities[commId] = [];

        let replyText = "Thanks for sharing! This problem set is super helpful.";
        let authorName = "Community Member";
        let avatarInit = "CM";

        if (commId === 'jee') {
          const replies = [
            "HC Verma Vol 1 problem #24 solution was tricky, thanks for the explanation! 🚀",
            "Are these questions based on the latest NTA JEE Advanced pattern?",
            "Can someone drop the link to the calculus formula sheet?",
          ];
          replyText = replies[Math.floor(Math.random() * replies.length)];
          authorName = "Aarav Sharma";
          avatarInit = "AS";
        } else if (commId === 'neet') {
          const replies = [
            "NCERT Human Physiology line-by-line notes are literal lifesavers! 🧬",
            "I'm revising Genetics today, this formula summary is right on time!",
          ];
          replyText = replies[Math.floor(Math.random() * replies.length)];
          authorName = "Ananya Iyer";
          avatarInit = "AI";
        } else if (commId === 'math') {
          replyText = "Integration by parts formula: integral(u dv) = u v - integral(v du)! 📐";
          authorName = "Dev Kapoor";
          avatarInit = "DK";
        } else if (commId === 'chem') {
          replyText = "Remember: SN1 proceeds via carbocation intermediate (racemization)! 🧪";
          authorName = "Riya Patel";
          avatarInit = "RP";
        } else if (commId === 'cs') {
          replyText = "Time complexity of Dijkstra algorithm with Min-Heap is O((V+E) log V)! 💻";
          authorName = "Arjun Reddy";
          avatarInit = "AR";
        }

        d.communities[commId].push({
          id: 'c_' + Date.now(),
          type: 'text',
          content: replyText,
          date: 'Just now',
          author: authorName,
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
        id: 'c_' + Date.now(),
        type: postType,
        content: chatMessage,
        date: 'Just now',
        author: myName,
        role: 'member',
        avatar: myAvatar
      };
      if (postType === 'resource') {
        newPost.size = '2.4 MB';
      }
      d.communities[currentComm].push(newPost);
    });

    setChatMessage('');
    setPostType('text');
    refresh();
    toast.success(postType === 'resource' ? 'Resource shared with community!' : 'Message sent!');

    simulateCommunityReply(currentComm);
  };

  if (activeCommunity) {
    const comm = COMMUNITIES.find(c => c.id === activeCommunity) || COMMUNITIES[0];
    const rawPosts = store.communities[activeCommunity] || [];
    const posts = commTab === 'resources' ? rawPosts.filter(p => p.type === 'resource') : rawPosts;

    return (
      <div className="card" style={{ height: 'calc(100vh - 240px)', minHeight: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: '1px solid var(--card-b)' }}>
        {/* Chat Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-b)', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--s2)', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setActiveCommunity(null)} style={{ background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${comm.color}22`, color: comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{comm.icon}</span>
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>{comm.title}</h2>
              <p style={{ fontSize: 11.5, color: 'var(--t4)', margin: '2px 0 0' }}>{comm.members} Members • Live Study Space</p>
            </div>
          </div>

          {/* Sub-tabs inside room */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--s3)', padding: 3, borderRadius: 10, border: '1px solid var(--card-b)' }}>
            <button
              onClick={() => setCommTab('all')}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                background: commTab === 'all' ? comm.color : 'transparent',
                color: commTab === 'all' ? '#000' : 'var(--t3)'
              }}
            >
              All Chat
            </button>
            <button
              onClick={() => setCommTab('resources')}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                background: commTab === 'resources' ? comm.color : 'transparent',
                color: commTab === 'resources' ? '#000' : 'var(--t3)'
              }}
            >
              PDFs & Resources
            </button>
          </div>
        </div>

        {/* Chat Stream */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(180deg, var(--bg) 0%, var(--s1) 100%)' }}>
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, marginBottom: 12, opacity: 0.5 }}>campaign</span>
              <p style={{ fontSize: 14, margin: 0 }}>Welcome to {comm.title}!</p>
              <p style={{ fontSize: 12, margin: '4px 0 0' }}>Share notes, problem sets, or ask your peers a doubt.</p>
            </div>
          )}

          {posts.map((post, idx) => {
            const isAdmin = post.role === 'admin';
            const isMe = post.author === myName;

            return (
              <div
                key={post.id || idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-end', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', position: 'relative' }}
              >
                {!isMe && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAdmin ? 'linear-gradient(135deg,var(--p),#06b6d4)' : 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: isAdmin ? '#000' : 'var(--t2)' }}>
                    {post.avatar}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {/* Reaction Bar */}
                  {hoveredIndex === idx && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -24,
                        right: isMe ? 4 : 'auto',
                        left: isMe ? 'auto' : 36,
                        background: 'var(--s4)',
                        border: '1px solid var(--card-b)',
                        borderRadius: 20,
                        padding: '2px 8px',
                        display: 'flex',
                        gap: 6,
                        zIndex: 10
                      }}
                    >
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
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13 }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isMe && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 2 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: isAdmin ? comm.color : 'var(--t3)' }}>{post.author}</span>
                      {isAdmin && <span className="material-symbols-outlined" style={{ fontSize: 12, color: comm.color, fontVariationSettings: "'FILL' 1" }}>verified</span>}
                    </div>
                  )}

                  <div
                    style={{
                      padding: post.type === 'resource' ? '12px' : '10px 16px',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? 'linear-gradient(135deg, var(--p), var(--p-lt))' : (isAdmin ? `${comm.color}15` : 'var(--s3)'),
                      border: isAdmin && !isMe ? `1px solid ${comm.color}33` : (isMe ? 'none' : '1px solid var(--card-b)'),
                      color: isMe ? '#002214' : 'var(--t1)'
                    }}
                  >
                    {post.type === 'resource' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: isMe ? 'rgba(0,0,0,0.12)' : comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 2px 0' }}>{post.content}</p>
                          <p style={{ fontSize: 10.5, color: isMe ? 'rgba(0,0,0,0.6)' : 'var(--t4)', margin: 0 }}>{post.size || '2.4 MB'} • Study Attachment</p>
                        </div>
                        <button onClick={() => toast.success(`Downloading ${post.content}...`)} style={{ background: 'none', border: 'none', color: isMe ? '#002214' : comm.color, cursor: 'pointer', marginLeft: 6 }}>
                          <span className="material-symbols-outlined">download</span>
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13.5, lineHeight: 1.45, fontWeight: isMe ? 600 : 400, margin: 0 }}>{post.content}</p>
                    )}
                  </div>

                  {/* Reaction Pills */}
                  {post.reactions && Object.keys(post.reactions).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {Object.entries(post.reactions).map(([emoji, count]) => (
                        <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'var(--s4)', border: '1px solid var(--card-b)', borderRadius: 12, padding: '2px 6px', fontSize: 10, color: 'var(--t2)', fontWeight: 700 }}>
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0 }}>{post.date}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Form */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--card-b)', background: 'var(--s2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setPostType(postType === 'text' ? 'resource' : 'text')}
            title={postType === 'resource' ? "Sending PDF Resource" : "Attach PDF/File Resource"}
            style={{
              background: postType === 'resource' ? comm.color : 'var(--s3)',
              border: 'none',
              color: postType === 'resource' ? '#000' : 'var(--t3)',
              borderRadius: '50%',
              width: 38,
              height: 38,
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>attach_file</span>
          </button>

          <form onSubmit={handleSendMessage} style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--s3)', borderRadius: 24, padding: '4px 4px 4px 16px', border: '1px solid var(--card-b)' }}>
            <input
              type="text"
              placeholder={postType === 'resource' ? "Resource title (e.g. Physics Formula Sheet.pdf)..." : `Message ${comm.title}...`}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 13.5, padding: '6px 0' }}
            />
            <button type="submit" style={{ width: 34, height: 34, borderRadius: '50%', background: chatMessage.trim() ? comm.color : 'var(--s4)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: chatMessage.trim() ? '#000' : 'var(--t4)', cursor: chatMessage.trim() ? 'pointer' : 'default' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>send</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Topic Hub Cards Grid ──
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {COMMUNITIES.map(comm => (
        <div
          key={comm.id}
          onClick={() => setActiveCommunity(comm.id)}
          className="card card-hover"
          style={{
            padding: 24,
            cursor: 'pointer',
            border: `1px solid ${comm.color}25`,
            background: 'var(--s2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${comm.color}15`, color: comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>{comm.icon}</span>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)', margin: '0 0 6px 0' }}>{comm.title}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.5, margin: 0 }}>{comm.desc}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)' }}>{comm.members} Members</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: comm.color, display: 'flex', alignItems: 'center', gap: 4 }}>
              Join Hub
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
