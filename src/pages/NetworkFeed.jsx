import { useState, useMemo } from 'react';
import { buildUsersList, getStore, updateStore } from './NetworkData';
import { useAuth } from '@context/AuthContext';
import { useApp } from '@context/AppContext';
import { initials } from '@utils';
import toast from 'react-hot-toast';

const SUBJ_COLORS = {
  Physics: '#60a5fa',
  Biology: '#09cd83',
  Mathematics: '#a78bfa',
  Chemistry: '#f59e0b',
  'Computer Science': '#ec4899',
  General: '#94a3b8'
};

const TYPE_ICONS = {
  question: 'help',
  poll: 'poll',
  achievement: 'emoji_events',
  post: 'article'
};

const TYPE_LABELS = {
  question: 'Quora Doubt',
  poll: 'Live Poll',
  achievement: 'Win / Milestone',
  post: 'Discussion'
};

export default function NetworkFeed() {
  const { user } = useAuth();
  const { progress } = useApp();
  const myName = user?.name || 'You';
  const myAvatar = initials(myName);
  const USERS = useMemo(() => buildUsersList(user, progress), [user, progress]);

  const [store, setStore] = useState(getStore);
  const [showCompose, setShowCompose] = useState(false);
  const [postType, setPostType] = useState('question'); // 'question' | 'poll' | 'achievement' | 'post'
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postSubject, setPostSubject] = useState('Physics');
  const [postDifficulty, setPostDifficulty] = useState('JEE Advanced');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [commentText, setCommentText] = useState({});
  const [feedFilter, setFeedFilter] = useState('all'); // 'all' | 'question' | 'unanswered' | 'poll' | 'achievement' | 'saved'
  const [subjectFilter, setSubjectFilter] = useState('all');

  const refresh = () => setStore(getStore());

  // ── Karma Voting (Upvote / Downvote) ────────────────────────
  const handleVote = (pid, type) => {
    updateStore(d => {
      if (!d.myVotes) d.myVotes = {};
      const current = d.myVotes[pid];
      const p = d.posts.find(x => x.id === pid);
      if (!p) return;

      if (current === type) {
        // Toggle off
        delete d.myVotes[pid];
        if (type === 'up') p.upvotes = Math.max(0, (p.upvotes || 0) - 1);
        else p.downvotes = Math.max(0, (p.downvotes || 0) - 1);
      } else {
        // Remove previous vote if any
        if (current === 'up') p.upvotes = Math.max(0, (p.upvotes || 0) - 1);
        if (current === 'down') p.downvotes = Math.max(0, (p.downvotes || 0) - 1);

        d.myVotes[pid] = type;
        if (type === 'up') p.upvotes = (p.upvotes || 0) + 1;
        else p.downvotes = (p.downvotes || 0) + 1;
      }
    });
    refresh();
  };

  // ── Bookmark / Save Post ───────────────────────────────────
  const toggleSave = (pid) => {
    updateStore(d => {
      if (!d.savedPosts) d.savedPosts = [];
      if (d.savedPosts.includes(pid)) {
        d.savedPosts = d.savedPosts.filter(id => id !== pid);
        toast.success('Removed from bookmarks');
      } else {
        d.savedPosts.push(pid);
        toast.success('Saved to bookmarks 🔖');
      }
    });
    refresh();
  };

  // ── Vote on Interactive Poll ───────────────────────────────
  const handlePollVote = (pid, optionId) => {
    updateStore(d => {
      if (!d.myPollVotes) d.myPollVotes = {};
      if (d.myPollVotes[pid]) return; // Already voted

      const p = d.posts.find(x => x.id === pid);
      if (!p || !p.pollOptions) return;

      const opt = p.pollOptions.find(o => o.id === optionId);
      if (opt) {
        opt.votes = (opt.votes || 0) + 1;
        p.totalVotes = (p.totalVotes || 0) + 1;
        d.myPollVotes[pid] = optionId;
      }
    });
    refresh();
    toast.success('Vote recorded!');
  };

  // ── Submit New Post / Question / Poll ──────────────────────
  const submitPost = () => {
    if (postType === 'question' && !postTitle.trim()) {
      toast.error('Please enter a question title.');
      return;
    }
    if (!postContent.trim() && !postTitle.trim()) {
      toast.error('Please enter content.');
      return;
    }

    updateStore(d => {
      const newObj = {
        id: 'p_' + Date.now(),
        userId: 'me',
        type: postType,
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        upvotes: 1,
        downvotes: 0,
        comments: [],
        time: 'Just now',
        authorName: myName,
        authorAvatar: myAvatar,
        subject: postSubject || 'General',
        difficulty: postType === 'question' ? postDifficulty : undefined,
      };

      if (postType === 'poll') {
        const validOpts = pollOptions.filter(o => o.trim()).map((t, i) => ({ id: `opt_${Date.now()}_${i}`, text: t.trim(), votes: 0 }));
        if (validOpts.length < 2) {
          toast.error('Please provide at least 2 poll options.');
          return;
        }
        newObj.pollOptions = validOpts;
        newObj.totalVotes = 0;
      }

      d.posts.unshift(newObj);
      d.myVotes[newObj.id] = 'up';
    });

    setPostTitle('');
    setPostContent('');
    setPollOptions(['', '']);
    setShowCompose(false);
    refresh();
    toast.success('Published to Peer Network! 🚀');
  };

  // ── Add Answer / Comment ───────────────────────────────────
  const addComment = (pid) => {
    const txt = commentText[pid];
    if (!txt?.trim()) return;
    updateStore(d => {
      const p = d.posts.find(x => x.id === pid);
      if (p) {
        if (!p.comments) p.comments = [];
        p.comments.push({
          id: 'c_' + Date.now(),
          userId: 'me',
          text: txt.trim(),
          time: 'Just now',
          authorName: myName,
          authorAvatar: myAvatar,
          upvotes: 0,
          isAccepted: false
        });
      }
    });
    setCommentText(prev => ({ ...prev, [pid]: '' }));
    refresh();
    toast.success('Answer submitted!');
  };

  // ── Mark Answer as Accepted Solution ───────────────────────
  const toggleMarkAccepted = (pid, cid) => {
    updateStore(d => {
      const p = d.posts.find(x => x.id === pid);
      if (!p || !p.comments) return;

      p.comments.forEach(c => {
        if (c.id === cid) {
          c.isAccepted = !c.isAccepted;
        } else {
          c.isAccepted = false; // Only one verified solution per doubt
        }
      });
    });
    refresh();
    toast.success('Updated verified solution badge!');
  };

  // ── Filter Posts ───────────────────────────────────────────
  const filteredPosts = store.posts.filter(p => {
    // Category filter
    if (feedFilter === 'question' && p.type !== 'question') return false;
    if (feedFilter === 'unanswered' && (p.type !== 'question' || (p.comments && p.comments.some(c => c.isAccepted)))) return false;
    if (feedFilter === 'poll' && p.type !== 'poll') return false;
    if (feedFilter === 'achievement' && p.type !== 'achievement') return false;
    if (feedFilter === 'saved' && !(store.savedPosts || []).includes(p.id)) return false;

    // Subject filter
    if (subjectFilter !== 'all' && p.subject !== subjectFilter) return false;

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Compose Trigger Card ── */}
      {!showCompose ? (
        <div
          onClick={() => setShowCompose(true)}
          className="card card-hover"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            border: '1px solid var(--card-b-h)',
            background: 'var(--s2)'
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--p-lt), var(--p))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#002214',
              fontWeight: 800,
              fontSize: 15,
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(9, 205, 131, 0.2)'
            }}
          >
            {myAvatar}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 700, margin: 0 }}>
              Ask a Doubt or share a study tip with peers...
            </p>
            <p style={{ color: 'var(--t4)', fontSize: 11.5, margin: '2px 0 0' }}>
              Quora-style Q&A • Verified Solutions • Interactive Polls
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help</span>
            Ask Doubt
          </button>
        </div>
      ) : (
        /* ── Full Quora & Social Post Composer Modal ── */
        <div className="card" style={{ padding: 22, border: '1px solid var(--p)', background: 'var(--s2)', animation: 'fadeIn 200ms ease' }}>
          {/* Post Type Selector Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'question', label: 'Ask Doubt (Quora)', icon: 'help' },
              { key: 'poll', label: 'Create Poll', icon: 'poll' },
              { key: 'achievement', label: 'Win / Milestone', icon: 'emoji_events' },
              { key: 'post', label: 'Discussion', icon: 'article' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setPostType(t.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 99,
                  border: postType === t.key ? '1px solid var(--p)' : '1px solid var(--card-b)',
                  background: postType === t.key ? 'var(--p-sub)' : 'transparent',
                  color: postType === t.key ? 'var(--p)' : 'var(--t3)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Quora Title Input */}
          {(postType === 'question' || postType === 'poll') && (
            <input
              className="input"
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
              placeholder={postType === 'question' ? 'Question Title: What concept or formula is tripping you up?' : 'Poll Question: Ask the community...'}
              style={{ padding: '11px 16px', fontSize: 14, fontWeight: 700, marginBottom: 12, borderRadius: 12 }}
            />
          )}

          {/* Additional Content Textarea */}
          <textarea
            value={postContent}
            onChange={e => setPostContent(e.target.value)}
            placeholder={
              postType === 'question'
                ? 'Add context, equation details, or steps you already tried...'
                : postType === 'poll'
                ? 'Optional description or context for the poll...'
                : postType === 'achievement'
                ? 'Share your milestone! NCERT highlights completed? High score in mock test? 🎉'
                : 'Write an update or explanation for the peer community...'
            }
            style={{
              width: '100%',
              minHeight: postType === 'question' ? 80 : 100,
              background: 'var(--s3)',
              border: '1px solid var(--card-b)',
              borderRadius: 12,
              padding: 14,
              color: 'var(--t1)',
              fontSize: 13.5,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              marginBottom: 12
            }}
          />

          {/* Poll Options Input (Poll Mode Only) */}
          {postType === 'poll' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', margin: 0 }}>Poll Options</p>
              {pollOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    value={opt}
                    onChange={e => {
                      const copy = [...pollOptions];
                      copy[i] = e.target.value;
                      setPollOptions(copy);
                    }}
                    placeholder={`Option ${i + 1}`}
                    style={{ padding: '8px 12px', fontSize: 12.5, flex: 1, borderRadius: 8 }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    color: 'var(--p)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                  Add Option
                </button>
              )}
            </div>
          )}

          {/* Metadata Bar (Subject & Difficulty) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={postSubject}
                onChange={e => setPostSubject(e.target.value)}
                style={{
                  background: 'var(--s3)',
                  border: '1px solid var(--card-b)',
                  borderRadius: 10,
                  padding: '6px 12px',
                  fontSize: 12,
                  color: 'var(--t1)',
                  outline: 'none',
                  fontWeight: 700
                }}
              >
                {Object.keys(SUBJ_COLORS).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {postType === 'question' && (
                <select
                  value={postDifficulty}
                  onChange={e => setPostDifficulty(e.target.value)}
                  style={{
                    background: 'var(--s3)',
                    border: '1px solid var(--card-b)',
                    borderRadius: 10,
                    padding: '6px 12px',
                    fontSize: 12,
                    color: 'var(--t2)',
                    outline: 'none'
                  }}
                >
                  <option value="JEE Advanced">JEE Advanced</option>
                  <option value="JEE Main">JEE Main</option>
                  <option value="NEET">NEET</option>
                  <option value="Olympiad">Olympiad</option>
                  <option value="Foundation">Foundation</option>
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowCompose(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: 'var(--s3)',
                  border: '1px solid var(--card-b)',
                  color: 'var(--t3)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitPost}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
                Publish Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feed Filter Bar & Subject Tags ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {[
            { id: 'all', label: 'All Discussions', icon: 'dynamic_feed' },
            { id: 'question', label: 'Quora Doubts ❓', icon: 'help' },
            { id: 'unanswered', label: 'Unanswered 🟢', icon: 'pending_actions' },
            { id: 'poll', label: 'Polls 📊', icon: 'poll' },
            { id: 'achievement', label: 'Wins 🏆', icon: 'emoji_events' },
            { id: 'saved', label: 'Bookmarks 🔖', icon: 'bookmark' },
          ].map(f => {
            const active = feedFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFeedFilter(f.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 14,
                  border: active ? '1px solid var(--p)' : '1px solid var(--card-b)',
                  background: active ? 'var(--p)' : 'var(--s2)',
                  color: active ? '#000' : 'var(--t3)',
                  fontSize: 12,
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Subject Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Subject:</span>
          {['all', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science'].map(sub => {
            const active = subjectFilter === sub;
            const color = SUBJ_COLORS[sub] || 'var(--p)';
            return (
              <button
                key={sub}
                onClick={() => setSubjectFilter(sub)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 99,
                  border: active ? `1px solid ${color}` : '1px solid var(--card-b)',
                  background: active ? `${color}22` : 'transparent',
                  color: active ? color : 'var(--t4)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {sub === 'all' ? 'All Subjects' : sub}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Feed Items List ── */}
      {filteredPosts.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--t4)', border: '1px solid var(--card-b)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 44, marginBottom: 8, opacity: 0.5 }}>search_off</span>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--t2)' }}>No posts match this filter</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>Be the first student to start a doubt discussion or poll!</p>
        </div>
      )}

      {filteredPosts.map(post => {
        const author = post.authorName
          ? { name: post.authorName, avatar: post.authorAvatar || '??', handle: '', isAdmin: false, isPro: false, isMe: post.userId === 'me' }
          : (USERS.find(u => String(u.id) === String(post.userId)) || { avatar: '??', name: 'User', handle: '', isAdmin: false, isPro: false });

        const myVote = (store.myVotes || {})[post.id];
        const isSaved = (store.savedPosts || []).includes(post.id);
        const sc = SUBJ_COLORS[post.subject] || 'var(--p)';
        const score = (post.upvotes || 0) - (post.downvotes || 0);

        // Find accepted solution if any
        const acceptedComment = (post.comments || []).find(c => c.isAccepted);

        return (
          <div
            key={post.id}
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              border: acceptedComment ? '1px solid rgba(9, 205, 131, 0.4)' : '1px solid var(--card-b)',
              background: 'var(--s2)',
              boxShadow: acceptedComment ? '0 4px 20px rgba(9, 205, 131, 0.08)' : 'none'
            }}
          >
            {/* Header / Badges */}
            <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: author.isAdmin ? 'linear-gradient(135deg,var(--p),#06b6d4)' : 'var(--s3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: author.isAdmin ? '#000' : 'var(--t2)',
                  fontWeight: 800,
                  fontSize: 14,
                  flexShrink: 0
                }}
              >
                {author.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{author.name}</span>
                  {author.isAdmin && <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--p)', fontVariationSettings: "'FILL' 1" }}>verified</span>}
                  {author.isPro && !author.isAdmin && <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--p)', color: '#000', borderRadius: 3, fontWeight: 800 }}>PRO</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px 8px', fontSize: 11, color: 'var(--t4)', flexWrap: 'wrap' }}>
                  <span>{post.time}</span>
                  {post.type !== 'post' && (
                    <>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700, color: post.type === 'question' ? '#60a5fa' : post.type === 'poll' ? '#f59e0b' : 'var(--p)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{TYPE_ICONS[post.type]}</span>
                        {TYPE_LABELS[post.type]}
                      </span>
                    </>
                  )}
                  {post.difficulty && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--t3)', fontWeight: 700 }}>
                      {post.difficulty}
                    </span>
                  )}
                </div>
              </div>

              {/* Subject Tag */}
              {sc && (
                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: `${sc}18`, color: sc, fontWeight: 800, border: `1px solid ${sc}33` }}>
                  {post.subject}
                </span>
              )}
            </div>

            {/* Main Content Area */}
            <div style={{ padding: '12px 20px 16px' }}>
              {/* Question Title (Quora Style) */}
              {post.title && (
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', margin: '0 0 8px 0', lineHeight: 1.35 }}>
                  {post.title}
                </h3>
              )}

              {/* Body Text */}
              <p style={{ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {post.content}
              </p>

              {/* Poll Interface */}
              {post.type === 'poll' && post.pollOptions && (() => {
                const myVoteOpt = (store.myPollVotes || {})[post.id];
                const hasVoted = !!myVoteOpt;
                const total = post.totalVotes || 0;

                return (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {post.pollOptions.map(opt => {
                      const isSelected = myVoteOpt === opt.id;
                      const pct = total > 0 ? Math.round(((opt.votes || 0) / total) * 100) : 0;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => !hasVoted && handlePollVote(post.id, opt.id)}
                          style={{
                            position: 'relative',
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: isSelected ? '1.5px solid var(--p)' : '1px solid var(--card-b)',
                            background: 'var(--s3)',
                            cursor: hasVoted ? 'default' : 'pointer',
                            overflow: 'hidden',
                            transition: 'all 0.2s'
                          }}
                        >
                          {/* Animated Progress Bar Fill */}
                          {hasVoted && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: '0 auto 0 0',
                                width: `${pct}%`,
                                background: isSelected ? 'rgba(9, 205, 131, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                                transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
                              }}
                            />
                          )}

                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--p)' : 'var(--t1)' }}>
                              {opt.text} {isSelected && '✓'}
                            </span>
                            {hasVoted && (
                              <span style={{ fontSize: 12, fontWeight: 800, color: isSelected ? 'var(--p)' : 'var(--t4)' }}>
                                {pct}% ({opt.votes || 0})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <p style={{ fontSize: 11, color: 'var(--t4)', margin: '4px 0 0', fontStyle: 'italic' }}>
                      {total} total vote{total !== 1 ? 's' : ''} {hasVoted ? '• Vote recorded' : '• Click an option to vote'}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Actions Bar (Upvote / Downvote Karma + Comments + Save) */}
            <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              {/* Reddit/Quora Style Karma Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--s3)', padding: '2px 6px', borderRadius: 99, border: '1px solid var(--card-b)' }}>
                <button
                  onClick={() => handleVote(post.id, 'up')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: myVote === 'up' ? '#10b981' : 'var(--t4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                    transition: 'transform 0.1s'
                  }}
                  title="Upvote"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontWeight: 'bold' }}>keyboard_arrow_up</span>
                </button>

                <span style={{ fontSize: 12.5, fontWeight: 800, color: myVote === 'up' ? '#10b981' : myVote === 'down' ? '#f43f5e' : 'var(--t2)', padding: '0 4px' }}>
                  {score}
                </span>

                <button
                  onClick={() => handleVote(post.id, 'down')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: myVote === 'down' ? '#f43f5e' : 'var(--t4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                    transition: 'transform 0.1s'
                  }}
                  title="Downvote"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontWeight: 'bold' }}>keyboard_arrow_down</span>
                </button>
              </div>

              {/* Answers / Comments Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--t3)', fontSize: 12.5, fontWeight: 700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>question_answer</span>
                  {post.comments?.length || 0} {post.type === 'question' ? 'Answers' : 'Comments'}
                </span>

                {/* Bookmark Button */}
                <button
                  onClick={() => toggleSave(post.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isSaved ? 'var(--p)' : 'var(--t4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}>bookmark</span>
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>

            {/* Answers & Solution Thread (Quora Style) */}
            {post.comments && post.comments.length > 0 && (
              <div style={{ borderTop: '1px solid var(--card-b)', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--s1)' }}>
                {post.comments.map(c => {
                  const ca = c.authorName
                    ? { name: c.authorName, avatar: c.authorAvatar || '??' }
                    : (USERS.find(u => String(u.id) === String(c.userId)) || { avatar: '??', name: 'User' });

                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: c.isAccepted ? '12px 14px' : '0',
                        borderRadius: 12,
                        background: c.isAccepted ? 'rgba(9, 205, 131, 0.06)' : 'transparent',
                        border: c.isAccepted ? '1px solid rgba(9, 205, 131, 0.25)' : 'none',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--t2)', flexShrink: 0 }}>
                        {ca.avatar}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--t1)' }}>{ca.name}</span>
                            {c.isAccepted && (
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--p)', color: '#000', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>verified</span>
                                Verified Solution
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--t4)' }}>{c.time}</span>
                        </div>

                        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '4px 0 6px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {c.text}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Toggle Verified Solution Button for post author or admins */}
                          {post.type === 'question' && (
                            <button
                              onClick={() => toggleMarkAccepted(post.id, c.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: c.isAccepted ? 'var(--p)' : 'var(--t4)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{c.isAccepted ? 'check_circle' : 'radio_button_unchecked'}</span>
                              {c.isAccepted ? 'Solution' : 'Mark as Solution'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Answer Input */}
            <div style={{ borderTop: '1px solid var(--card-b)', padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--s2)' }}>
              <input
                value={commentText[post.id] || ''}
                onChange={e => setCommentText(p => ({ ...p, [post.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                placeholder={post.type === 'question' ? 'Write an answer or solution...' : 'Add a comment...'}
                style={{ flex: 1, background: 'var(--s3)', border: '1px solid var(--card-b)', borderRadius: 18, padding: '8px 14px', outline: 'none', color: 'var(--t1)', fontSize: 13 }}
              />
              {(commentText[post.id] || '').trim() && (
                <button
                  onClick={() => addComment(post.id)}
                  className="btn btn-primary"
                  style={{ padding: '6px 16px', fontSize: 12.5, borderRadius: 14 }}
                >
                  Submit
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
