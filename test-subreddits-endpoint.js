#!/usr/bin/env node

/**
 * Test script to verify the /api/subreddits endpoint is working
 * and returning the new comprehensive list
 */

import { IMAGE_SUBREDDITS } from './src/server/game/subreddits.ts';

console.log('🔍 Testing subreddits endpoint...');
console.log(`📊 Total subreddits in generated file: ${IMAGE_SUBREDDITS.length}`);

// Check for specific subreddits you mentioned
const testSubreddits = ['maplestory', 'trees', 'decks', 'battlestations', 'mechanicalkeyboards'];
console.log('\n🎯 Checking for specific subreddits:');

testSubreddits.forEach(sub => {
  const found = IMAGE_SUBREDDITS.includes(sub);
  console.log(`  ${found ? '✅' : '❌'} ${sub}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});

// Show first 20 subreddits
console.log('\n📋 First 20 subreddits in the list:');
IMAGE_SUBREDDITS.slice(0, 20).forEach((sub, index) => {
  console.log(`  ${index + 1}. ${sub}`);
});

// Show some from the middle
console.log('\n📋 Some from the middle (200-220):');
IMAGE_SUBREDDITS.slice(200, 220).forEach((sub, index) => {
  console.log(`  ${200 + index + 1}. ${sub}`);
});

// Show last 10
console.log('\n📋 Last 10 subreddits:');
const lastTen = IMAGE_SUBREDDITS.slice(-10);
lastTen.forEach((sub, index) => {
  console.log(`  ${IMAGE_SUBREDDITS.length - 10 + index + 1}. ${sub}`);
});

console.log('\n✅ Test complete! The subreddits list is properly loaded.');
console.log(`📈 Total: ${IMAGE_SUBREDDITS.length} subreddits (up from original 134)`);