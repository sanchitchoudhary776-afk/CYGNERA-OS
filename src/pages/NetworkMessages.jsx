import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MOCK_PEERS, buildUsersList, getStore, updateStore } from './NetworkData';
import { useAuth } from '@context/AuthContext';
import { useApp } from '@context/AppContext';
import { initials } from '@utils';
import { messageService } from '@services/messageService';
import toast from 'react-hot-toast';

// ── Smart reply engine for mock peers & Aura AI Mentor ───────
const SMART_REPLIES = {
  0: [ // Aura AI Mentor
    "I'm here to help! What physics concept, calculus equation, or study routine can I break down for you? 🤖⚡",
    "Great question! In rotational dynamics, the torque vector tau is tau = r x F. Make sure to apply right-hand thumb rule!",
    "Let me break that down for you: 1) Identify the given variables 2) Set up energy conservation 3) Solve for target velocity. Try calculating it now!",
    "Your study consistency is climbing! Keep focusing on active recall and flashcards for maximum retention.",
    "Would you like me to generate a 3-question quick quiz on this topic to test your understanding?"
  ],
  1: [ // Aarav — Physics/JEE
    "That formula makes perfect sense! Let's check out the rotation numericals tonight. 🚀",
    "Exactly! The moment of inertia of a hollow cylinder is indeed MR². Let's practice more.",
    "Are you ready for the mock test tomorrow? Physics is going to be tough.",
    "I just finished the Electrostatics chapter — want my formula sheet? ⚡",
  ],
  2: [ // Ananya — Biology/NEET
    "Thanks! Biology flashcards will make anatomy prep so much easier. 🧬",
    "Great! Did you read the NCERT highlights yet? The diagrams are very important.",
    "I'm setting up a biology quiz block. Want to join? 🌿",
    "Just completed the Human Physiology chapter — 200+ flashcards created!",
  ],
  3: [ // Kabir — Physics
    "Interesting approach! I solved it differently using energy conservation.",
    "Let's discuss the Irodov problem set tonight. Some tricky ones there.",
  ],
  4: [ // Riya — Chemistry
    "Organic chemistry reactions are all about practice. Keep at it! 🧪",
    "The GOC concepts clicked for me after I drew all the mechanisms.",
  ],
  5: [ // Dev — Math
    "That integral has a neat substitution trick. Try t = tan(x/2).",
    "Calculus is beautiful once you see the patterns. Keep going!",
  ],
  6: [ // Priya — Bio
    "NCERT is the bible for NEET Biology. Read every line! 📖",
    "Genetics chapter is scoring if you master Punnett squares.",
  ],
  7: [ // Arjun — Code
    "Balancing coding and JEE is tough but worth it! 💻",
    "Try using graph theory concepts for some Physics problems!",
  ],
  8: [ // Sanchit — Admin
    "Thanks for the feedback! I'll push an update tonight. 🛡️",
    "Glad you're enjoying the platform! More features coming soon.",
  ],
};

