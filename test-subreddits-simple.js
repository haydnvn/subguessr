#!/usr/bin/env node

/**
 * Simple test to check subreddits count and specific entries
 */

import fs from 'fs';

console.log('🔍 Testing subreddits from generated TypeScript file...');

// Read the generated TypeScript file
const subredditsFile = fs.readFileSync('./src/server/game/subreddits.ts', 'utf-8');

// Extract the array content
const arrayMatch = subredditsFile.match(/IMAGE_SUBREDDITS: string\[\] = \[([\s\S]*?)\];/);
if (!arrayMatch) {
  console.error('❌ Could not find IMAGE_SUBREDDITS array in file');
  process.exit(1);
}

// Parse the subreddits from the array
const arrayContent = arrayMatch[1];
const subreddits = arrayContent
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.startsWith("'") && line.endsWith("',") || line.endsWith("'"))
  .map(line => line.replace(/^'|'[,]?$/g, ''));

console.log(`📊 Total subreddits found: ${subreddits.length}`);

// Check for specific subreddits you mentioned
const testSubreddits = ['maplestory', 'trees', 'decks', 'battlestations', 'mechanicalkeyboards', 'weird', 'wtf'];
console.log('\n🎯 Checking for specific subreddits:');

testSubreddits.forEach(sub => {
  const found = subreddits.includes(sub);
  console.log(`  ${found ? '✅' : '❌'} ${sub}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});

// Show first 20 subreddits
console.log('\n📋 First 20 subreddits in the list:');
subreddits.slice(0, 20).forEach((sub, index) => {
  console.log(`  ${index + 1}. ${sub}`);
});

// Show some from the middle
console.log('\n📋 Some from the middle (200-220):');
subreddits.slice(200, 220).forEach((sub, index) => {
  console.log(`  ${200 + index + 1}. ${sub}`);
});

// Show last 10
console.log('\n📋 Last 10 subreddits:');
const lastTen = subreddits.slice(-10);
lastTen.forEach((sub, index) => {
  console.log(`  ${subreddits.length - 10 + index + 1}. ${sub}`);
});

// Check the SUBREDDIT_COUNT
const countMatch = subredditsFile.match(/SUBREDDIT_COUNT = (\d+);/);
if (countMatch) {
  const declaredCount = parseInt(countMatch[1]);
  console.log(`\n📈 Declared count: ${declaredCount}`);
  console.log(`📈 Actual count: ${subreddits.length}`);
  console.log(`${declaredCount === subreddits.length ? '✅' : '❌'} Counts match: ${declaredCount === subreddits.length}`);
} else {
  console.log('\n⚠️  Could not find SUBREDDIT_COUNT declaration');
}

console.log('\n✅ Test complete!');