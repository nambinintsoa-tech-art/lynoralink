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

test('registration signs in and opens the welcome page after email verification', () => {
  const registerSource = fs.readFileSync(path.join(process.cwd(), 'src/app/register/page.jsx'), 'utf8');
  assert.match(registerSource, /signIn\("credentials"/);
  assert.match(registerSource, /redirect:\s*false/);
  assert.match(registerSource, /window\.location\.replace\("\/welcome"\)/);
  assert.doesNotMatch(registerSource, /window\.location\.href\s*=\s*"\/login\?callbackUrl=%2Fwelcome"/);
});
