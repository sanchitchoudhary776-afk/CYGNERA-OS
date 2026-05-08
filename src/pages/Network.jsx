import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reveal } from '@components/ui/PremiumUI';

// Mock Data for Leaderboard
const MOCK_LEADERBOARD = [
  { id: 1, name: 'Aryan Sharma', handle: '@aryan.s', xp: 24500, rank: 1, avatar: 'AS', isPro: true, streak: 42, style: 'Visual Learner', focus: { practice: 75, theory: 25 }, recent: 'Mastered Rotational Dynamics' },
  { id: 2, name: 'Kavya Singh', handle: '@kavya_neet', xp: 23150, rank: 2, avatar: 'KS', isPro: false, streak: 28, style: 'Night Owl', focus: { practice: 60, theory: 40 }, recent: 'Completed Human Physiology Mock' },
  { id: 3, name: 'Rohan Gupta', handle: '@rohan_jee', xp: 21800, rank: 3, avatar: 'RG', isPro: true, streak: 15, style: 'Conceptual', focus: { practice: 50, theory: 50 }, recent: 'Solved 100+ Calculus Problems' },
  { id: 4, name: 'Aditi Verma', handle: '@aditi.v', xp: 19400, rank: 4, avatar: 'AV', isPro: false, streak: 5, style: 'Speed Runner', focus: { practice: 85, theory: 15 }, recent: 'Finished 12th Board Syllabus' },
  { id: 5, name: 'You', handle: '@learner', xp: 18200, rank: 5, avatar: 'ME', isPro: true, streak: 12, style: 'Balanced', focus: { practice: 65, theory: 35 }, recent: 'Active in Network' },
  { id: 6, name: 'Siddharth M.', handle: '@sid_math', xp: 17500, rank: 6, avatar: 'SM', isPro: false, streak: 3, style: 'Deep Diver', focus: { practice: 40, theory: 60 }, recent: 'Reading Electromagnetism' },
  { id: 7, name: 'Meera R.', handle: '@meera.reads', xp: 16200, rank: 7, avatar: 'MR', isPro: false, streak: 1, style: 'Consistency King', focus: { practice: 70, theory: 30 }, recent: 'Started Organic Chemistry' },
];

// Mock Data for Communities
const COMMUNITIES = [
  { id: 'jee', title: 'JEE Advanced Basecamp', members: '12.4k', icon: 'functions', color: '#60a5fa', desc: 'Official resources and strategies for Joint Entrance Examination.' },
  { id: 'neet', title: 'NEET Medical Hub', members: '18.1k', icon: 'medical_services', color: '#09cd83', desc: 'Biology notes, mock tests, and official NTA updates.' },
  { id: '12th', title: '12th Board Mastery', members: '45.2k', icon: 'school', color: '#a78bfa', desc: 'CBSE/ICSE chapter-wise weightage and sample papers.' },
  { id: '10th', title: '10th Foundation', members: '32.8k', icon: 'menu_book', color: '#e9cd6e', desc: 'Core concept building and previous year question breakdowns.' }
];

// Expanded Mock Data for Chat
const COMMUNITY_POSTS = {
  jee: [
    { id: 1, type: 'text', content: 'Hey everyone, how is the preparation for the upcoming mock test going?', date: '10:30 AM', author: 'Aryan Sharma', role: 'student', avatar: 'AS' },
    { id: 2, type: 'text', content: 'Struggling a bit with Rotational Mechanics, but getting there.', date: '10:32 AM', author: 'Kavya Singh', role: 'student', avatar: 'KS' },
    { id: 3, type: 'resource', content: 'Rotational Mechanics - Advanced Problem Set.pdf', size: '2.4 MB', date: '11:00 AM', author: 'Team Aura', role: 'admin', avatar: '✨' },
    { id: 4, type: 'text', content: 'Thanks! This is exactly what I needed.', date: '11:05 AM', author: 'Kavya Singh', role: 'student', avatar: 'KS' },
    { id: 5, type: 'info', content: 'NTA Update: Registration dates have been officially announced. Please check your dashboard.', date: '1:00 PM', author: 'Team Aura', role: 'admin', avatar: '✨' }
  ],
  neet: [
    { id: 1, type: 'resource', content: 'Human Physiology - NCERT Highlights.pdf', size: '4.1 MB', date: '5h ago', author: 'Team Aura', role: 'admin', avatar: '✨' }
  ]
};

