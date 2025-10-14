export type InitResponse = {
  type: "init";
  postId: string;
  username: string;
  userScore: number;
  challengeData?: {
    imageUrl: string;
    answer: string;
    imageId: string;
  };
  hasGuessed?: boolean;
  guessData?: any;
};

export type GuessResponse = {
  type: "guess";
  postId: string;
  isCorrect: boolean;
  userGuess: string;
  correctAnswer: string;
  newScore: number;
};

export type NewGameResponse = {
  status: "success";
  message: string;
  challengeData?: {
    imageUrl: string;
    answer: string;
    imageId: string;
  };
};

export type LeaderboardResponse = {
  type: "leaderboard";
  leaderboard: Array<{
    rank: number;
    username: string;
    score: number;
  }>;
};
