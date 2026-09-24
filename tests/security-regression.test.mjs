import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const load = (path) => readFile(new URL(path, root), "utf8");

test("profile API does not expose another user's email", async () => {
  const source = await load("src/app/api/profile/route.js");
  assert.match(source, /targetUserId === session\.user\.id \? \{ email: user\.email \} : \{\}/);
});

test("session API does not return session tokens", async () => {
  const source = await load("src/app/api/sessions/route.js");
  assert.doesNotMatch(source, /sessionToken:\s*s\.sessionToken/);
});

test("uploads require authentication and have a size limit", async () => {
  const source = await load("src/app/api/upload/route.js");
  assert.match(source, /getServerSession\(authOptions\)/);
  assert.match(source, /MAX_UPLOAD_BYTES/);
  const backendSource = await load("backend/src/upload.js");
  assert.match(backendSource, /getSessionUserId\(request\)/);
  assert.match(backendSource, /MAX_UPLOAD_BYTES/);
});

test("blocking is not time-limited", async () => {
  const source = await load("src/lib/blocking.js");
  assert.doesNotMatch(source, /BLOCK_DURATION_MS|createdAt:\s*\{\s*gte/);
});

test("notification avatar comes from the displayed actor, not the recipient", async () => {
  const source = await load("backend/src/notifications.js");
  assert.match(source, /item\.sender\?\.image/);
  assert.doesNotMatch(source, /item\.user\?\.image/);
});

test("top navigation exposes a network badge", async () => {
  const source = await load("src/components/LynoraLinkFeed.jsx");
  assert.match(source, /networkBadge\s*=\s*0/);
  assert.match(source, /id:\s*["']network["'][^\n]*badge:\s*networkBadge/);
});

test("group notifications render their cover with a round group avatar", async () => {
  const source = await load("src/components/Notification.jsx");
  assert.match(source, /const primaryImage = isGroup \? \(notification\.coverUrl \|\| notification\.avatarUrl/);
  assert.match(source, /isGroup && notification\.coverUrl/);
  assert.match(source, /size=\{22\} imageUrl=\{notification\.avatarUrl\}/);
});

test("group notifications keep the actor avatar and group cover together", async () => {
  const backendSource = await load("backend/src/groups.js");
  const routeSource = await load("src/app/api/groups/[id]/join-requests/route.js");
  assert.match(backendSource, /actorUser\?\.name/);
  assert.match(backendSource, /avatarUrl: actorUser\?\.image/);
  assert.match(backendSource, /coverUrl: group\.coverUrl \|\| group\.avatarUrl/);
  assert.match(routeSource, /actor: session\.user\.name/);
  assert.match(routeSource, /coverUrl: group\.coverUrl \|\| group\.avatarUrl/);
});

test("post viewer clears the reply target when switching posts", async () => {
  const source = await load("src/components/PostViewerPreview.jsx");
  assert.match(source, /setShowAllComments\(false\);\s*setReplyingTo\(null\);\s*\}, \[post\?\.id\]\)/);
});

test("backend post events create notifications for reactions, comments, and mentions", async () => {
  const source = await load("backend/src/posts.js");
  assert.match(source, /type: "like"/);
  assert.match(source, /type: "comment"/);
  assert.match(source, /type: "mention"/);
  assert.match(source, /createBackendNotification/);
});

test("notification events are delivered to the client in real time", async () => {
  const backendSource = await load("backend/src/posts.js");
  const clientSource = await load("src/components/LynoraLinkFeed.jsx");
  assert.match(backendSource, /broadcastRealtimeEvent\(\{ userId, type: "notifications"/);
  assert.match(clientSource, /new EventSource\("\/api\/realtime"\)/);
  assert.match(clientSource, /addEventListener\("realtime"/);
});

test("story reactions and new stories create notifications", async () => {
  const source = await load("backend/src/stories.js");
  assert.match(source, /type: "story"/);
  assert.match(source, /kind: "new_story"/);
  assert.match(source, /type: "like"/);
  assert.match(source, /kind: "story_reaction"/);
  assert.match(source, /createStoryNotification/);
});

test("splash screen finishes before the application skeleton is rendered", async () => {
  const source = await load("src/components/AppSplashGate.jsx");
  assert.match(source, /useState\(\(\) => !splashShownForDocument\)/);
  assert.match(source, /if \(showSplash\) return <SplashScreen/);
  assert.doesNotMatch(source, /\{showSplash && <SplashScreen[\s\S]*\}\s*\{children\}/);
});

test("post viewer and network use loading skeletons for fresh data", async () => {
  const postViewerSource = await load("src/components/PostViewerPreview.jsx");
  const feedSource = await load("src/components/LynoraLinkFeed.jsx");
  assert.match(postViewerSource, /post\?\.commentsLoaded === false/);
  assert.match(postViewerSource, /<CommentSkeleton count=\{4\}/);
  assert.match(feedSource, /setNetworkLoading\(true\);\s*fetchRelations\(\)\.finally/);
  assert.match(feedSource, /<NetworkOpeningSkeleton \/>/);
});

test("company pages grid includes a left sidebar skeleton", async () => {
  const skeletonSource = await load("src/components/Skeleton.jsx");
  const gridSource = await load("src/components/CompanyPage.jsx");
  assert.match(skeletonSource, /company-pages-grid-skeleton-sidebar/);
  assert.match(skeletonSource, /company-pages-grid-skeleton-content/);
  assert.match(gridSource, /display: mobileSidebarOpen \? "block" : "flex"/);
});

test("splash logo appears before the loading dots", async () => {
  const source = await load("src/components/SplashScreen.jsx");
  assert.match(source, /\.lyn-sp-dots \{ animation: lyn-sp-dots-in \.2s ease \.65s both; \}/);
  assert.match(source, /className="lyn-sp-dots"/);
});
