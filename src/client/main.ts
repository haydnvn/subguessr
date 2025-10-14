import {
  InitResponse,
  GuessResponse,
  NewGameResponse,
  LeaderboardResponse,
} from "../shared/types/api";

// DOM Elements
const usernameElement = document.getElementById("username") as HTMLSpanElement;
const userScoreElement = document.getElementById("user-score") as HTMLSpanElement;
const loadingElement = document.getElementById("loading") as HTMLDivElement;
const gameActiveElement = document.getElementById("game-active") as HTMLDivElement;
const challengeImageElement = document.getElementById("challenge-image") as HTMLImageElement;
const guessSection = document.getElementById("guess-section") as HTMLDivElement;
const resultSection = document.getElementById("result-section") as HTMLDivElement;
const guessInput = document.getElementById("guess-input") as HTMLInputElement;
const submitGuessButton = document.getElementById("submit-guess") as HTMLButtonElement;
const resultMessage = document.getElementById("result-message") as HTMLDivElement;
const answerDisplay = document.getElementById("answer-display") as HTMLDivElement;
const newGameButton = document.getElementById("new-game-btn") as HTMLButtonElement;
const shareButton = document.getElementById("share-btn") as HTMLButtonElement;
const toggleLeaderboardButton = document.getElementById("toggle-leaderboard") as HTMLButtonElement;
const leaderboardElement = document.getElementById("leaderboard") as HTMLDivElement;
const leaderboardContent = document.getElementById("leaderboard-content") as HTMLDivElement;

// Game State
let currentPostId: string | null = null;
let currentChallenge: any = null;
let hasGuessed = false;
let showingLeaderboard = false;

// Initialize the game
async function initializeGame() {
  try {
    const response = await fetch("/api/init");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as InitResponse;

    if (data.type === "init") {
      currentPostId = data.postId;
      usernameElement.textContent = data.username;
      userScoreElement.textContent = data.userScore.toString();

      if (data.challengeData) {
        currentChallenge = data.challengeData;
        displayChallenge();

        // Check if user already guessed
        if (data.hasGuessed && data.guessData) {
          showResult(data.guessData.isCorrect, data.guessData.guess, currentChallenge.answer, true);
        }
      } else {
        await loadNewChallenge();
      }
    }
  } catch (error) {
    console.error("Error initializing game:", error);
    showError("Failed to load game");
  }
}

// Display the current challenge
function displayChallenge() {
  if (!currentChallenge) return;

  loadingElement.style.display = "none";
  gameActiveElement.style.display = "block";

  challengeImageElement.src = currentChallenge.imageUrl;
  challengeImageElement.alt = "Challenge Image";

  // Reset UI state
  guessSection.style.display = "block";
  resultSection.style.display = "none";
  guessInput.value = "";
  hasGuessed = false;
}

// Load a new challenge
async function loadNewChallenge() {
  try {
    loadingElement.style.display = "block";
    gameActiveElement.style.display = "none";

    const response = await fetch("/api/new-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as NewGameResponse;
    currentChallenge = data.challengeData;
    displayChallenge();
  } catch (error) {
    console.error("Error loading new challenge:", error);
    showError("Failed to load new challenge");
  }
}

// Submit a guess
async function submitGuess() {
  if (!currentChallenge || hasGuessed) return;

  const guess = guessInput.value.toLowerCase().replace(/^r\//, '').trim();
  if (!guess) {
    alert("Please enter a subreddit name");
    return;
  }

  try {
    submitGuessButton.disabled = true;
    submitGuessButton.textContent = "Submitting...";

    const response = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guess,
        imageUrl: currentChallenge.imageUrl,
        answer: currentChallenge.answer
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as GuessResponse;

    // Update score
    userScoreElement.textContent = data.newScore.toString();

    // Show result
    showResult(data.isCorrect, data.userGuess, data.correctAnswer, false);

  } catch (error) {
    console.error("Error submitting guess:", error);
    alert("Failed to submit guess. Please try again.");
  } finally {
    submitGuessButton.disabled = false;
    submitGuessButton.textContent = "Guess";
  }
}

// Show the result of a guess
function showResult(isCorrect: boolean, userGuess: string, correctAnswer: string, alreadyGuessed: boolean) {
  hasGuessed = true;
  guessSection.style.display = "none";
  resultSection.style.display = "block";

  if (alreadyGuessed) {
    resultMessage.textContent = isCorrect ? "🎉 You already got this one right!" : "🔒 You already guessed on this image";
    resultMessage.className = `result-message ${isCorrect ? 'correct' : 'already-guessed'}`;
  } else {
    resultMessage.textContent = isCorrect ? "🎉 Correct!" : "❌ Wrong!";
    resultMessage.className = `result-message ${isCorrect ? 'correct' : 'incorrect'}`;
  }

  answerDisplay.textContent = `Your guess: r/${userGuess} | Answer: r/${correctAnswer}`;
}

// Share challenge
async function shareChallenge() {
  if (!currentChallenge) {
    alert("No challenge available to share");
    return;
  }

  try {
    shareButton.disabled = true;
    shareButton.textContent = "Sharing...";

    console.log("Sharing challenge:", currentChallenge);

    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: currentChallenge.imageUrl,
        answer: currentChallenge.answer
      })
    });

    console.log("Share response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Share error response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Share result:", result);

    if (result.status === "success") {
      alert(`🎯 Challenge shared successfully! Post ID: ${result.postId || 'unknown'}`);
    } else {
      alert(`Failed to share: ${result.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error("Error sharing challenge:", error);
    alert(`Failed to share challenge: ${error.message}`);
  } finally {
    shareButton.disabled = false;
    shareButton.textContent = "Share Challenge";
  }
}

// Toggle leaderboard
async function toggleLeaderboard() {
  showingLeaderboard = !showingLeaderboard;

  if (showingLeaderboard) {
    await loadLeaderboard();
    leaderboardElement.style.display = "block";
    toggleLeaderboardButton.textContent = "Hide Leaderboard";
  } else {
    leaderboardElement.style.display = "none";
    toggleLeaderboardButton.textContent = "Show Leaderboard";
  }
}

// Load leaderboard
async function loadLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as LeaderboardResponse;
    displayLeaderboard(data.leaderboard);
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    leaderboardContent.innerHTML = "<p>Failed to load leaderboard</p>";
  }
}

// Display leaderboard
function displayLeaderboard(leaderboard: any[]) {
  if (leaderboard.length === 0) {
    leaderboardContent.innerHTML = "<p>No scores yet! Be the first to play!</p>";
    return;
  }

  const html = leaderboard.slice(0, 10).map(player => `
    <div class="leaderboard-item ${player.rank <= 3 ? 'top-3' : ''}">
      <span class="rank">${player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `${player.rank}.`}</span>
      <span class="username">${player.username}</span>
      <span class="score">${player.score}</span>
    </div>
  `).join('');

  leaderboardContent.innerHTML = html;
}

// Show error message
function showError(message: string) {
  loadingElement.innerHTML = `<p style="color: red;">${message}</p>`;
}

// Event Listeners
submitGuessButton.addEventListener("click", submitGuess);
guessInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    submitGuess();
  }
});
newGameButton.addEventListener("click", loadNewChallenge);
shareButton.addEventListener("click", shareChallenge);
toggleLeaderboardButton.addEventListener("click", toggleLeaderboard);

// Initialize the game when the page loads
initializeGame();
