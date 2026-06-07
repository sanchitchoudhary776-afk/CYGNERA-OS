// ── Network Social Data Layer (Production) ──────────────────────────

// Mock peer profiles for the leaderboard and messaging.
// The current user is dynamically injected by components via `useAuth`.
export const MOCK_PEERS = [
  { id: 1, name: 'Aarav Sharma',     handle: '@aarav_jee',    avatar: 'AS', online: true,  streak: 24, xp: 24500, style: 'Conceptual', bio: 'JEE Advanced aspirant. Physics & Math enthusiast. Solving HC Verma daily.',                isPro: true,  isAdmin: false },
  { id: 2, name: 'Ananya Iyer',      handle: '@ananya_neet',  avatar: 'AI', online: true,  streak: 18, xp: 21200, style: 'Visual',      bio: 'NEET 2026 prep. Biology flashcards expert. Anatomy diagrams are life.',               isPro: true,  isAdmin: false },
  { id: 3, name: 'Kabir Mehta',      handle: '@kabir_phys',   avatar: 'KM', online: false, streak: 12, xp: 19800, style: 'Conceptual', bio: 'Solving Irodov problems daily. Rotational mechanics specialist.',                      isPro: false, isAdmin: false },
  { id: 4, name: 'Riya Patel',       handle: '@riya_chem',    avatar: 'RP', online: true,  streak: 9,  xp: 15400, style: 'Visual',      bio: 'Organic chemistry notes and tricks. GOC master.',                                    isPro: false, isAdmin: false },
  { id: 5, name: 'Dev Kapoor',       handle: '@dev_math',     avatar: 'DK', online: false, streak: 15, xp: 18200, style: 'Kinesthetic', bio: 'Calculus and algebra nerd. Building math intuition one proof at a time.',              isPro: false, isAdmin: false },
  { id: 6, name: 'Priya Nair',       handle: '@priya_bio',    avatar: 'PN', online: true,  streak: 21, xp: 22100, style: 'Reading',     bio: 'NCERT line-by-line reader. Genetics and ecology expert for NEET.',                    isPro: true,  isAdmin: false },
  { id: 7, name: 'Arjun Reddy',      handle: '@arjun_code',   avatar: 'AR', online: false, streak: 7,  xp: 12500, style: 'Kinesthetic', bio: 'Competitive coder + JEE prep. Balancing CS and Physics.',                             isPro: false, isAdmin: false },
  { id: 8, name: 'Sanchit Choudhary',handle: '@sanchit_dev',  avatar: '🛡️', online: true,  streak: 32, xp: 32000, style: 'Conceptual', bio: 'Lead Developer of Axinite OS. Building the future of student productivity.',          isPro: true,  isAdmin: true  },
];

/**
 * Build the full USERS array by merging mock peers with the current user.
 * Automatically sorts by XP (descending) and assigns ranks.
 * @param {object|null} currentUser - The authenticated user from useAuth()
 * @param {object} progress - The user's progress from useApp()
 * @returns {Array} Sorted list of users with ranks
 */
export function buildUsersList(currentUser, progress) {
  const users = MOCK_PEERS.map(u => ({ ...u, isMe: false }));

  if (currentUser) {
    const myName = currentUser.name || currentUser.full_name || currentUser.email?.split('@')[0] || 'You';
    const myInitials = myName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'ME';

    // Calculate XP from progress (100 XP per study hour)
    const myXp = Math.round((progress?.totalHours || 0) * 100) + (progress?.tasksCompleted || 0) * 50 + (progress?.focusSessions || 0) * 25;

    users.push({
      id: currentUser.id || 'me',
      name: myName,
      handle: currentUser.email ? `@${currentUser.email.split('@')[0]}` : '@you',
      avatar: myInitials,
      online: true,
      streak: progress?.streak || 0,
      xp: myXp || 500,
      style: currentUser.learningStyle || 'Conceptual',
      bio: currentUser.goal || 'On a mission to ace every exam.',
      isPro: false,
      isAdmin: false,
      isMe: true,
    });
  }

  // Sort by XP descending and assign ranks
  users.sort((a, b) => b.xp - a.xp);
  users.forEach((u, i) => { u.rank = i + 1; });

  return users;
}

// Legacy export for backward compatibility (empty — use buildUsersList instead)
export const USERS = [];

export const SEED_POSTS = [];

export const SEED_DMS = {};

export const COMMUNITIES = [
  { id: 'jee', title: 'JEE Advanced Basecamp', members: '12.4k', icon: 'functions', color: '#60a5fa', desc: 'Official resources and strategies.' },
  { id: 'neet', title: 'NEET Medical Hub', members: '18.1k', icon: 'medical_services', color: '#09cd83', desc: 'Biology notes, mock tests, and NTA updates.' },
];

export const SEED_COMMUNITY_POSTS = {
  jee: [],
  neet: [],
};

const STORE_KEY = 'axos_network_v5';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    return d || null;
  } catch { return null; }
}

function save(d) {
  localStorage.setItem(STORE_KEY, JSON.stringify(d));
}

export function getStore() {
  let d = load();
  if (!d) {
    d = { following: [], posts: [], dms: {}, myLikes: [], communities: { jee: [], neet: [] } };
    save(d);
  } else if (!d.communities) {
    d.communities = { jee: [], neet: [] };
    save(d);
  }
  return d;
}

export function updateStore(fn) {
  const d = getStore();
  fn(d);
  save(d);
  return d;
}
