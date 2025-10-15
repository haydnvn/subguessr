import { redis } from "@devvit/web/server";

// Import subreddits from generated file (built from subreddits.txt)
export { IMAGE_SUBREDDITS } from './subreddits';

// Post titles array - embedded directly for reliability
const POST_TITLES: string[] = [
  "Bet you can't name this sub!",
  "Which corner of Reddit is this from?",
  "Name that subreddit, I dare you!",
  "Guess the sub or face eternal shame",
  "Can you identify this Reddit rabbit hole?",
  "What subreddit spawned this masterpiece?",
  "Challenge accepted: Name this sub!",
  "Riddle me this subreddit, Batman",
  "Can you crack the subreddit code?",
  "Which sub does this belong to, genius?",
  "Subreddit detective work needed here",
  "Name this sub and win absolutely nothing",
  "Can you solve the mystery subreddit?",
  "Guess correctly and earn my respect",
  "Which Reddit community claims this?",
  "Subreddit identification challenge activated",
  "Can you pinpoint this sub's origin?",
  "Name that subreddit like your life depends on it",
  "Calling all subreddit sleuths!",
  "Can you decode this Reddit enigma?",
  "Which sub is responsible for this chaos?",
  "Subreddit guessing game: EXTREME EDITION",
  "Can you identify this digital habitat?",
  "Name this sub before I lose my mind",
  "Which corner of the internet is this?",
  "Can you solve this subreddit puzzle?",
  "Guess the sub and become a legend",
  "Which Reddit realm does this hail from?",
  "Can you name this virtual neighborhood?",
  "Subreddit identification: Mission Impossible",
  "Can you guess where this meme was born?",
  "Which sub would upvote this madness?",
  "Name that subreddit, you beautiful human",
  "Can you identify this Reddit ecosystem?",
  "Guess the sub and I'll be impressed",
  "Which digital tribe created this?",
  "Can you crack this subreddit mystery?",
  "Name this sub or forever hold your peace",
  "Which Reddit dimension is this from?",
  "Test your subreddit knowledge here!"
];

// Function to get a random post title
export const getRandomPostTitle = (): string => {
  const randomIndex = Math.floor(Math.random() * POST_TITLES.length);
  const randomTitle = POST_TITLES[randomIndex];
  const fullTitle = `🎯 SubGuessr - ${randomTitle}`;
  
  console.log(`Selected title ${randomIndex + 1}/${POST_TITLES.length}: "${fullTitle}"`);
  return fullTitle;
};

// Helper functions for user score tracking
export const getUserScoreKey = (userId: string) => `user_score_${userId}`;
export const getLeaderboardKey = () => 'leaderboard';

