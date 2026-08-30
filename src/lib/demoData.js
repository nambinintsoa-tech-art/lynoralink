function normalizeId(value) {
  return String(value || "").trim();
}

function buildUserSuggestion(id, name, title, image = null, type = 'user') {
  return {
    id: normalizeId(id),
    name,
    title,
    initials: (name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("") || "U",
    mutual: 0,
    type,
    image,
  };
}

function buildPageSuggestion(id, name, subtitle, logoUrl = null) {
  return {
    id: normalizeId(id),
    name,
    title: subtitle,
    initials: (name || "P")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("") || "P",
    mutual: 0,
    type: 'company',
    image: logoUrl,
  };
}

function buildGroupSuggestion(id, name, description, members = 120, coverGradient = 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)') {
  return {
    id: normalizeId(id),
    name,
    description,
    emoji: '🌐',
    members,
    coverGradient,
    privacy: 'public',
    memberCount: members,
    postsCount: 0,
    canShare: true,
  };
}

function buildPublicPost(id, authorName, title, text, media = null, visibility = 'public', companyPageId = null) {
  return {
    id: normalizeId(id),
    authorId: `author-${id}`,
    companyPageId,
    author: authorName,
    title,
    initials: (authorName || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("") || "U",
    avatarUrl: null,
    time: new Date().toISOString(),
    likes: 24,
    reactions: { ok: 18, love: 4, fire: 2 },
    reaction: null,
    liked: false,
    bookmarked: false,
    bookmarks: 6,
    shares: 2,
    isArticle: false,
    text,
    headline: title,
    excerpt: text,
    body: text,
    mood: null,
    identifiedUsers: [],
    visibility,
    isSponsored: false,
    campaignId: null,
    campaignTitle: null,
    website: null,
    media,
    comments: [],
    group: null,
    isPlatformAdmin: false,
    isPremium: false,
    authorRole: 'user',
    role: null,
  };
}

function buildStoryGroup(userId, name, image = null, text = 'Nouveau sur LynoraLink') {
  return {
    id: `story-group-${normalizeId(userId)}`,
    user: {
      id: normalizeId(userId),
      name,
      initials: (name || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() || "")
        .join("") || "U",
      image,
    },
    items: [{
      id: `story-${normalizeId(userId)}`,
      companyPageId: null,
      type: 'text',
      text,
      image: null,
      bg: 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)',
      privacy: 'public',
      createdAt: Date.now(),
      seen: false,
      views: [],
      reactions: { ok: 0 },
    }],
  };
}

function getDemoSuggestions(currentUserId) {
  return [
    buildUserSuggestion('demo-ana', 'Ana M.', 'Product Designer', null, 'user'),
    buildUserSuggestion('demo-tariq', 'Tariq Benali', 'Growth Lead', null, 'user'),
    buildPageSuggestion('demo-lynora', 'Lynora Labs', 'Innovation & AI', null),
    buildPageSuggestion('demo-azur', 'Azur Studio', 'Digital marketing', null),
  ].filter((item) => item.id !== normalizeId(currentUserId));
}

function getDemoGroups(currentUserId) {
  return [
    buildGroupSuggestion('demo-group-1', 'Product Builders', 'Des profils qui partagent des idées produit et des opportunités.', 142),
    buildGroupSuggestion('demo-group-2', 'Growth & Performance', 'Stratégies marketing, acquisition et contenus.', 89),
  ].filter((group) => group.id !== normalizeId(currentUserId));
}

function getDemoCompanyPages(currentUserId) {
  return [
    buildPageSuggestion('demo-page-1', 'NovaWorks', 'Startup · Product Design', null),
    buildPageSuggestion('demo-page-2', 'Northstar AI', 'SaaS · Intelligence artificielle', null),
  ].filter((page) => page.id !== normalizeId(currentUserId));
}

function getDemoPosts(currentUserId) {
  return [
    buildPublicPost('demo-post-1', 'Lynora Labs', 'Lancement de communauté', 'Bienvenue dans la communauté LynoraLink. Partagez vos idées, vos réussites et vos projets.', null, 'public'),
    buildPublicPost('demo-post-2', 'Ana M.', 'Fin de semaine utile', 'Des bonnes pratiques pour créer une présence professionnelle cohérente sur un réseau de talents.', null, 'public'),
  ].filter((post) => post.id !== normalizeId(currentUserId));
}

function getDemoStories(currentUserId) {
  return {
    currentUser: {
      id: normalizeId(currentUserId),
      name: 'Vous',
      initials: 'V',
      image: null,
    },
    groups: [
      buildStoryGroup('demo-story-1', 'Lynora Labs', null, 'Le prochain sprint commence aujourd’hui.'),
      buildStoryGroup('demo-story-2', 'Ana M.', null, 'Portfolio / mise à jour rapide'),
    ],
  };
}

module.exports = {
  getDemoSuggestions,
  getDemoGroups,
  getDemoCompanyPages,
  getDemoPosts,
  getDemoStories,
};
