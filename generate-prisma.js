#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  console.log('Regenerating Prisma client...');
  execSync('node node_modules/prisma/build/index.js generate', { stdio: 'inherit' });
  console.log('✓ Prisma client regenerated successfully');
} catch (error) {
  console.error('Error regenerating Prisma client:', error.message);
  process.exit(1);
}
