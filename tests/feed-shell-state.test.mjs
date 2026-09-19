import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowFeedLoading } from "../src/lib/feed-shell-state.js";

test("the feed keeps its initial posts while the session is still resolving", () => {
  assert.equal(shouldShowFeedLoading({ status: "loading", sessionLoadingTimedOut: false, hasInitialFeedData: true }), false);
  assert.equal(shouldShowFeedLoading({ status: "loading", sessionLoadingTimedOut: false, hasInitialFeedData: false }), true);
  assert.equal(shouldShowFeedLoading({ status: "unauthenticated", sessionLoadingTimedOut: false, hasInitialFeedData: false }), false);
});
