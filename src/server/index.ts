import express from "express";
import {
  InitResponse,
  GuessResponse,
  NewGameResponse,
  LeaderboardResponse,
} from "../shared/types/api";
import {
  createServer,
  context,
  getServerPort,
  reddit,
  redis,
} from "@devvit/web/server";
import { createPost } from "./core/post";
import { generateNewChallenge } from "./game/challenge";
import {
  getUserScore,
  hasUserGuessedOnImage,
  getUserImageGuessData,
  recordUserImageGuess,
  updateUserScore,
  getTopScores,
} from "./game/utils";

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<
  { postId: string },
  InitResponse | { status: string; message: string }
>("/api/init", async (_req, res): Promise<void> => {
  const { postId, userId } = context;

  if (!postId) {
    console.error("API Init Error: postId not found in devvit context");
    res.status(400).json({
      status: "error",
      message: "postId is required but missing from context",
    });
    return;
  }

  try {
    const username = await reddit.getCurrentUsername();
    const userScore = userId ? await getUserScore(userId) : 0;

    // Try to get existing challenge data for this post
    let challengeData = null;
    let hasGuessed = false;
    let guessData = null;

    const storedChallenge = await redis.get(`post_challenge_${postId}`);
    if (storedChallenge) {
      try {
        challengeData = JSON.parse(storedChallenge);

        // Check if user has already guessed on this challenge
        if (userId && challengeData) {
          hasGuessed = await hasUserGuessedOnImage(userId, challengeData.imageUrl, challengeData.answer);
          if (hasGuessed) {
            guessData = await getUserImageGuessData(userId, challengeData.imageUrl, challengeData.answer);
          }
        }
      } catch (error) {
        console.error('Error parsing stored challenge:', error);
      }
    }

    res.json({
      type: "init",
      postId: postId,
      username: username ?? "anonymous",
      userScore,
      challengeData,
      hasGuessed,
      guessData,
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = "Unknown error during initialization";
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    res.status(400).json({ status: "error", message: errorMessage });
  }
});

router.post<
  { postId: string },
  { status: string; message: string; postId?: string; navigateTo?: string },
  unknown
>("/api/new-game", async (_req, res): Promise<void> => {
  const { subredditName } = context;

  if (!subredditName) {
    res.status(400).json({
      status: "error",
      message: "subredditName is required",
    });
    return;
  }

  try {
    // Create a new post with a new challenge instead of overwriting current post
    const newPost = await createPost();

    res.json({
      status: "success",
      message: "New challenge created",
      postId: newPost?.id,
      navigateTo: `https://reddit.com/r/${subredditName}/comments/${newPost.id}`,
    });
  } catch (error) {
    console.error(`Error creating new challenge post:`, error);
    res.status(500).json({
      status: "error",
      message: "Failed to create new challenge",
    });
  }
});

router.post<
  { postId: string },
  GuessResponse | { status: string; message: string },
  { guess: string; imageUrl: string; answer: string }
>("/api/guess", async (req, res): Promise<void> => {
  const { postId, userId } = context;
  const { guess, imageUrl, answer } = req.body;

  if (!postId || !userId) {
    res.status(400).json({
      status: "error",
      message: "postId and userId are required",
    });
    return;
  }

  if (!guess || !imageUrl || !answer) {
    res.status(400).json({
      status: "error",
      message: "guess, imageUrl, and answer are required",
    });
    return;
  }

  try {
    // Check if user has already guessed on this specific image
    const alreadyGuessed = await hasUserGuessedOnImage(userId, imageUrl, answer);
    if (alreadyGuessed) {
      res.status(400).json({
        status: "error",
        message: "You have already guessed on this image!",
      });
      return;
    }

    const cleanGuess = guess.toLowerCase().replace(/^r\//, '').trim();
    const isCorrect = cleanGuess === answer.toLowerCase();

    // Record the user's guess for this specific image
    await recordUserImageGuess(userId, imageUrl, answer, cleanGuess, isCorrect);

    let newScore = await getUserScore(userId);

    // Update score if correct
    if (isCorrect) {
      const username = await reddit.getCurrentUsername();
      if (username) {
        newScore = await updateUserScore(userId, username);
      }
    }

    res.json({
      type: "guess",
      postId,
      isCorrect,
      userGuess: cleanGuess,
      correctAnswer: answer,
      newScore,
    });
  } catch (error) {
    console.error(`Error processing guess for post ${postId}:`, error);
    res.status(500).json({
      status: "error",
      message: "Failed to process guess",
    });
  }
});

router.get<
  {},
  LeaderboardResponse | { status: string; message: string }
>("/api/leaderboard", async (_req, res): Promise<void> => {
  try {
    const leaderboard = await getTopScores(10);

    res.json({
      type: "leaderboard",
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch leaderboard",
    });
  }
});

router.post<
  { postId: string },
  { status: string; message: string; postId?: string },
  { imageUrl: string; answer: string }
>("/api/share", async (req, res): Promise<void> => {
  const { subredditName } = context;
  const { imageUrl, answer } = req.body;

  console.log("Share request received:", { subredditName, imageUrl, answer });

  if (!subredditName) {
    console.error("Share error: subredditName missing");
    res.status(400).json({
      status: "error",
      message: "subredditName is required",
    });
    return;
  }

  if (!imageUrl || !answer) {
    console.error("Share error: missing imageUrl or answer", { imageUrl, answer });
    res.status(400).json({
      status: "error",
      message: "imageUrl and answer are required",
    });
    return;
  }

  try {
    // Generate a unique key for this challenge
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    console.log("Generated challengeId:", challengeId);

    // Store the challenge data in Redis
    await redis.set(challengeId, JSON.stringify({
      imageUrl,
      answer,
    }), { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }); // 7 days

    console.log("Stored challenge data in Redis");

    console.log("Creating new post with data:", {
      subredditName,
      title: "🎯 SubGuessr Challenge - Can you guess this sub?",
      challengeId,
    });

    const newPost = await reddit.submitCustomPost({
      splash: {
        appDisplayName: 'SubGuessr',
        backgroundUri: imageUrl, // Use the challenge image as background
        buttonLabel: 'Start Guessing',
        description: 'Can you guess which subreddit this image is from?',
        heading: 'Play SubGuessr!',
        appIconUri: 'default-icon.png',
      },
      postData: {
        challengeId,
        shared: true,
      },
      subredditName: subredditName,
      title: "🎯 SubGuessr Challenge - Can you guess this sub?",
      url: imageUrl, // Also set the main post image
    });

    console.log("Created new post:", newPost?.id);

    // Store the challenge ID in the post's metadata
    if (newPost?.id) {
      await redis.set(`post_challenge_${newPost.id}`, JSON.stringify({
        imageUrl,
        answer,
        imageId: challengeId,
      }), { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

      console.log("Stored challenge data for post:", newPost.id);
    }

    res.json({
      status: "success",
      message: "Challenge shared successfully",
      postId: newPost?.id,
    });
  } catch (error) {
    console.error("Error sharing challenge - Full details:", error);
    console.error("Error name:", (error as Error).name);
    console.error("Error message:", (error as Error).message);
    console.error("Error stack:", (error as Error).stack);

    res.status(500).json({
      status: "error",
      message: `Failed to share challenge: ${(error as Error).message}`,
    });
  }
});

router.post("/internal/on-app-install", async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: "success",
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: "error",
      message: "Failed to create post",
    });
  }
});

router.post("/internal/menu/post-create", async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: "error",
      message: "Failed to create post",
    });
  }
});

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error; ${err.stack}`));
server.listen(getServerPort());
