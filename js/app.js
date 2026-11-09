/**
 * Game Leaderboard Service - Client Application
 * 
 * Vanilla JavaScript (ES6+ async/await) implementation.
 * Strictly adheres to DOM textContent manipulation for XSS prevention.
 */

'use strict';

// DOM Element References
let gameSelector = null;
let leaderboardStatus = null;
let leaderboardTable = null;
let leaderboardBody = null;
let emptyState = null;
let scoreForm = null;
let formGameInput = null;
let playerNameInput = null;
let scoreInput = null;
let submitBtn = null;
let formFeedback = null;
let gamesDatalist = null;

/**
 * Initializes DOM element references and hooks event listeners.
 */
function initApp() {
    gameSelector = document.getElementById('gameSelector');
    leaderboardStatus = document.getElementById('leaderboardStatus');
    leaderboardTable = document.getElementById('leaderboardTable');
    leaderboardBody = document.getElementById('leaderboardBody');
    emptyState = document.getElementById('emptyState');
    scoreForm = document.getElementById('scoreForm');
    formGameInput = document.getElementById('formGameInput');
    playerNameInput = document.getElementById('playerNameInput');
    scoreInput = document.getElementById('scoreInput');
    submitBtn = document.getElementById('submitBtn');
    formFeedback = document.getElementById('formFeedback');
    gamesDatalist = document.getElementById('gamesDatalist');

    // Event Listeners
    if (gameSelector) {
        gameSelector.addEventListener('change', handleGameSelectionChange);
    }

    if (scoreForm) {
        scoreForm.addEventListener('submit', handleScoreSubmit);
    }

    // Load initial games list and leaderboard
    fetchGames();
}

/**
 * Handles dropdown change event to reload the active leaderboard.
 *
 * @param {Event} event
 */
function handleGameSelectionChange(event) {
    const selectedGame = event.target.value;
    if (selectedGame) {
        // Also pre-fill the form game input for user convenience
        if (formGameInput) {
            formGameInput.value = selectedGame;
        }
        loadLeaderboard(selectedGame);
    }
}

/**
 * Fetches available distinct games from the API and populates selectors and datalists.
 *
 * @param {string|null} selectedGameToKeep Game to preserve as selected, if any.
 */
async function fetchGames(selectedGameToKeep = null) {
    try {
        const response = await fetch('api/get-games.php');
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            showLeaderboardStatus(data.message || 'Failed to load games list.', 'error');
            return;
        }

        const games = Array.isArray(data.games) ? data.games : [];
        populateGameOptions(games, selectedGameToKeep);

        // Determine which game to display initially
        const activeGame = selectedGameToKeep || (games.length > 0 ? games[0] : null);
        if (activeGame) {
            if (formGameInput && !formGameInput.value) {
                formGameInput.value = activeGame;
            }
            loadLeaderboard(activeGame);
        } else {
            showEmptyState(true);
        }
    } catch (error) {
        console.error('Error fetching games:', error);
        showLeaderboardStatus('Unable to reach server. Please check your connection.', 'error');
    }
}

/**
 * Populates the game dropdown and datalist with distinct game names.
 *
 * @param {string[]} games
 * @param {string|null} selectedGame
 */
function populateGameOptions(games, selectedGame = null) {
    if (!gameSelector || !gamesDatalist) {
        return;
    }

    // Clear existing options
    gameSelector.replaceChildren();
    gamesDatalist.replaceChildren();

    if (games.length === 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'No games recorded yet';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        gameSelector.appendChild(defaultOption);
        return;
    }

    games.forEach((gameName) => {
        // Option for select dropdown
        const selectOption = document.createElement('option');
        selectOption.value = gameName;
        selectOption.textContent = gameName;
        if (selectedGame && selectedGame === gameName) {
            selectOption.selected = true;
        }
        gameSelector.appendChild(selectOption);

        // Option for datalist autocomplete
        const datalistOption = document.createElement('option');
        datalistOption.value = gameName;
        gamesDatalist.appendChild(datalistOption);
    });

    // Default select first item if none chosen
    if (!selectedGame && games.length > 0) {
        gameSelector.selectedIndex = 0;
    }
}

