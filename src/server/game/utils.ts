import { redis } from "@devvit/web/server";

// Import subreddits from generated file (built from subreddits.txt)
export { IMAGE_SUBREDDITS } from './subreddits';

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