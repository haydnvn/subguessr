#!/usr/bin/env node

/**
 * Simple script to validate the subreddits.txt file format
 * Run with: node validate-subreddits.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function validateSubreddits() {
  try {
    const filePath = path.join(__dirname, 'subreddits.txt');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ subreddits.txt file not found!');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    const subreddits = [];
    const issues = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      
      // Check for common issues
      if (trimmed.startsWith('r/')) {
        issues.push(`Line ${lineNum}: Remove 'r/' prefix from '${trimmed}'`);
      } else if (trimmed.includes(' ')) {
        issues.push(`Line ${lineNum}: Subreddit names cannot contain spaces: '${trimmed}'`);
      } else if (trimmed.includes('/')) {
        issues.push(`Line ${lineNum}: Subreddit names cannot contain slashes: '${trimmed}'`);
      } else if (trimmed !== trimmed.toLowerCase()) {
        issues.push(`Line ${lineNum}: Consider using lowercase: '${trimmed}' -> '${trimmed.toLowerCase()}'`);
      } else {
        subreddits.push(trimmed);
      }
    });
    
    console.log(`📋 Validation Results:`);
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Valid subreddits: ${subreddits.length}`);
    console.log(`   Issues found: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (subreddits.length > 0) {
      console.log('\n✅ Valid subreddits:');
      subreddits.forEach(sub => console.log(`   r/${sub}`));
    }
    
    if (subreddits.length === 0) {
      console.error('\n❌ No valid subreddits found!');
      process.exit(1);
    }
    
    console.log('\n🎉 Validation complete!');
    
  } catch (error) {
    console.error('❌ Error reading subreddits.txt:', error.message);
    process.exit(1);
  }
}

validateSubreddits();