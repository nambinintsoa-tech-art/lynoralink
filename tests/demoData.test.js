const assert = require('node:assert/strict');
const { getDemoSuggestions, getDemoPosts, getDemoStories, getDemoGroups, getDemoCompanyPages } = require('../src/lib/demoData.js');

const suggestions = getDemoSuggestions('me-user');
assert(Array.isArray(suggestions), 'suggestions should be an array');
assert(suggestions.length >= 3, 'there should be several fallback suggestions');
assert(suggestions.some((item) => item.type === 'user'), 'fallback should include people suggestions');
assert(suggestions.some((item) => item.type === 'company'), 'fallback should include company suggestions');

const posts = getDemoPosts('me-user');
assert(Array.isArray(posts), 'posts should be an array');
assert(posts.length >= 2, 'there should be fallback posts');
assert(posts.every((post) => post.visibility === 'public'), 'fallback posts should be public');

const stories = getDemoStories('me-user');
assert(Array.isArray(stories.groups), 'stories should include groups');
assert(stories.groups.length >= 1, 'there should be a story group fallback');

const groups = getDemoGroups('me-user');
assert(Array.isArray(groups), 'groups should be an array');
assert(groups.length >= 1, 'there should be a group fallback');

const pages = getDemoCompanyPages('me-user');
assert(Array.isArray(pages), 'company pages should be an array');
assert(pages.length >= 1, 'there should be a company page fallback');

console.log('demo-data fallback tests passed');
