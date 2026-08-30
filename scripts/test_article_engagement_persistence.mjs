const baseUrl = process.env.LYNORALINK_URL || "http://localhost:3000";
const cookie = process.env.LYNORALINK_COOKIE;

if (!cookie) {
  console.error("Missing LYNORALINK_COOKIE. Copy the authenticated Cookie header from the browser.");
  process.exit(2);
}

const headers = { "Content-Type": "application/json", Cookie: cookie };

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} -> ${response.status}: ${text}`);
  }
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

const stamp = Date.now();
const created = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    isArticle: true,
    headline: `Engagement persistence test ${stamp}`,
    excerpt: "Automated persistence test",
    articleBody: `Test article ${stamp}`,
    presentation: { theme: "navy-gold", font: "editorial", density: "airy" },
    visibility: "public",
  }),
});
const postId = created?.post?.id;
assert(postId, "article creation did not return a post id");

await request(`/api/posts/${postId}/like`, {
  method: "POST",
  body: JSON.stringify({ reaction: "love" }),
});
const comment = await request(`/api/posts/${postId}/comments`, {
  method: "POST",
  body: JSON.stringify({ text: `Comment persistence test ${stamp}` }),
});
await request(`/api/posts/${postId}/share`, { method: "POST" });
await request(`/api/posts/${postId}/save`, { method: "POST" });

// Simulate a reload by discarding the action responses and reading the feed again.
const feed = await request("/api/posts?feedOnly=true&limit=50");
const persisted = feed?.posts?.find((post) => post.id === postId);
assert(persisted, "created article is missing after reload simulation");
assert(persisted.reactions?.love >= 1, "love reaction was not persisted");
assert(persisted.reaction === "love", "current user reaction was not restored");
assert(persisted.comments?.some((item) => item.id === comment?.id), "comment was not persisted");
assert(Number(persisted.shares) >= 1, "share count was not persisted");
assert(persisted.bookmarked === true, "bookmark was not persisted");

console.log(JSON.stringify({
  ok: true,
  postId,
  reaction: persisted.reaction,
  reactions: persisted.reactions,
  comments: persisted.comments.length,
  shares: persisted.shares,
  bookmarked: persisted.bookmarked,
}, null, 2));
