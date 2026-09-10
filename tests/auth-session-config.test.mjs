import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const authFile = path.join(process.cwd(), 'src/lib/auth.js');
const source = fs.readFileSync(authFile, 'utf8');

test('session config keeps the user authenticated across app restarts', () => {
  assert.match(source, /SESSION_TTL_SECONDS\s*=\s*30\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
  assert.match(source, /session:\s*\{[\s\S]*maxAge:\s*SESSION_TTL_SECONDS/);
  assert.match(source, /jwt:\s*\{[\s\S]*maxAge:\s*SESSION_TTL_SECONDS/);
  assert.match(source, /cookies:\s*\{[\s\S]*sessionToken:[\s\S]*maxAge:\s*SESSION_TTL_SECONDS/);
});
