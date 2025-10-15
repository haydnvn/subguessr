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
const postStatsElement = document.getElementById("post-stats") as HTMLDivElement;
const totalGuessesElement = document.getElementById("total-guesses") as HTMLSpanElement;
const successRateElement = document.getElementById("success-rate") as HTMLSpanElement;
const correctGuessesElement = document.getElementById("correct-guesses") as HTMLSpanElement;
const incorrectGuessesElement = document.getElementById("incorrect-guesses") as HTMLSpanElement;
// Game State
let currentPostId: string | null = null;
let currentChallenge: any = null;
let hasGuessed = false;
let showingLeaderboard = false;
let availableSubreddits: string[] = [];
let filteredSubreddits: string[] = [];
let selectedSuggestionIndex = -1;

// Load available subreddits for autocomplete
async function loadSubreddits() {
  try {
    const response = await fetch("/api/subreddits");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    availableSubreddits = data.subreddits || [];
  } catch (error) {
    console.error("Error loading subreddits:", error);
    availableSubreddits = [];
  }
}

// Initialize the game
async function initializeGame() {
  try {
    // Load subreddits for autocomplete
    await loadSubreddits();
    
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

        // Display post statistics
        if (data.postStats) {
          displayPostStats(data.postStats);
        }

        // Check if user already guessed
        if (data.hasGuessed && data.guessData) {
          showResult(data.guessData.isCorrect, data.guessData.guess, currentChallenge.answer, true);
        }
      } else {
        showError("No challenge found for this post. This post may be corrupted or expired.");
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
  
  // Re-apply image protection when new image loads
  challengeImageElement.onload = () => {
    disableImageInteractions();
  };

  // Reset UI state
  guessSection.style.display = "block";
  resultSection.style.display = "none";
  guessInput.value = "";
  hasGuessed = false;
  
  // Reset stats visibility for new challenges
  postStatsElement.classList.remove("visible");
}

// Load a new challenge
async function loadNewChallenge() {
  try {
    newGameButton.disabled = true;
    newGameButton.textContent = "Loading...";

    const response = await fetch("/api/new-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as NewGameResponse;

    if (data.status === "success" && data.challengeData) {
      // Update the current challenge and display it
      currentChallenge = data.challengeData;
      displayChallenge();
      
      // Reset the game state
      hasGuessed = false;
      
      // Refresh post statistics for the new challenge
      await refreshPostStats();
      
      // Show success message
      alert("🎯 New challenge loaded!");
    } else {
      throw new Error(data.message || "Failed to load new challenge");
    }
  } catch (error) {
    console.error("Error loading new challenge:", error);
    alert(`Failed to load new challenge: ${(error as Error).message}`);
  } finally {
    newGameButton.disabled = false;
    newGameButton.textContent = "New Game";
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

    // Refresh post statistics
    await refreshPostStats();

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    alert(`Failed to share challenge: ${errorMessage}`);
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

// Display post statistics
function displayPostStats(stats: any) {
  if (!stats) return;
  
  totalGuessesElement.textContent = stats.totalGuesses.toString();
  successRateElement.textContent = `${stats.successRate}%`;
  correctGuessesElement.textContent = stats.correctGuesses.toString();
  incorrectGuessesElement.textContent = stats.incorrectGuesses.toString();
  
  // Show the stats section with animation
  postStatsElement.style.display = "block";
  
  // Trigger animation after a small delay to ensure display is set
  setTimeout(() => {
    postStatsElement.classList.add("visible");
  }, 50);
}

// Refresh post statistics
async function refreshPostStats() {
  if (!currentPostId || !currentChallenge) return;
  
  try {
    const response = await fetch("/api/init");
    if (!response.ok) return;
    
    const data = await response.json();
    if (data.postStats) {
      displayPostStats(data.postStats);
    }
  } catch (error) {
    console.error("Error refreshing post stats:", error);
  }
}

// Autocomplete functionality
function createSuggestionsContainer() {
  let suggestionsContainer = document.getElementById("suggestions-container");
  if (!suggestionsContainer) {
    suggestionsContainer = document.createElement("div");
    suggestionsContainer.id = "suggestions-container";
    suggestionsContainer.className = "suggestions-container";
    
    // Find the input group container and append the suggestions there
    const inputGroup = guessInput.closest('.input-group');
    if (inputGroup) {
      inputGroup.appendChild(suggestionsContainer);
    } else {
      guessInput.parentNode?.insertBefore(suggestionsContainer, guessInput.nextSibling);
    }
  }
  return suggestionsContainer;
}

function filterSubreddits(input: string) {
  const cleanInput = input.toLowerCase().replace(/^r\//, '').trim();
  if (!cleanInput) {
    filteredSubreddits = [];
    return;
  }
  
  filteredSubreddits = availableSubreddits
    .filter(subreddit => subreddit.toLowerCase().includes(cleanInput))
    .slice(0, 8); // Limit to 8 suggestions
}

function showSuggestions() {
  const suggestionsContainer = createSuggestionsContainer();
  
  if (filteredSubreddits.length === 0) {
    suggestionsContainer.style.display = "none";
    return;
  }
  
  // Calculate optimal height based on viewport and position
  const inputRect = guessInput.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - inputRect.bottom;
  const maxHeight = Math.min(160, Math.max(120, spaceBelow - 20)); // Leave 20px margin
  
  suggestionsContainer.style.maxHeight = `${maxHeight}px`;
  
  const suggestionsHTML = filteredSubreddits
    .map((subreddit, index) => 
      `<div class="suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}" 
           data-subreddit="${subreddit}">r/${subreddit}</div>`
    )
    .join('');
  
  suggestionsContainer.innerHTML = suggestionsHTML;
  suggestionsContainer.style.display = "block";
  
  // Add click handlers to suggestions
  suggestionsContainer.querySelectorAll('.suggestion-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      selectSuggestion(index);
    });
  });
}

function hideSuggestions() {
  const suggestionsContainer = document.getElementById("suggestions-container");
  if (suggestionsContainer) {
    suggestionsContainer.style.display = "none";
  }
  selectedSuggestionIndex = -1;
}

function selectSuggestion(index: number) {
  if (index >= 0 && index < filteredSubreddits.length) {
    guessInput.value = filteredSubreddits[index];
    hideSuggestions();
    guessInput.focus();
  }
}

function handleKeyNavigation(e: KeyboardEvent) {
  if (filteredSubreddits.length === 0) return;
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, filteredSubreddits.length - 1);
      showSuggestions();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      showSuggestions();
      break;
    case 'Tab':
    case 'Enter':
      if (selectedSuggestionIndex >= 0) {
        e.preventDefault();
        selectSuggestion(selectedSuggestionIndex);
      }
      break;
    case 'Escape':
      hideSuggestions();
      break;
  }
}

