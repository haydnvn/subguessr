// Test script to check the /api/subreddits endpoint
import { IMAGE_SUBREDDITS } from './src/server/game/subreddits.ts';

console.log('🔍 Testing API endpoint data...');
console.log('📊 Total subreddits:', IMAGE_SUBREDDITS.length);

// Check for specific subreddits
const testSubreddits = ['weird', 'maplestory', 'trees', 'decks', 'okbuddyretard'];
console.log('\n🎯 Checking for specific subreddits:');
testSubreddits.forEach(sub => {
  const found = IMAGE_SUBREDDITS.includes(sub);
  const index = IMAGE_SUBREDDITS.indexOf(sub);
  console.log(`  ${found ? '✅' : '❌'} ${sub}: ${found ? `FOUND at index ${index}` : 'NOT FOUND'}`);
});

// Check what subreddits start with "wei"
console.log('\n🔍 Subreddits starting with "wei":');
const weiSubreddits = IMAGE_SUBREDDITS.filter(sub => sub.toLowerCase().startsWith('wei'));
weiSubreddits.forEach((sub, i) => {
  console.log(`  ${i + 1}. ${sub}`);
});

// Check what subreddits contain "weird"
console.log('\n🔍 Subreddits containing "weird":');
const weirdSubreddits = IMAGE_SUBREDDITS.filter(sub => sub.toLowerCase().includes('weird'));
weirdSubreddits.forEach((sub, i) => {
  console.log(`  ${i + 1}. ${sub}`);
});