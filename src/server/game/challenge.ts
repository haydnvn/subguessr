import { reddit } from "@devvit/web/server";
import { IMAGE_SUBREDDITS, getImageId } from "./utils";

export interface ChallengeData {
  imageUrl: string;
  answer: string;
  imageId: string;
}

export const generateNewChallenge = async (): Promise<ChallengeData> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      // Pick a random subreddit
      const randomSub = IMAGE_SUBREDDITS[Math.floor(Math.random() * IMAGE_SUBREDDITS.length)];
      
      // Get hot posts from the selected subreddit
      const posts = reddit.getHotPosts({
        subredditName: randomSub,
        limit: 25,
      });

      // Convert to array and find image posts
      const postsArray = [];
      for await (const post of posts) {
        postsArray.push(post);
      }

      // Filter for posts that likely have images
      const imagePosts = postsArray.filter(post => {
        const url = post.url || '';
        const thumbnail = post.thumbnail;
        
        const hasImageUrl = url.includes('i.redd.it') ||
          url.includes('imgur.com') ||
          url.includes('.jpg') ||
          url.includes('.png') ||
          url.includes('.gif');
          
        const hasValidThumbnail = thumbnail &&
          typeof thumbnail === 'object' &&
          thumbnail.url &&
          thumbnail.url !== 'self' &&
          thumbnail.url !== 'default';
          
        return hasImageUrl || hasValidThumbnail;
      });

      // If we found image posts, pick one and validate it has a proper image URL
      if (imagePosts.length > 0) {
        const selectedPost = imagePosts[Math.floor(Math.random() * imagePosts.length)];
        const thumbnail = selectedPost.thumbnail;
        const thumbnailUrl = thumbnail && typeof thumbnail === 'object' ? thumbnail.url : null;
        const imageUrl = selectedPost.url || thumbnailUrl;

        const isValidImage = imageUrl &&
          imageUrl !== 'self' &&
          imageUrl !== 'default' &&
          (imageUrl.includes('i.redd.it') ||
           imageUrl.includes('imgur.com') ||
           imageUrl.includes('.jpg') ||
           imageUrl.includes('.png') ||
           imageUrl.includes('.gif'));

        // If we have a valid image, return it
        if (isValidImage) {
          const imageId = getImageId(imageUrl, randomSub);
          return {
            imageUrl,
            answer: randomSub,
            imageId
          };
        }
      }

      attempts++;
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Challenge generation attempt ${attempts + 1} failed:`, error);
      attempts++;
    }
  }

  throw new Error('Could not generate challenge after multiple attempts');
};