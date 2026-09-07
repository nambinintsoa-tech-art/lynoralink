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