/**
 * Loads the Top 10 scores for a specified game.
 *
 * @param {string} gameName
 */
async function loadLeaderboard(gameName) {
    if (!gameName || typeof gameName !== 'string') {
        return;
    }

    showLeaderboardStatus(`Loading leaderboard for "${gameName}"...`, 'loading');
    showEmptyState(false);

    try {
        const response = await fetch(`api/get-scores.php?game=${encodeURIComponent(gameName)}`);
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            showLeaderboardStatus(data.message || 'Failed to load scores.', 'error');
            renderLeaderboardTable([]);
            return;
        }

        hideLeaderboardStatus();
        renderLeaderboardTable(data.scores || []);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showLeaderboardStatus('Error connecting to leaderboard API.', 'error');
        renderLeaderboardTable([]);
    }
}

/**
 * Renders scores into the leaderboard table safely using document.createElement and textContent.
 *
 * @param {Array<{id: number, player_name: string, score: number, created_at: string}>} scores
 */
function renderLeaderboardTable(scores) {
    if (!leaderboardBody) {
        return;
    }

    leaderboardBody.replaceChildren();

    if (!Array.isArray(scores) || scores.length === 0) {
        showEmptyState(true);
        return;
    }

    showEmptyState(false);

    scores.forEach((entry, index) => {
        const rankNumber = index + 1;
        const row = document.createElement('tr');

        if (rankNumber <= 3) {
            row.classList.add(`rank-${rankNumber}`);
        }

        // Rank Cell
        const rankCell = document.createElement('td');
        rankCell.className = 'td-rank';
        const rankBadge = document.createElement('span');
        rankBadge.className = rankNumber <= 3 ? 'rank-badge' : 'rank-default';
        rankBadge.textContent = `#${rankNumber}`;
        rankCell.appendChild(rankBadge);

        // Player Name Cell (strictly textContent for XSS protection)
        const playerCell = document.createElement('td');
        playerCell.className = 'td-player';
        playerCell.textContent = entry.player_name;

        // Score Cell
        const scoreCell = document.createElement('td');
        scoreCell.className = 'td-score';
        const numericScore = Number(entry.score);
        scoreCell.textContent = Number.isFinite(numericScore) 
            ? numericScore.toLocaleString() 
            : String(entry.score);

        // Date Cell
        const dateCell = document.createElement('td');
        dateCell.className = 'td-date';
        dateCell.textContent = formatTimestamp(entry.created_at);

        // Assemble row
        row.appendChild(rankCell);
        row.appendChild(playerCell);
        row.appendChild(scoreCell);
        row.appendChild(dateCell);

        leaderboardBody.appendChild(row);
    });
}

/**
 * Formats SQL timestamp into a clean, human-readable date.
 *
 * @param {string} dateString
 * @return {string}
 */