export default function Network() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    COMMUNITY_POSTS[activeCommunity].push({
      id: Date.now(), type: 'text', content: chatMessage, date: 'Just now', author: 'You', role: 'student', avatar: 'ME'
    });
    setChatMessage('');
  };

  const renderLeaderboard = () => {
    const q = searchQuery.toLowerCase();
    const filtered = MOCK_LEADERBOARD.filter(u => 
      u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)
    );
    const isSearching = q.length > 0;

    return (
      <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 20 }}>search</span>
          <input 
            type="text" 
            placeholder="Search by name or @handle..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', padding: '14px 16px 14px 48px', 
              background: 'var(--s2)', border: '1px solid var(--card-b)', 
              borderRadius: 'var(--r-lg)', color: 'var(--t1)', fontSize: 15,
              outline: 'none', transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--p)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--card-b)'}
          />
        </div>

        {/* Top 3 Podium (Hidden during search) */}
        {!isSearching && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 16, marginBottom: 16, alignItems: 'end' }}>
            {[MOCK_LEADERBOARD[1], MOCK_LEADERBOARD[0], MOCK_LEADERBOARD[2]].map((user, idx) => (
              <div key={user.id} onClick={() => setSelectedStudent(user)} className="card" style={{ 
                padding: idx === 1 ? '32px 16px' : '24px 16px', 
                textAlign: 'center',
                background: idx === 1 ? 'linear-gradient(180deg, rgba(233,205,110,0.1) 0%, var(--s2) 100%)' : 'var(--s2)',
                border: idx === 1 ? '1px solid rgba(233,205,110,0.3)' : '1px solid var(--card-b)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
                <div style={{ 
                  width: idx === 1 ? 64 : 48, 
                  height: idx === 1 ? 64 : 48, 
                  borderRadius: '50%', 
                  background: idx === 1 ? '#e9cd6e' : (idx === 0 ? '#C0C0C0' : '#CD7F32'),
                  margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000', fontWeight: 800, fontSize: idx === 1 ? 20 : 16,
                  boxShadow: idx === 1 ? '0 0 30px rgba(233,205,110,0.4)' : 'none'
                }}>
                  {user.avatar}
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>{user.name}</h4>
                <p style={{ fontSize: 11, color: 'var(--p)', fontWeight: 700 }}>{user.xp.toLocaleString()} XP</p>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>person_search</span>
              <p>No students found matching "{searchQuery}"</p>
            </div>
          ) : (
            (isSearching ? filtered : filtered.slice(3)).map(user => (
              <div key={user.id} onClick={() => setSelectedStudent(user)} className="card card-hover" style={{ 
                padding: '16px 20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 16,
                background: user.id === 5 ? 'linear-gradient(90deg, rgba(9,205,131,0.1), var(--s2))' : 'var(--s2)',
                border: user.id === 5 ? '1px solid var(--p)' : '1px solid var(--card-b)',
                cursor: 'pointer'
              }}>
                <div style={{ width: 32, fontSize: 16, fontWeight: 800, color: 'var(--t3)', textAlign: 'center' }}>
                  #{user.rank}
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--t2)' }}>
                  {user.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{user.name}</h4>
                    {user.isPro && <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--p)', color: '#000', borderRadius: 4, fontWeight: 800 }}>PRO</span>}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--t4)' }}>{user.handle} • {user.streak}🔥 streak</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--p)' }}>{user.xp.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>XP</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderCommunities = () => {
    if (activeCommunity) {
      const comm = COMMUNITIES.find(c => c.id === activeCommunity);
      const posts = COMMUNITY_POSTS[activeCommunity] || [];
      return (
        <div className="reveal card" style={{ height: 'calc(100vh - 240px)', minHeight: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          
          {/* Chat Header */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--card-b)', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--s2)' }}>
            <button onClick={() => setActiveCommunity(null)} className="btn btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--t3)' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${comm.color}22`, color: comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{comm.icon}</span>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>{comm.title}</h2>
              <p style={{ fontSize: 12, color: 'var(--t4)' }}>{comm.members} Members • Online</p>
            </div>
            <button className="btn btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--t3)' }}>
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>

          {/* Chat Feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, background: 'linear-gradient(180deg, var(--bg) 0%, var(--s2) 100%)' }}>
            {posts.map(post => {
              const isAdmin = post.role === 'admin';
              const isMe = post.author === 'You';
              
              return (
                <div key={post.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  {!isMe && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAdmin ? 'var(--p)' : 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800, color: isAdmin ? '#000' : 'var(--t2)' }}>
                      {post.avatar}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: isAdmin ? comm.color : 'var(--t3)' }}>{post.author}</span>
                        {isAdmin && <span className="material-symbols-outlined" style={{ fontSize: 12, color: comm.color, fontVariationSettings: "'FILL' 1" }}>verified</span>}
                      </div>
                    )}
                    
                    <div style={{ 
                      padding: post.type === 'resource' ? '12px' : '10px 16px', 
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? 'var(--p)' : (isAdmin ? `${comm.color}15` : 'var(--s3)'),
                      border: isAdmin && !isMe ? `1px solid ${comm.color}33` : 'none',
                      color: isMe ? '#000' : 'var(--t1)'
                    }}>
                      {post.type === 'resource' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                            <span className="material-symbols-outlined">description</span>
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{post.content}</p>
                            <p style={{ fontSize: 11, color: isMe ? 'rgba(0,0,0,0.6)' : 'var(--t4)' }}>{post.size} • PDF</p>
                          </div>
                          <button className="btn btn-icon" style={{ background: 'transparent', color: isMe ? '#000' : comm.color, border: 'none', marginLeft: 8 }}>
                            <span className="material-symbols-outlined">download</span>
                          </button>
                        </div>
                      ) : (
                        <p style={{ fontSize: 14, lineHeight: 1.4, fontWeight: isMe ? 600 : 400 }}>{post.content}</p>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, paddingRight: isMe ? 4 : 0, paddingLeft: isMe ? 0 : 4 }}>{post.date}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input Area */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-b)', background: 'var(--s2)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-icon" style={{ background: 'var(--s3)', border: 'none', color: 'var(--t3)', borderRadius: '50%', width: 40, height: 40, flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>attach_file</span>
            </button>
            <form onSubmit={handleSendMessage} style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--s3)', borderRadius: 24, padding: '4px 4px 4px 16px', border: '1px solid var(--card-b)' }}>
              <input 
                type="text" 
                placeholder="Message community..." 
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
      <div className="reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {COMMUNITIES.map(comm => (
          <div key={comm.id} onClick={() => setActiveCommunity(comm.id)} className="card card-hover" style={{ padding: 24, cursor: 'pointer', border: `1px solid ${comm.color}11` }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${comm.color}15`, color: comm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>{comm.icon}</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', marginBottom: 8 }}>{comm.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 16 }}>{comm.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)' }}>{comm.members} Members</span>
              <span className="material-symbols-outlined" style={{ color: comm.color, fontSize: 18 }}>arrow_forward</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStudentProfile = () => {
    if (!selectedStudent) return null;
    const user = selectedStudent;
    return (
      <div className="reveal">
        <button onClick={() => setSelectedStudent(null)} className="btn btn-surface" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Leaderboard
        </button>
        
        {/* Profile Header */}
        <div className="card" style={{ padding: 32, textAlign: 'center', background: 'linear-gradient(180deg, rgba(59,130,246,0.1) 0%, var(--s2) 100%)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--p)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: 28, boxShadow: '0 0 40px rgba(9,205,131,0.3)' }}>
            {user.avatar}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {user.name}
            {user.isPro && <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--p)', color: '#000', borderRadius: 4, fontWeight: 800 }}>PRO</span>}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--t3)', marginBottom: 16 }}>{user.handle}</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Global Rank</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--p)' }}>#{user.rank}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total XP</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>{user.xp.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Streak</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--warn)' }}>{user.streak} 🔥</p>
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Way of Learning</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Learning Style</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--info)' }}>{user.style || 'Balanced'}</p>
          </div>
          
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Focus Split</p>
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--s3)' }}>
              <div style={{ width: `${user.focus?.practice || 50}%`, background: 'var(--purple)', transition: 'width 1s' }} />
              <div style={{ width: `${user.focus?.theory || 50}%`, background: 'var(--teal)', transition: 'width 1s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}><strong style={{ color: 'var(--purple)' }}>{user.focus?.practice || 50}%</strong> Practice</span>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}><strong style={{ color: 'var(--teal)' }}>{user.focus?.theory || 50}%</strong> Theory</span>
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Recent Activity</h3>
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(9, 205, 131, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--p)' }}>emoji_events</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{user.recent || 'Active learning session'}</p>
            <p style={{ fontSize: 12, color: 'var(--t4)' }}>Recent</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>public</span>
              <h1 className="shimmer-text page-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)' }}>
                Peer Network
              </h1>
            </div>
            <p style={{ fontSize: 15, color: 'var(--t3)' }}>Connect, compete, and climb the ranks.</p>
          </div>
          
          <div style={{ textAlign: 'right', background: 'var(--s2)', padding: '12px 20px', borderRadius: 'var(--r-lg)', border: '1px solid var(--card-b)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Your Total XP</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--p)', lineHeight: 1 }}>18,200 <span style={{ fontSize: 14, color: 'var(--t3)' }}>XP</span></p>
          </div>
        </div>
      </Reveal>

      {/* Tabs */}
      {!activeCommunity && !selectedStudent && (
        <Reveal delay={100}>
          <div style={{ display: 'flex', gap: 8, background: 'var(--s2)', padding: 6, borderRadius: 'var(--r-lg)', marginBottom: 24, border: '1px solid var(--card-b)', width: 'fit-content' }}>
            <button 
              onClick={() => setActiveTab('leaderboard')}
              style={{ 
                padding: '10px 24px', 
                borderRadius: 'var(--r-md)',
                background: activeTab === 'leaderboard' ? 'var(--s4)' : 'transparent',
                color: activeTab === 'leaderboard' ? 'var(--t1)' : 'var(--t4)',
                fontSize: 14, fontWeight: 700,
                transition: 'all 0.2s', border: 'none', cursor: 'pointer'
              }}
            >
              Global Leaderboard
            </button>
            <button 
              onClick={() => setActiveTab('communities')}
              style={{ 
                padding: '10px 24px', 
                borderRadius: 'var(--r-md)',
                background: activeTab === 'communities' ? 'var(--s4)' : 'transparent',
                color: activeTab === 'communities' ? 'var(--t1)' : 'var(--t4)',
                fontSize: 14, fontWeight: 700,
                transition: 'all 0.2s', border: 'none', cursor: 'pointer'
              }}
            >
              Official Communities
            </button>
          </div>
        </Reveal>
      )}

      {/* Content Area */}
      <div style={{ position: 'relative', minHeight: 400 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedStudent ? 'student-profile' : activeCommunity ? 'community-view' : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {selectedStudent ? renderStudentProfile() : activeTab === 'leaderboard' && !activeCommunity ? renderLeaderboard() : renderCommunities()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
