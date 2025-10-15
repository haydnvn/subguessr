import { context, reddit, redis } from "@devvit/web/server";
import { generateNewChallenge } from "../game/challenge";
import { getRandomPostTitle } from "../game/utils";

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error("subredditName is required");
  }

  // Generate a challenge for the preview
  const challengeData = await generateNewChallenge();
  const postTitle = getRandomPostTitle();

  const newPost = await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'SubGuessr', 
      backgroundUri: challengeData.imageUrl, // Use the challenge image as background
      buttonLabel: 'Start Guessing',
      description: 'Can you guess which subreddit this image is from?',
      heading: 'Play SubGuessr!',
      appIconUri: 'default-icon.png',
      buttonAppearance: 'secondary', // Try different button appearance
      buttonColor: '#FF6B35', // Try custom orange color
      buttonStyle: 'orange', // Try custom style
    },
    postData: {
      gameType: 'subguessr',
      version: '1.0'
    },
    subredditName: subredditName,
    title: postTitle,
  });

  // Store the challenge data for this post
  if (newPost?.id) {
    // Store as the original/canonical challenge for this post
    await redis.set(`post_original_challenge_${newPost.id}`, JSON.stringify(challengeData), {
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // Also store as current challenge (for backward compatibility)
    await redis.set(`post_challenge_${newPost.id}`, JSON.stringify(challengeData), {
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  }

  return newPost;
};