function formatTimestamp(dateString) {
    if (!dateString) {
        return '-';
    }

    // Convert SQL datetime "YYYY-MM-DD HH:MM:SS" to ISO-compatible "YYYY-MM-DDTHH:MM:SS"
    const parsedDate = new Date(dateString.replace(' ', 'T'));
    if (isNaN(parsedDate.getTime())) {
        return dateString;
    }

    return parsedDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Validates score submission form fields in the browser.
 *
 * @param {string} game
 * @param {string} playerName
 * @param {string} scoreRaw
 * @return {string|null} Validation error message or null if valid.
 */
function validateFormInput(game, playerName, scoreRaw) {
    if (!game || game.trim() === '') {
        return 'Please enter or select a game name.';
    }
    if (game.trim().length > 100) {
        return 'Game name cannot exceed 100 characters.';
    }

    if (!playerName || playerName.trim() === '') {
        return 'Please enter a player name.';
    }
    if (playerName.trim().length > 100) {
        return 'Player name cannot exceed 100 characters.';
    }

    if (scoreRaw === '' || scoreRaw === null || scoreRaw === undefined) {
        return 'Please enter a score.';
    }

    const parsedScore = Number(scoreRaw);
    if (!Number.isInteger(parsedScore) || String(parsedScore) !== scoreRaw.trim()) {
        return 'Score must be a valid whole integer.';
    }

    if (parsedScore < 0) {
        return 'Score must be a non-negative number (0 or greater).';
    }

    return null;
}

/**
 * Handles score form submission, validates inputs, and posts data via fetch.
 *
 * @param {Event} event
 */
async function handleScoreSubmit(event) {
    event.preventDefault();

    const game = formGameInput ? formGameInput.value.trim() : '';
    const playerName = playerNameInput ? playerNameInput.value.trim() : '';
    const scoreRaw = scoreInput ? scoreInput.value.trim() : '';

    // 1. Client-Side Validation
    const validationError = validateFormInput(game, playerName, scoreRaw);
    if (validationError) {
        showFormFeedback(validationError, 'error');
        return;
    }

    const score = parseInt(scoreRaw, 10);

    // 2. Set Loading State
    setSubmitButtonState(true);
    hideFormFeedback();

    try {
        const response = await fetch('api/post-score.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game: game,
                player_name: playerName,
                score: score
            })
        });

        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            const errorMsg = data.message || `Submission failed with status ${response.status}.`;
            showFormFeedback(errorMsg, 'error');
            return;
        }

        // 3. Success Handling
        showFormFeedback(data.message || 'Score recorded successfully!', 'success');

        // Reset player & score inputs, keep game name for convenience
        if (playerNameInput) {
            playerNameInput.value = '';
        }
        if (scoreInput) {
            scoreInput.value = '';
        }

        // Refresh game lists and reload leaderboard for the submitted game
        await fetchGames(game);
        if (gameSelector) {
            gameSelector.value = game;
        }
        loadLeaderboard(game);
    } catch (error) {
        console.error('Error submitting score:', error);
        showFormFeedback('Network error: unable to submit score. Please try again.', 'error');
    } finally {
        setSubmitButtonState(false);
    }
}

/**
 * Toggles submit button loading/disabled state.
 *
 * @param {boolean} isLoading
 */
function setSubmitButtonState(isLoading) {
    if (!submitBtn) {
        return;
    }

    submitBtn.disabled = isLoading;
    const btnText = submitBtn.querySelector('.btn-text');
    if (btnText) {
        btnText.textContent = isLoading ? 'Submitting...' : 'Submit Score';
    }
}

/**
 * Displays feedback in the form area using textContent (XSS-safe).
 *
 * @param {string} message
 * @param {'success'|'error'} type
 */
function showFormFeedback(message, type) {
    if (!formFeedback) {
        return;
    }

    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
    formFeedback.classList.remove('hidden');
}

/**
 * Hides the form feedback alert box.
 */
function hideFormFeedback() {
    if (!formFeedback) {
        return;
    }

    formFeedback.replaceChildren();
    formFeedback.className = 'form-feedback hidden';
}

/**
 * Displays status message for the leaderboard area using textContent.
 *
 * @param {string} message
 * @param {'loading'|'error'} type
 */
function showLeaderboardStatus(message, type) {
    if (!leaderboardStatus) {
        return;
    }

    leaderboardStatus.textContent = message;
    leaderboardStatus.className = `status-message ${type}`;
    leaderboardStatus.style.display = type === 'loading' ? 'flex' : 'block';
}

/**
 * Hides the leaderboard status message.
 */
function hideLeaderboardStatus() {
    if (!leaderboardStatus) {
        return;
    }

    leaderboardStatus.textContent = '';
    leaderboardStatus.className = 'status-message';
    leaderboardStatus.style.display = 'none';
}

/**
 * Toggles visibility of the empty state container.
 *
 * @param {boolean} show
 */
function showEmptyState(show) {
    if (!emptyState || !leaderboardTable) {
        return;
    }

    if (show) {
        emptyState.classList.remove('hidden');
        leaderboardTable.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        leaderboardTable.classList.remove('hidden');
    }
}

// Kick off initialization when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

