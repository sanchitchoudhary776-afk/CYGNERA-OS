// ── Network Social Data Layer (Production) ──────────────────────────

// Users array — empty by default. The current user is dynamically
// injected by components that import `useAuth`.
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
