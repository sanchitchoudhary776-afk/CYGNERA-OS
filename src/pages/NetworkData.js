// ── Network Social Data Layer (Production / Quora & Social Platform) ──

// Mock peer profiles for the leaderboard, Q&A, and messaging.
export const MOCK_PEERS = [
  { id: 0, name: 'Aura AI Mentor',   handle: '@aura_ai',      avatar: '🤖', online: true,  streak: 99, xp: 99999, style: 'AI Assistant', bio: 'Your 24/7 AI Study Mentor & Problem Solver. Ask me any doubt or concept!',    isPro: true,  isAdmin: true, isAi: true },
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
 */
export function buildUsersList(currentUser, progress) {
  const users = MOCK_PEERS.map(u => ({ ...u, isMe: false }));

  if (currentUser) {
    const myName = currentUser.name || currentUser.full_name || currentUser.email?.split('@')[0] || 'You';
    const myInitials = myName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'ME';
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

export const USERS = [];

// Seed Quora-style Doubts, Polls, and Social Posts
export const SEED_POSTS = [
  {
    id: 'p_seed_1',
    userId: 1,
    type: 'question',
    title: 'How do you intuitive grasp moment of inertia for non-uniform rods?',
    content: 'I keep getting confused when calculating integral values for density lambda(x) = k*x^2. Should I always integrate from -L/2 to L/2 or 0 to L depending on the axis?',
    upvotes: 42,
    downvotes: 1,
    subject: 'Physics',
    difficulty: 'JEE Advanced',
    time: '2 hours ago',
    authorName: 'Aarav Sharma',
    authorAvatar: 'AS',
    comments: [
      {
        id: 'c_seed_1',
        userId: 0,
        text: 'Always define your coordinate origin at the axis of rotation! If the axis is at one end, integrate x from 0 to L with dI = dm * x^2 where dm = lambda(x) dx. If axis is at the center, integrate x from -L/2 to +L/2. You can also apply Parallel Axis Theorem: I_axis = I_cm + M*d^2!',
        time: '1 hour ago',
        authorName: 'Aura AI Mentor',
        authorAvatar: '🤖',
        isAccepted: true,
        upvotes: 28
      },
      {
        id: 'c_seed_2',
        userId: 3,
        text: 'Aura explained it perfectly! Just make sure lambda(x) is written relative to your chosen origin.',
        time: '45 mins ago',
        authorName: 'Kabir Mehta',
        authorAvatar: 'KM',
        upvotes: 7
      }
    ]
  },
  {
    id: 'p_seed_2',
    userId: 2,
    type: 'question',
    title: 'What is the best technique to remember NCERT Biology line-by-line for NEET?',
    content: 'Plant Physiology and Genetics chapters have so many subtle facts. How do high scorers review 250+ pages effectively without forgetting numbers and dates?',
    upvotes: 35,
    downvotes: 0,
    subject: 'Biology',
    difficulty: 'NEET',
    time: '4 hours ago',
    authorName: 'Ananya Iyer',
    authorAvatar: 'AI',
    comments: [
      {
        id: 'c_seed_3',
        userId: 6,
        text: 'Active recall + Anki/Axinite Flashcards! Highlight only keywords in NCERT, create Cloze deletion cards, and revise them every 3 days. Solved 95% of NEET Bio PYQs this way!',
        time: '3 hours ago',
        authorName: 'Priya Nair',
        authorAvatar: 'PN',
        isAccepted: true,
        upvotes: 19
      }
    ]
  },
  {
    id: 'p_seed_3',
    userId: 4,
    type: 'poll',
    title: 'Which Organic Chemistry topic causes the maximum negative marks in tests?',
    content: 'Cast your vote and drop your best tip for mastering it in the comments below!',
    pollOptions: [
      { id: 'opt_1', text: 'GOC & Reaction Mechanisms', votes: 142 },
      { id: 'opt_2', text: 'Aldehydes, Ketones & Carboxylic Acids', votes: 189 },
      { id: 'opt_3', text: 'Stereoisomerism & Optical Rotation', votes: 215 },
      { id: 'opt_4', text: 'Reagents & Named Reactions', votes: 98 }
    ],
    totalVotes: 644,
    upvotes: 56,
    downvotes: 2,
    subject: 'Chemistry',
    difficulty: 'JEE & NEET',
    time: '6 hours ago',
    authorName: 'Riya Patel',
    authorAvatar: 'RP',
    comments: []
  },
  {
    id: 'p_seed_4',
    userId: 8,
    type: 'achievement',
    title: '🏆 30-Day Deep Focus Streak Milestone!',
    content: 'Just completed 30 consecutive days of 4+ hours deep focus study sessions on Axinite OS! Staying consistent with smart study tools changes everything.',
    upvotes: 89,
    downvotes: 0,
    subject: 'General',
    time: '12 hours ago',
    authorName: 'Sanchit Choudhary',
    authorAvatar: '🛡️',
    comments: [
      {
        id: 'c_seed_4',
        userId: 1,
        text: 'Huge congrats! Incredible streak discipline 🔥',
        time: '10 hours ago',
        authorName: 'Aarav Sharma',
        authorAvatar: 'AS',
        upvotes: 12
      }
    ]
  }
];

export const SEED_DMS = {};

export const COMMUNITIES = [
  { id: 'jee', title: 'JEE Advanced Basecamp', members: '12.4k', icon: 'functions', color: '#60a5fa', desc: 'Official resources, PYQ discussions, and Physics & Math strategies.' },
  { id: 'neet', title: 'NEET Medical Hub', members: '18.1k', icon: 'medical_services', color: '#09cd83', desc: 'NCERT line-by-line notes, Biology diagrams, and NTA updates.' },
  { id: 'math', title: 'Calculus & Advanced Math', members: '9.3k', icon: 'square_foot', color: '#a78bfa', desc: 'Integration tricks, proofs, and coordinate geometry problems.' },
  { id: 'chem', title: 'Organic Chemistry Lab', members: '14.2k', icon: 'science', color: '#f59e0b', desc: 'Reaction mechanisms, GOC rules, reagent cheat sheets.' },
  { id: 'cs', title: 'Computer Science & Algo', members: '8.7k', icon: 'terminal', color: '#ec4899', desc: 'Data structures, algorithms, logic, and competitive programming.' },
];

export const SEED_COMMUNITY_POSTS = {
  jee: [
    { id: 'c_j1', type: 'resource', content: 'HC Verma Vol 1 Solutions & Key Formulas.pdf', size: '3.4 MB', date: 'Yesterday', author: 'Aarav Sharma', avatar: 'AS', role: 'admin' },
    { id: 'c_j2', type: 'text', content: 'What is your strategy for solving JEE Advanced Physics multi-correct questions?', date: '3 hours ago', author: 'Kabir Mehta', avatar: 'KM', role: 'member' }
  ],
  neet: [
    { id: 'c_n1', type: 'resource', content: 'NCERT Biology High-Yield Diagrams & Flowcharts.pdf', size: '5.1 MB', date: '2 days ago', author: 'Priya Nair', avatar: 'PN', role: 'admin' },
    { id: 'c_n2', type: 'text', content: 'Genetics Hardy-Weinberg equilibrium numericals master thread!', date: '5 hours ago', author: 'Ananya Iyer', avatar: 'AI', role: 'member' }
  ],
  math: [
    { id: 'c_m1', type: 'resource', content: 'Definite Integrals Reduction Formulas Cheat Sheet.pdf', size: '1.8 MB', date: 'Yesterday', author: 'Dev Kapoor', avatar: 'DK', role: 'member' }
  ],
  chem: [
    { id: 'c_ch1', type: 'resource', content: 'All Named Organic Reactions (GOC + Mechanism).pdf', size: '4.2 MB', date: '3 days ago', author: 'Riya Patel', avatar: 'RP', role: 'admin' }
  ],
  cs: [
    { id: 'c_cs1', type: 'resource', content: 'Data Structures & Algorithms Cheat Sheet.pdf', size: '2.5 MB', date: 'Yesterday', author: 'Arjun Reddy', avatar: 'AR', role: 'member' }
  ]
};

const STORE_KEY = 'axos_network_v6';

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
  if (!d || !d.posts || d.posts.length === 0) {
    d = {
      following: [0, 1, 2, 8],
      posts: SEED_POSTS,
      dms: {},
      myVotes: {}, // { postId: 'up' | 'down' }
      myPollVotes: {}, // { pollId: optionId }
      savedPosts: [],
      communities: SEED_COMMUNITY_POSTS
    };
    save(d);
  } else {
    if (!d.myVotes) d.myVotes = {};
    if (!d.myPollVotes) d.myPollVotes = {};
    if (!d.savedPosts) d.savedPosts = [];
    if (!d.communities || !d.communities.math) d.communities = SEED_COMMUNITY_POSTS;
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