// Event Listeners
submitGuessButton.addEventListener("click", submitGuess);
guessInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && selectedSuggestionIndex === -1) {
    submitGuess();
  }
});
guessInput.addEventListener("keydown", handleKeyNavigation);
guessInput.addEventListener("input", (e) => {
  const input = (e.target as HTMLInputElement).value;
  filterSubreddits(input);
  selectedSuggestionIndex = -1;
  showSuggestions();
});
guessInput.addEventListener("focus", () => {
  if (guessInput.value) {
    filterSubreddits(guessInput.value);
    showSuggestions();
  }
});
guessInput.addEventListener("blur", (e) => {
  // Delay hiding suggestions to allow clicking on them
  setTimeout(() => {
    hideSuggestions();
  }, 150);
});
newGameButton.addEventListener("click", loadNewChallenge);
shareButton.addEventListener("click", shareChallenge);
toggleLeaderboardButton.addEventListener("click", toggleLeaderboard);

// Disable right-click and other ways to access image URL
function disableImageInteractions() {
  const challengeImage = document.getElementById("challenge-image") as HTMLImageElement;
  
  if (challengeImage) {
    // Disable right-click context menu
    challengeImage.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      return false;
    });
    
    // Disable drag and drop
    challengeImage.addEventListener("dragstart", (e) => {
      e.preventDefault();
      return false;
    });
    
    // Disable selection
    challengeImage.addEventListener("selectstart", (e) => {
      e.preventDefault();
      return false;
    });
  }
}

// Disable keyboard shortcuts that might reveal image info
document.addEventListener("keydown", (e) => {
  // Disable F12 (DevTools), Ctrl+Shift+I, Ctrl+U (View Source), etc.
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.shiftKey && e.key === "C") ||
    (e.ctrlKey && e.key === "u") ||
    (e.ctrlKey && e.key === "s")
  ) {
    e.preventDefault();
    return false;
  }
});

// Initialize the game when the page loads
initializeGame();

// Set up image protection after DOM is loaded
document.addEventListener("DOMContentLoaded", disableImageInteractions);
