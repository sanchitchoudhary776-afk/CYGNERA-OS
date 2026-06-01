import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reveal } from '@components/ui/PremiumUI';
import { Portal } from '@components/ui';
import { USERS, getStore, updateStore } from './NetworkData';
import NetworkFeed from './NetworkFeed';
import NetworkMessages from './NetworkMessages';
import NetworkCommunities from './NetworkCommunities';

const TABS = [
  { id:'leaderboard', icon:'leaderboard', label:'Leaderboard' },
  { id:'feed',        icon:'dynamic_feed', label:'Feed' },
  { id:'messages',    icon:'chat',         label:'Messages' },
  { id:'communities', icon:'groups',       label:'Communities' },
];

export default function Network() {
  const [tab, setTab] = useState('leaderboard');
  const [store, setStore] = useState(getStore);
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState(null);
  const refresh = () => setStore(getStore());

  const isFollowing = (id) => store.following.includes(id);
  const toggleFollow = (id) => {
    updateStore(d => {
      if (d.following.includes(id)) d.following = d.following.filter(x=>x!==id);
      else d.following.push(id);
    });
    refresh();
  };

  // ── Student Profile Modal ─────────────
  const renderProfile = () => {
    if (!profile) return null;
    const u = profile;
    const followed = isFollowing(u.id);
    
    // Custom mock badges based on user stats
    const badges = [];
    if (u.streak > 15) badges.push({ emoji: '🔥', title: 'Consistency King', desc: '15+ days streak' });
    if (u.xp > 20000) badges.push({ emoji: '🎓', title: 'Elite Scholar', desc: '20k+ XP earned' });
    if (u.isPro) badges.push({ emoji: '⭐', title: 'Premium Member', desc: 'Pro subscriber' });
    if (u.style === 'Visual' || u.style === 'Conceptual') badges.push({ emoji: '🧠', title: 'Deep Diver', desc: 'Conceptual focus' });
    if (u.isAdmin) badges.push({ emoji: '🛡️', title: 'System Admin', desc: 'Platform curator' });
    if (badges.length === 0) badges.push({ emoji: '📝', title: 'Active Student', desc: 'Studying daily' });

    return (
      <Portal>
        <div onClick={()=>setProfile(null)} style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--overlay)', padding:20, animation:'modalFadeIn 200ms ease' }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:440, background:'var(--s2)', backdropFilter:'blur(24px)', borderRadius:20, border:'1px solid var(--card-b)', boxShadow:'var(--sh-xl)', overflow:'hidden', animation:'modalCenterIn 300ms var(--bounce) both' }}>
            {/* Banner */}
            <div style={{ height:80, background:'linear-gradient(135deg, rgba(9,205,131,0.2), rgba(59,130,246,0.15))', position:'relative' }}>
              <div style={{ position:'absolute', bottom:-30, left:24, width:60, height:60, borderRadius:'50%', background: u.isAdmin?'linear-gradient(135deg,var(--p),#06b6d4)':'var(--s4)', display:'flex', alignItems:'center', justifyContent:'center', color: u.isAdmin?'#000':'var(--t1)', fontWeight:900, fontSize:22, border:'3px solid var(--s2)', boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}>{u.avatar}</div>
            </div>
            <div style={{ padding:'40px 24px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <h2 style={{ fontSize:20, fontWeight:800, color:'var(--t1)', margin:0 }}>{u.name}</h2>
                {u.isAdmin && <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>verified</span>}
                {u.isPro && !u.isAdmin && <span style={{ fontSize:9, padding:'2px 6px', background:'var(--p)', color:'#000', borderRadius:4, fontWeight:800 }}>PRO</span>}
              </div>
              <p style={{ fontSize:13, color:'var(--t4)', marginBottom:4, marginTop:4 }}>{u.handle}</p>
              <p style={{ fontSize:13, color:'var(--t3)', marginBottom:16, lineHeight:1.5, marginTop:8 }}>{u.bio}</p>
  
              {/* Stat Grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                {[{l:'Rank',v:`#${u.rank}`,c:'var(--p)'},{l:'XP',v:u.xp.toLocaleString(),c:'#60a5fa'},{l:'Streak',v:`${u.streak}🔥`,c:'#e9cd6e'}].map(s=>(
                  <div key={s.l} style={{ textAlign:'center', padding:'10px 8px', borderRadius:12, background:'var(--s3)', border:'1px solid var(--card-b)' }}>
                    <p style={{ fontSize:16, fontWeight:800, color:s.c, margin:0 }}>{s.v}</p>
                    <p style={{ fontSize:9, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:4, marginBottom:0 }}>{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Achievements Section */}
              <p style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, marginTop:0 }}>Achievement Badges</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                {badges.map((badge, bidx) => (
                  <div key={bidx} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--s3)', padding:'8px 12px', borderRadius:10, border:'1px solid var(--card-b)' }}>
                    <span style={{ fontSize:18 }}>{badge.emoji}</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:'var(--t2)', margin:0 }}>{badge.title}</p>
                      <p style={{ fontSize:10, color:'var(--t4)', margin:0 }}>{badge.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
  
              <div style={{ display:'flex', gap:8 }}>
                {!u.isMe && (
                  <button onClick={()=>toggleFollow(u.id)} style={{ flex:1, padding:'10px 0', borderRadius:10, border: followed?'1px solid var(--card-b)':'none', background: followed?'var(--s3)':'var(--p)', color: followed?'var(--t2)':'#000', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 200ms', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>{followed?'person_remove':'person_add'}</span>
                    {followed?'Unfollow':'Follow'}
                  </button>
                )}
                {!u.isMe && followed && (
                  <button onClick={()=>{setProfile(null);setTab('messages');}} style={{ flex:1, padding:'10px 0', borderRadius:10, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)', color:'#60a5fa', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>chat</span>Message
                  </button>
                )}
                {!u.isMe && !followed && (
                  <div style={{ flex:1, padding:'10px 0', borderRadius:10, background:'var(--s3)', border:'1px solid var(--card-b)', color:'var(--t4)', fontWeight:600, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:0.6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>lock</span>Follow to message
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Portal>
    );
  };

  // ── Leaderboard ─────────────────────
  const renderLeaderboard = () => {
    const q = search.toLowerCase();
    const filtered = USERS.filter(u => u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q));
    const searching = q.length > 0;

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Search */}
        <div style={{ position:'relative' }}>
          <span className="material-symbols-outlined" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--t4)', fontSize:20 }}>search</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students..." style={{ width:'100%', padding:'13px 16px 13px 46px', background:'var(--s2)', border:'1px solid var(--card-b)', borderRadius:'var(--r-lg)', color:'var(--t1)', fontSize:14, outline:'none' }} onFocus={e=>e.target.style.borderColor='var(--p)'} onBlur={e=>e.target.style.borderColor='var(--card-b)'} />
        </div>

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--t4)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.4, marginBottom: 12, display: 'block' }}>groups</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t2)', margin: '0 0 4px' }}>No peers yet</p>
            <p style={{ fontSize: 13, margin: 0 }}>The leaderboard will populate as students join the network.</p>
          </div>
        )}

        {/* Podium with spring entry animations */}
        {!searching && filtered.length >= 3 && (
          <div className="network-podium-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'var(--gap-card)', marginBottom:8 }}>
            {[filtered[1], filtered[0], filtered[2]].map((u, idx) => {
              const colors = ['#C0C0C0','#e9cd6e','#CD7F32'];
              const medals = ['🥈', '🥇', '🥉'];
              const isGold = idx===1;
              
              return (
                <motion.div 
                  key={u.id} 
                  onClick={()=>setProfile(u)} 
                  className="card card-hover" 
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1, type: 'spring', stiffness: 120 }}
                  style={{ 
                    padding: isGold?'28px 14px':'20px 14px', 
                    textAlign:'center', 
                    cursor:'pointer', 
                    background: isGold?'linear-gradient(180deg,rgba(233,205,110,0.06),var(--s2))':undefined, 
                    border: isGold?'1px solid rgba(233,205,110,0.25)':undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div style={{ width: isGold?60:44, height: isGold?60:44, borderRadius:'50%', background:colors[idx], margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', color:'#000', fontWeight:800, fontSize: isGold?20:15, boxShadow: isGold?'0 0 24px rgba(233,205,110,0.4)':'none', position:'relative' }}>
                    {u.avatar}
                    {u.online && <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:'#09cd83', border:'2px solid var(--s2)' }} />}
                    <div style={{ position:'absolute', top:-8, right:-8, fontSize:14 }}>{medals[idx]}</div>
                  </div>
                  <p style={{ fontSize:13, fontWeight:800, color:'var(--t1)', marginBottom:2, marginTop:0 }}>{u.name}</p>
                  <p style={{ fontSize:11, color:'var(--p)', fontWeight:700, marginBottom:10, marginTop:0 }}>{u.xp.toLocaleString()} XP</p>
                  {!u.isMe && (
                    <button onClick={e=>{e.stopPropagation();toggleFollow(u.id);}} style={{ width:'100%', padding:'6px 0', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 150ms', border: isFollowing(u.id)?'1px solid var(--card-b)':'1px solid var(--p)', background: isFollowing(u.id)?'transparent':'var(--p)', color: isFollowing(u.id)?'var(--t3)':'#000' }}>
                      {isFollowing(u.id)?'Following':'Follow'}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* List with staggered animations */}
        {filtered.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {(searching ? filtered : filtered.slice(filtered.length >= 3 ? 3 : 0)).map((u, lIdx) => (
            <motion.div 
              key={u.id} 
              onClick={()=>setProfile(u)} 
              className="card card-hover" 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(lIdx * 0.05, 0.4) }}
              style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', background: u.isMe?'linear-gradient(90deg,rgba(9,205,131,0.08),var(--s2))':undefined, border: u.isMe?'1px solid rgba(9,205,131,0.3)':undefined }}
            >
              <span style={{ width:28, fontSize:14, fontWeight:800, color:'var(--t4)', textAlign:'center' }}>#{u.rank}</span>
              <div style={{ width:40, height:40, borderRadius:'50%', background: u.isAdmin?'linear-gradient(135deg,var(--p),#06b6d4)':'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color: u.isAdmin?'#000':'var(--t2)', fontSize:13, position:'relative', flexShrink:0 }}>
                {u.avatar}
                {u.online && <div style={{ position:'absolute', bottom:1, right:1, width:9, height:9, borderRadius:'50%', background:'#09cd83', border:'2px solid var(--s2)' }} />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>{u.name}</span>
                  {u.isAdmin && <span className="material-symbols-outlined" style={{ fontSize:13, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>verified</span>}
                  {u.isPro && !u.isAdmin && <span style={{ fontSize:9, padding:'1px 5px', background:'var(--p)', color:'#000', borderRadius:3, fontWeight:800 }}>PRO</span>}
                </div>
                <p style={{ fontSize:11, color:'var(--t4)', margin:'3px 0 0' }}>{u.handle} • {u.streak}🔥 • {u.style}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                {!u.isMe && (
                  <button onClick={e=>{e.stopPropagation();toggleFollow(u.id);}} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', border: isFollowing(u.id)?'1px solid var(--card-b)':'1px solid var(--p)', background: isFollowing(u.id)?'transparent':'var(--p)', color: isFollowing(u.id)?'var(--t3)':'#000', transition:'all 150ms' }}>
                    {isFollowing(u.id)?'Following':'Follow'}
                  </button>
                )}
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontSize:14, fontWeight:800, color:'var(--p)', margin:0 }}>{u.xp.toLocaleString()}</p>
                  <p style={{ fontSize:9, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>XP</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    );
  };

  // ── Notification badge ─────────────
  const msgCount = Object.values(store.dms).reduce((a, m) => a + m.length, 0);

  return (
    <div className="network-container" style={{ width: '100%', maxWidth: 'min(100%, 840px)', margin: '0 auto' }}>
      <style>{`
        @keyframes modalFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes modalCenterIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        
        .network-tabs::-webkit-scrollbar {
          display: none;
        }
        
        @media (max-width: 640px) {
          .network-podium-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .network-tabs {
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>

      {/* Header */}
      <Reveal>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'var(--gap-page)', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:2 }}>
              <span className="material-symbols-outlined" style={{ fontSize:28, color:'var(--p)', fontVariationSettings:"'FILL' 1" }}>public</span>
              <h1 className="shimmer-text page-title">Peer Network</h1>
            </div>
            <p style={{ fontSize:14, color:'var(--t3)', margin:'4px 0 0' }}>Connect, compete, and climb the ranks.</p>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ textAlign:'center', background:'var(--s2)', padding:'8px 16px', borderRadius:'var(--r-lg)', border:'1px solid var(--card-b)' }}>
              <p style={{ fontSize:9, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Following</p>
              <p style={{ fontSize:18, fontWeight:800, color:'var(--p)', lineHeight:1, margin:'2px 0 0' }}>{store.following.length}</p>
            </div>
            <div style={{ textAlign:'center', background:'var(--s2)', padding:'8px 16px', borderRadius:'var(--r-lg)', border:'1px solid var(--card-b)' }}>
              <p style={{ fontSize:9, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Peers</p>
              <p style={{ fontSize:18, fontWeight:800, color:'#60a5fa', lineHeight:1, margin:'2px 0 0' }}>{USERS.length}</p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Tabs */}
      <Reveal delay={100}>
        <div className="network-tabs" style={{ display:'flex', gap:4, background:'var(--s2)', padding:6, borderRadius:'var(--r-lg)', marginBottom:20, border:'1px solid var(--card-b)', overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, flexShrink:0, minWidth:'110px', padding:'10px 16px', borderRadius:'var(--r-md)', display:'flex', alignItems:'center', justifyContent:'center', gap:7, background: tab===t.id?'var(--p-sub)':'transparent', color: tab===t.id?'var(--p)':'var(--t4)', fontSize:13, fontWeight:700, border:'none', cursor:'pointer', transition:'all 200ms', position:'relative' }}>
              <span className="material-symbols-outlined" style={{ fontSize:18, fontVariationSettings: tab===t.id?"'FILL' 1":"'FILL' 0" }}>{t.icon}</span>
              {t.label}
              {t.id==='messages' && msgCount>0 && <div style={{ position:'absolute', top:6, right:16, width:6, height:6, borderRadius:'50%', background:'var(--p)' }} />}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.15 }}>
          {tab === 'leaderboard' && renderLeaderboard()}
          {tab === 'feed' && <NetworkFeed />}
          {tab === 'messages' && <NetworkMessages />}
          {tab === 'communities' && <NetworkCommunities />}
        </motion.div>
      </AnimatePresence>

      {/* Profile Modal */}
      {renderProfile()}
    </div>
  );
}
