import assert from "node:assert/strict";
import test from "node:test";
import { canUsePullToRefresh, getFeedReloadTarget } from "../src/lib/feed-refresh.js";

test("pull-to-refresh stays disabled on desktop mouse interactions", () => {
  assert.equal(canUsePullToRefresh({ pointerType: "mouse" }), false);
  assert.equal(canUsePullToRefresh({ pointerType: "touch" }), true);
  assert.equal(canUsePullToRefresh({ pointerType: "pen" }), true);
  assert.equal(canUsePullToRefresh({ coarsePointer: true }), true);
});

test("feed reload keeps the current route parameters", () => {
  const url = new URL("http://localhost:3000/feed?view=messages&userId=42");
  assert.equal(getFeedReloadTarget(url), "http://localhost:3000/feed?view=messages&userId=42");

  const otherUrl = new URL("http://localhost:3000/profile?view=settings");
  assert.equal(getFeedReloadTarget(otherUrl), "http://localhost:3000/feed?view=settings");
});