// Helper functions for tracking user guesses per specific image
export const getImageId = (imageUrl: string, answer: string) => {
  const combined = `${imageUrl}_${answer}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export const getUserImageGuessKey = (userId: string, imageId: string) => {
  return `user_guess_${userId}_${imageId}`;
};

export const hasUserGuessedOnImage = async (userId: string, imageUrl: string, answer: string) => {
  const imageId = getImageId(imageUrl, answer);
  const guessKey = getUserImageGuessKey(userId, imageId);
  const hasGuessed = await redis.get(guessKey);
  return hasGuessed === 'true';
};

export const recordUserImageGuess = async (userId: string, imageUrl: string, answer: string, guess: string, isCorrect: boolean) => {
  const imageId = getImageId(imageUrl, answer);
  const guessKey = getUserImageGuessKey(userId, imageId);
  const guessData = {
    guess,
    isCorrect,
    timestamp: Date.now(),
    imageUrl,
    answer,
    imageId
  };

  const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await redis.set(guessKey, 'true', { expiration });
  await redis.set(`${guessKey}_data`, JSON.stringify(guessData), { expiration });
};

export const getUserImageGuessData = async (userId: string, imageUrl: string, answer: string) => {
  const imageId = getImageId(imageUrl, answer);
  const guessKey = getUserImageGuessKey(userId, imageId);
  const guessDataStr = await redis.get(`${guessKey}_data`);
  
  if (guessDataStr) {
    try {
      return JSON.parse(guessDataStr);
    } catch (error) {
      console.error('Error parsing guess data:', error);
    }
  }
  return null;
};

export const updateUserScore = async (userId: string, username: string) => {
  const scoreKey = getUserScoreKey(userId);
  const currentScore = await redis.get(scoreKey);
  const newScore = currentScore ? parseInt(currentScore) + 1 : 1;

  await redis.set(scoreKey, newScore.toString());
  await redis.zAdd(getLeaderboardKey(), { member: `${username}:${userId}`, score: newScore });
  
  return newScore;
};

export const getUserScore = async (userId: string) => {
  const scoreKey = getUserScoreKey(userId);
  const score = await redis.get(scoreKey);
  return score ? parseInt(score) : 0;
};

export const getTopScores = async (limit: number = 10) => {
  const leaderboard = await redis.zRange(getLeaderboardKey(), 0, limit - 1, { reverse: true, by: 'rank' });
  return leaderboard.map((entry: any, index: number) => {
    const [username] = entry.member.split(':');
    return {
      rank: index + 1,
      username,
      score: entry.score
    };
  });
};

// Helper functions for tracking image-specific success/failure stats (across all posts)
export const getImageStatsKey = (imageUrl: string, answer: string) => {
  const imageId = getImageId(imageUrl, answer);
  return `image_stats_${imageId}`;
};

export const getImageStats = async (imageUrl: string, answer: string) => {
  const statsKey = getImageStatsKey(imageUrl, answer);
  const statsStr = await redis.get(statsKey);
  
  if (statsStr) {
    try {
      return JSON.parse(statsStr);
    } catch (error) {
      console.error('Error parsing image stats:', error);
    }
  }
  
  // Return default stats if none exist
  return {
    totalGuesses: 0,
    correctGuesses: 0,
    incorrectGuesses: 0,
    successRate: 0
  };
};

export const updateImageStats = async (imageUrl: string, answer: string, isCorrect: boolean) => {
  const stats = await getImageStats(imageUrl, answer);
  
  stats.totalGuesses += 1;
  if (isCorrect) {
    stats.correctGuesses += 1;
  } else {
    stats.incorrectGuesses += 1;
  }
  
  // Calculate success rate as percentage
  stats.successRate = stats.totalGuesses > 0 
    ? Math.round((stats.correctGuesses / stats.totalGuesses) * 100) 
    : 0;
  
  const statsKey = getImageStatsKey(imageUrl, answer);
  const expiration = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days (longer for image stats)
  await redis.set(statsKey, JSON.stringify(stats), { expiration });
  
  return stats;
};

// Keep post stats for backward compatibility but make them call image stats
export const getPostStatsKey = (postId: string) => `post_stats_${postId}`;

export const getPostStats = async (postId: string) => {
  // Try to get the challenge data for this post to get image stats
  const challengeData = await redis.get(`post_challenge_${postId}`) || await redis.get(`post_original_challenge_${postId}`);
  
  if (challengeData) {
    try {
      const challenge = JSON.parse(challengeData);
      return await getImageStats(challenge.imageUrl, challenge.answer);
    } catch (error) {
      console.error('Error parsing challenge data for post stats:', error);
    }
  }
  
  // Fallback to old post-specific stats if no challenge data
  const statsKey = getPostStatsKey(postId);
  const statsStr = await redis.get(statsKey);
  
  if (statsStr) {
    try {
      return JSON.parse(statsStr);
    } catch (error) {
      console.error('Error parsing post stats:', error);
    }
  }
  
  // Return default stats if none exist
  return {
    totalGuesses: 0,
    correctGuesses: 0,
    incorrectGuesses: 0,
    successRate: 0
  };
};

export const updatePostStats = async (postId: string, isCorrect: boolean) => {
  // Try to get the challenge data for this post to update image stats
  const challengeData = await redis.get(`post_challenge_${postId}`) || await redis.get(`post_original_challenge_${postId}`);
  
  if (challengeData) {
    try {
      const challenge = JSON.parse(challengeData);
      return await updateImageStats(challenge.imageUrl, challenge.answer, isCorrect);
    } catch (error) {
      console.error('Error parsing challenge data for post stats update:', error);
    }
  }
  
  // Fallback to old post-specific stats if no challenge data
  const stats = await getPostStats(postId);
  
  stats.totalGuesses += 1;
  if (isCorrect) {
    stats.correctGuesses += 1;
  } else {
    stats.incorrectGuesses += 1;
  }
  
  stats.successRate = stats.totalGuesses > 0 
    ? Math.round((stats.correctGuesses / stats.totalGuesses) * 100) 
    : 0;
  
  const statsKey = getPostStatsKey(postId);
  const expiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await redis.set(statsKey, JSON.stringify(stats), { expiration });
  
  return stats;
};