function getSmartReply(peerId) {
  const replies = SMART_REPLIES[peerId] || SMART_REPLIES[0];
  return replies[Math.floor(Math.random() * replies.length)];
}

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
  const [msgType, setMsgType] = useState('text'); // 'text' | 'code' | 'doubt'
  const [typingUser, setTypingUser] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Build the users list dynamically
  const allUsers = useMemo(() => buildUsersList(user, progress), [user, progress]);

  // Fetch cloud messages on mount
  useEffect(() => {
    if (myId) {
      messageService.fetchCloudMessages(myId);
    }
  }, [myId]);

  // Subscribe to real-time incoming messages
  useEffect(() => {
    if (myId) {
      messageService.subscribeRealtime(myId, () => {
        setRefreshKey(k => k + 1);
      });
    }
    return () => messageService.unsubscribeRealtime();
  }, [myId]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat !== null) {
      const msgs = messageService.getConversation(myId, activeChat);
      setMessages(msgs);
      messageService.markRead(myId, activeChat);
    }
  }, [activeChat, myId, refreshKey]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [messages, typingUser]);

  // Focus input when chat opens
  useEffect(() => {
    if (activeChat !== null && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeChat]);

  // Simulate reply from mock peers or Aura AI
  const simulateReply = useCallback((chatId) => {
    const peer = MOCK_PEERS.find(u => String(u.id) === String(chatId));
    if (!peer) return;

    setTypingUser(true);
    const delay = peer.isAi ? 800 : 1200 + Math.random() * 1500;

    setTimeout(() => {
      const replyText = getSmartReply(peer.id);
      const replyMsg = messageService.sendMessage(String(chatId), String(myId), replyText);

      setMessages(prev => [...prev, { ...replyMsg, sender_id: String(chatId) }]);
      setTypingUser(false);
      setRefreshKey(k => k + 1);
    }, delay);
  }, [myId]);

  // Send message
  const sendMsg = useCallback((e) => {
    if (e) e.preventDefault();
    if (!msg.trim()) return;

    const extra = msgType !== 'text' ? { type: msgType } : {};
    const sentMsg = messageService.sendMessage(String(myId), String(activeChat), msg.trim(), extra);

    setMessages(prev => [...prev, sentMsg]);
    setMsg('');
    setMsgType('text');
    setRefreshKey(k => k + 1);

    // Trigger simulated reply for mock peers or Aura AI
    const isMockPeer = MOCK_PEERS.some(p => String(p.id) === String(activeChat));
    if (isMockPeer) {
      simulateReply(activeChat);
    }
  }, [msg, msgType, activeChat, myId, simulateReply]);

  // React to a message
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

  // ── Active Chat View ──
  if (activeChat !== null) {
    const chatUser = allUsers.find(u => String(u.id) === String(activeChat)) || { name: 'Peer', avatar: 'PR', online: true };

    return (
      <div className="card" style={{ height: 'calc(100vh - 260px)', minHeight: 460, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: '1px solid var(--card-b)' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-b)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--s2)', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => { setActiveChat(null); setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: '50%' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: chatUser.isAi ? 'linear-gradient(135deg,#10b981,#059669)' : chatUser.isAdmin ? 'linear-gradient(135deg,var(--p),#06b6d4)' : 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: chatUser.isAi || chatUser.isAdmin ? '#000' : 'var(--t2)', fontSize: 14, position: 'relative' }}>
              {chatUser.avatar}
              {chatUser.online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#09cd83', border: '2px solid var(--s2)' }} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>{chatUser.name}</p>
                {chatUser.isAi && <span style={{ fontSize: 9, padding: '2px 6px', background: '#10b981', color: '#000', borderRadius: 4, fontWeight: 800 }}>AI MENTOR</span>}
                {chatUser.isAdmin && !chatUser.isAi && <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>verified</span>}
                {chatUser.isPro && !chatUser.isAdmin && <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--p)', color: '#000', borderRadius: 3, fontWeight: 800 }}>PRO</span>}
              </div>
              <p style={{ fontSize: 11, color: chatUser.online ? 'var(--p)' : 'var(--t4)', margin: 0 }}>
                {chatUser.isAi ? '24/7 Instant Study Assistant' : chatUser.online ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          {/* Chat Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                style={{ padding: '6px 12px 6px 28px', fontSize: 12, background: 'var(--s3)', border: '1px solid var(--card-b)', borderRadius: 16, color: 'var(--t1)', outline: 'none', width: 110, transition: 'all 0.2s' }}
                onFocus={e => e.target.style.width = '160px'}
                onBlur={e => e.target.style.width = '110px'}
              />
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 8, fontSize: 15, color: 'var(--t4)' }}>search</span>
            </div>
          </div>
        </div>

        {/* Messages Feed */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(180deg, var(--bg) 0%, var(--s1) 100%)' }}>
          {/* Privacy Banner */}
          <div style={{ textAlign: 'center', padding: '6px 12px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#60a5fa' }}>lock</span>
              <span style={{ fontSize: 10.5, color: '#60a5fa', fontWeight: 700 }}>Direct messages are encrypted & auto-purge after 24h</span>
            </div>
          </div>

          {(() => {
            const filteredMsgs = searchQuery.trim()
              ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
              : messages;

            if (filteredMsgs.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 44, marginBottom: 12, opacity: 0.4 }}>chat</span>
                  <p style={{ fontSize: 14, margin: 0 }}>
                    {searchQuery ? 'No matching messages found.' : `Start a conversation with ${chatUser.name.split(' ')[0]}! 👋`}
                  </p>
                </div>
              );
            }

            return filteredMsgs.map((m, i) => {
              const isMe = String(m.sender_id) === String(myId);
              const isCode = m.type === 'code';

              return (
                <div
                  key={m.id || i}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '78%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}
                >
                  {/* Emoji Reaction Bar */}
                  {hoveredIndex === i && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -28,
                        right: isMe ? 4 : 'auto',
                        left: isMe ? 'auto' : 4,
                        background: 'var(--s4)',
                        border: '1px solid var(--card-b)',
                        borderRadius: 20,
                        padding: '3px 10px',
                        display: 'flex',
                        gap: 8,
                        zIndex: 10,
                        boxShadow: 'var(--sh-lg)',
                        animation: 'msgReactionIn 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
                      }}
                    >
                      {['👍', '❤️', '🔥', '💡', '💯'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(m.id, emoji)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14, transition: 'transform 0.1s' }}
                          onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    style={{
                      padding: '10px 16px',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe
                        ? 'linear-gradient(135deg, var(--p), var(--p-lt))'
                        : isCode ? '#0d1117' : 'var(--s3)',
                      border: isMe ? 'none' : isCode ? '1px solid #30363d' : '1px solid var(--card-b)',
                      color: isMe ? '#002214' : 'var(--t1)',
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      fontWeight: isMe ? 600 : 400,
                      fontFamily: isCode ? 'monospace' : 'inherit',
                      boxShadow: isMe ? '0 3px 10px rgba(9, 205, 131, 0.15)' : 'none',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {isCode && <span style={{ fontSize: 10, color: '#34d399', display: 'block', marginBottom: 4, fontWeight: 700 }}>// CODE / EQUATION</span>}
                    {m.text}
                  </div>

                  {/* Reaction Badges */}
                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {Object.entries(m.reactions).map(([emoji, count]) => (
                        <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'var(--s4)', border: '1px solid var(--card-b)', borderRadius: 12, padding: '2px 6px', fontSize: 10, color: 'var(--t2)', fontWeight: 700 }}>
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: 'var(--t4)', padding: '0 4px' }}>{relativeTime(m.created_at)}</span>
                    {isMe && <span className="material-symbols-outlined" style={{ fontSize: 12, color: m._pending ? 'var(--t4)' : 'var(--p)' }}>{m._pending ? 'schedule' : 'done_all'}</span>}
                  </div>
                </div>
              );
            });
          })()}

          {/* Typing Indicator */}
          {typingUser && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--s3)', padding: '8px 14px', borderRadius: 16, border: '1px solid var(--card-b)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--p)' }}>{chatUser.name.split(' ')[0]}</span>
              <div className="ai-dots" style={{ display: 'flex', gap: 3 }}><span /><span /><span /></div>
            </div>
          )}
        </div>

        {/* Input Bar & Attachment Tools */}
        <div style={{ borderTop: '1px solid var(--card-b)', background: 'var(--s2)', padding: '10px 16px 14px' }}>
          {/* Preset Helper Bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => setMsgType(msgType === 'code' ? 'text' : 'code')}
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 99,
                border: msgType === 'code' ? '1px solid var(--p)' : '1px solid var(--card-b)',
                background: msgType === 'code' ? 'var(--p-sub)' : 'transparent',
                color: msgType === 'code' ? 'var(--p)' : 'var(--t4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>code</span>
              Code / Formula
            </button>
            <button
              onClick={() => {
                setMsg('Hey, I have a doubt in Physics: ');
                if (inputRef.current) inputRef.current.focus();
              }}
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 99,
                border: '1px solid var(--card-b)',
                background: 'transparent',
                color: 'var(--t4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>help</span>
              Ask Doubt
            </button>
          </div>

          <form onSubmit={sendMsg} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder={msgType === 'code' ? 'Type code snippet or math equation...' : `Message ${chatUser.name.split(' ')[0]}...`}
              style={{ flex: 1, padding: '10px 16px', background: 'var(--s3)', border: '1px solid var(--card-b)', borderRadius: 24, color: 'var(--t1)', fontSize: 13.5, outline: 'none', fontFamily: msgType === 'code' ? 'monospace' : 'inherit' }}
            />
            <button
              type="submit"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: msg.trim() ? 'var(--p)' : 'var(--s4)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: msg.trim() ? '#000' : 'var(--t4)',
                cursor: msg.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            </button>
          </form>
        </div>

        <style>{`
          @keyframes msgReactionIn {
            from { opacity: 0; transform: scale(0.85) translateY(4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Conversation List View ──
  const convos = messageService.getAllConversations(myId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 20 }}>search</span>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search students to message..."
          style={{ width: '100%', padding: '10px 16px 10px 42px', background: 'var(--s2)', border: '1px solid var(--card-b)', borderRadius: 'var(--r-md)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
        />
      </div>

      {/* Instant AI Mentor Feature Banner */}
      <div
        onClick={() => setActiveChat(0)}
        className="card card-hover"
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.04))',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 'var(--r-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer'
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>Aura AI Mentor</span>
            <span style={{ fontSize: 9, padding: '1px 6px', background: '#10b981', color: '#000', borderRadius: 4, fontWeight: 800 }}>ALWAYS ONLINE</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--t3)', margin: '2px 0 0' }}>Instant 24/7 help for physics, chemistry, biology & math doubts.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 11.5 }}>Chat Now</button>
      </div>

      {/* Direct Peer Messages List */}
      <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Student Network Messages</p>

      {allUsers
        .filter(u => !u.isMe && u.id !== 0) // exclude self and AI (which has top banner)
        .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.handle.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(u => {
          const convo = convos[String(u.id)];
          const hasUnread = convo?.unread > 0;

          return (
            <div
              key={u.id}
              onClick={() => setActiveChat(u.id)}
              className="card card-hover"
              style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                borderLeft: hasUnread ? '3px solid var(--p)' : 'none',
                background: 'var(--s2)'
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: u.isAdmin ? 'linear-gradient(135deg,var(--p),#06b6d4)' : 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: u.isAdmin ? '#000' : 'var(--t2)', fontSize: 14, position: 'relative', flexShrink: 0 }}>
                {u.avatar}
                {u.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#09cd83', border: '2px solid var(--s2)' }} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{u.name}</p>
                  {u.isAdmin && <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>verified</span>}
                  {u.isPro && !u.isAdmin && <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--p)', color: '#000', borderRadius: 3, fontWeight: 800 }}>PRO</span>}
                </div>
                <p style={{ fontSize: 12, color: 'var(--t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '3px 0 0' }}>
                  {convo?.lastMessage || u.bio}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {convo?.lastTime && (
                  <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>{relativeTime(convo.lastTime)}</span>
                )}
                {hasUnread && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--p)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#000' }}>
                    {convo.unread}
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
