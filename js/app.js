/**
 * Game Leaderboard Platform - Client Application
 * 
 * Vanilla JavaScript (ES6+ async/await) implementation.
 * Strictly adheres to DOM textContent manipulation for XSS prevention.
 */

'use strict';

const MAX_ALLOWED_SCORE = 2147483647;
const MIN_ALLOWED_SCORE = 0;

// Application State
let currentUser = null; // { id, username, role } | null
let activeFilters = {
    game: 'all',
    limit: '10',
    period: 'all',
    sort: 'score_desc',
    search: '',
};
let adminActiveStatus = 'pending';
let searchDebounceTimer = null;

// DOM Element References
let authWidget = null;
let authLoggedOut = null;
let authLoggedIn = null;
let sessionUsername = null;
let sessionRoleBadge = null;
let btnLogout = null;
let btnOpenAuth = null;
let btnPromptAuth = null;

let authModal = null;
let btnCloseAuthModal = null;
let tabLogin = null;
let tabRegister = null;
let loginForm = null;
let registerForm = null;
let authModalFeedback = null;
let loginUsernameInput = null;
let loginPasswordInput = null;
let registerUsernameInput = null;
let registerPasswordInput = null;

let adminDashboard = null;
let btnApproveAll = null;
let adminTabs = [];
let adminCountPending = null;
let adminCountApproved = null;
let adminCountRejected = null;
let adminQueueBody = null;
let adminQueueStatus = null;

let gameSelector = null;
let limitSelector = null;
let sortSelector = null;
let searchInput = null;
let btnClearSearch = null;
let activeFilterBadge = null;
let periodButtons = [];

let leaderboardTable = null;
let thGameCol = null;
let leaderboardBody = null;
let leaderboardStatus = null;
let emptyState = null;
let emptyStateText = null;

let rankForm = null;
let rankPlayerInput = null;
let rankBtn = null;
let rankResult = null;

let authRequiredBox = null;
let scoreForm = null;
let submitUserLabel = null;
let formGameInput = null;
let gamesDatalist = null;
let adminPlayerNameGroup = null;
let playerNameOverrideInput = null;
let scoreInput = null;
let submitBtn = null;
let formFeedback = null;

let themeToggle = null;
let themeToggleIcon = null;
let themeToggleText = null;

/**
 * Initializes DOM element references, hooks event listeners, and bootstraps application state.
 */
function initApp() {
    // Theme initialization
    initTheme();
    // Auth Elements
    authWidget = document.getElementById('authWidget');
    authLoggedOut = document.getElementById('authLoggedOut');
    authLoggedIn = document.getElementById('authLoggedIn');
    sessionUsername = document.getElementById('sessionUsername');
    sessionRoleBadge = document.getElementById('sessionRoleBadge');
    btnLogout = document.getElementById('btnLogout');
    btnOpenAuth = document.getElementById('btnOpenAuth');
    btnPromptAuth = document.getElementById('btnPromptAuth');

    // Modal Elements
    authModal = document.getElementById('authModal');
    btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
    tabLogin = document.getElementById('tabLogin');
    tabRegister = document.getElementById('tabRegister');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    authModalFeedback = document.getElementById('authModalFeedback');
    loginUsernameInput = document.getElementById('loginUsername');
    loginPasswordInput = document.getElementById('loginPassword');
    registerUsernameInput = document.getElementById('registerUsername');
    registerPasswordInput = document.getElementById('registerPassword');

    // Admin Elements
    adminDashboard = document.getElementById('adminDashboard');
    btnApproveAll = document.getElementById('btnApproveAll');
    adminTabs = Array.from(document.querySelectorAll('.admin-tab'));
    adminCountPending = document.getElementById('adminCountPending');
    adminCountApproved = document.getElementById('adminCountApproved');
    adminCountRejected = document.getElementById('adminCountRejected');
    adminQueueBody = document.getElementById('adminQueueBody');
    adminQueueStatus = document.getElementById('adminQueueStatus');

    // Filter Elements
    gameSelector = document.getElementById('gameSelector');
    limitSelector = document.getElementById('limitSelector');
    sortSelector = document.getElementById('sortSelector');
    searchInput = document.getElementById('searchInput');
    btnClearSearch = document.getElementById('btnClearSearch');
    activeFilterBadge = document.getElementById('activeFilterBadge');
    periodButtons = Array.from(document.querySelectorAll('.period-btn'));

    // Leaderboard Elements
    leaderboardTable = document.getElementById('leaderboardTable');
    thGameCol = document.getElementById('thGameCol');
    leaderboardBody = document.getElementById('leaderboardBody');
    leaderboardStatus = document.getElementById('leaderboardStatus');
    emptyState = document.getElementById('emptyState');
    emptyStateText = document.getElementById('emptyStateText');

    // Rank Lookup Elements
    rankForm = document.getElementById('rankForm');
    rankPlayerInput = document.getElementById('rankPlayerInput');
    rankBtn = document.getElementById('rankBtn');
    rankResult = document.getElementById('rankResult');

    // Score Form Elements
    authRequiredBox = document.getElementById('authRequiredBox');
    scoreForm = document.getElementById('scoreForm');
    submitUserLabel = document.getElementById('submitUserLabel');
    formGameInput = document.getElementById('formGameInput');
    gamesDatalist = document.getElementById('gamesDatalist');
    adminPlayerNameGroup = document.getElementById('adminPlayerNameGroup');
    playerNameOverrideInput = document.getElementById('playerNameOverrideInput');
    scoreInput = document.getElementById('scoreInput');
    submitBtn = document.getElementById('submitBtn');
    formFeedback = document.getElementById('formFeedback');

    // Hook Event Listeners
    setupEventListeners();

    // Restore cached filtration preferences from localStorage
    restoreSavedPreferences();

    // Check user session and load initial data
    checkAuthSession();
    fetchGames();
    loadLeaderboard();
}

/**
 * Initializes theme based on localStorage or OS prefers-color-scheme.
 */
function initTheme() {
    themeToggle = document.getElementById('themeToggle');
    themeToggleIcon = document.getElementById('themeToggleIcon');
    themeToggleText = document.getElementById('themeToggleText');

    let savedTheme = 'dark';
    try {
        savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            savedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
    } catch (e) {
        savedTheme = 'dark';
    }

    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

/**
 * Applies theme attribute to document and updates button indicator.
 * @param {string} theme 'dark' | 'light'
 */
function applyTheme(theme) {
    const isDark = theme !== 'light';
    const activeTheme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', activeTheme);

    if (themeToggleIcon) {
        themeToggleIcon.textContent = isDark ? '☀️' : '🌙';
    }
    if (themeToggleText) {
        themeToggleText.textContent = isDark ? 'Light' : 'Dark';
    }

    if (typeof window.refreshScoreChartTheme === 'function') {
        window.refreshScoreChartTheme();
    }
}

/**
 * Toggles between dark and light themes and persists to localStorage.
 */
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
        localStorage.setItem('theme', next);
    } catch (e) {
        console.warn('localStorage not accessible for theme persistence:', e);
    }
}

/**
 * Restores user filtration preferences from localStorage.
 */
function restoreSavedPreferences() {
    try {
        const savedGame = localStorage.getItem('selectedGame');
        if (savedGame) {
            activeFilters.game = savedGame;
        }

        const savedLimit = localStorage.getItem('leaderboard_limit');
        if (savedLimit && ['10', '15', '25', '50', 'all'].includes(savedLimit)) {
            activeFilters.limit = savedLimit;
            if (limitSelector) limitSelector.value = savedLimit;
        }

        const savedSort = localStorage.getItem('leaderboard_sort');
        if (savedSort && ['score_desc', 'score_asc', 'newest'].includes(savedSort)) {
            activeFilters.sort = savedSort;
            if (sortSelector) sortSelector.value = savedSort;
        }

        const savedPeriod = localStorage.getItem('leaderboard_period');
        if (savedPeriod && ['all', 'week', 'today'].includes(savedPeriod)) {
            activeFilters.period = savedPeriod;
            periodButtons.forEach((b) => {
                const isActive = b.dataset.period === savedPeriod;
                b.classList.toggle('active', isActive);
                b.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
        }
    } catch (e) {
        console.warn('localStorage not accessible for preference restoration:', e);
    }
}

/**
 * Sets up all DOM event listeners.
 */
function setupEventListeners() {
    // Auth Modal Triggers
    if (btnOpenAuth) btnOpenAuth.addEventListener('click', () => openAuthModal('login'));
    if (btnPromptAuth) btnPromptAuth.addEventListener('click', () => openAuthModal('login'));
    if (btnCloseAuthModal) btnCloseAuthModal.addEventListener('click', closeAuthModal);
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });
    }

    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));

    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
    if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);

    // Demo Chips
    const demoChips = document.querySelectorAll('.demo-chip');
    demoChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const user = chip.dataset.user;
            const pass = chip.dataset.pass;
            openAuthModal('login');
            if (loginUsernameInput) loginUsernameInput.value = user;
            if (loginPasswordInput) loginPasswordInput.value = pass;
        });
    });

    // Filtration Listeners
    if (gameSelector) {
        gameSelector.addEventListener('change', (e) => {
            activeFilters.game = e.target.value;
            try {
                localStorage.setItem('selectedGame', activeFilters.game);
            } catch (err) {}
            if (formGameInput && e.target.value !== 'all') {
                formGameInput.value = e.target.value;
            }
            loadLeaderboard();
            if (typeof window.loadScoreChart === 'function') {
                window.loadScoreChart(activeFilters.game);
            }
        });
    }

    if (limitSelector) {
        limitSelector.addEventListener('change', (e) => {
            activeFilters.limit = e.target.value;
            try {
                localStorage.setItem('leaderboard_limit', activeFilters.limit);
            } catch (err) {}
            loadLeaderboard();
        });
    }

    if (sortSelector) {
        sortSelector.addEventListener('change', (e) => {
            activeFilters.sort = e.target.value;
            try {
                localStorage.setItem('leaderboard_sort', activeFilters.sort);
            } catch (err) {}
            loadLeaderboard();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (btnClearSearch) {
                btnClearSearch.classList.toggle('hidden', val === '');
            }
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                activeFilters.search = val;
                loadLeaderboard();
            }, 300);
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            btnClearSearch.classList.add('hidden');
            activeFilters.search = '';
            loadLeaderboard();
        });
    }

    periodButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const period = e.currentTarget.dataset.period;
            if (period && period !== activeFilters.period) {
                activeFilters.period = period;
                try {
                    localStorage.setItem('leaderboard_period', activeFilters.period);
                } catch (err) {}
                periodButtons.forEach((b) => {
                    const isActive = b.dataset.period === period;
                    b.classList.toggle('active', isActive);
                    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });
                loadLeaderboard();
            }
        });
    });

    // Score Submission Form
    if (scoreForm) {
        scoreForm.addEventListener('submit', handleScoreSubmit);
    }

    // Rank Lookup Form
    if (rankForm) {
        rankForm.addEventListener('submit', handleRankLookupSubmit);
    }

    // Admin Verification Actions
    adminTabs.forEach((tab) => {
        tab.addEventListener('click', (e) => {
            const status = e.currentTarget.dataset.status;
            if (status && status !== adminActiveStatus) {
                adminActiveStatus = status;
                adminTabs.forEach((t) => t.classList.toggle('active', t.dataset.status === status));
                loadAdminQueue();
            }
        });
    });

    if (btnApproveAll) {
        btnApproveAll.addEventListener('click', () => handleAdminVerifyScore(null, 'approve_all_pending'));
    }
}

// =============================================================
// Authentication & Session Management
// =============================================================

/**
 * Checks current session status against GET api/session.php.
 */
async function checkAuthSession() {
    try {
        const response = await fetch('api/session.php');
        const data = await response.json();

        if (response.ok && data.status === 'success' && data.authenticated && data.user) {
            currentUser = data.user;
        } else {
            currentUser = null;
        }

        updateAuthUI();
    } catch (err) {
        console.error('Session check failed:', err);
        currentUser = null;
        updateAuthUI();
    }
}

/**
 * Updates UI based on authentication state.
 */
function updateAuthUI() {
    const isLoggedIn = currentUser !== null;

    if (isLoggedIn) {
        if (authLoggedOut) authLoggedOut.classList.add('hidden');
        if (authLoggedIn) authLoggedIn.classList.remove('hidden');

        if (sessionUsername) sessionUsername.textContent = currentUser.username;

        if (sessionRoleBadge) {
            sessionRoleBadge.textContent = currentUser.role === 'admin' ? 'Admin' : 'Player';
            sessionRoleBadge.className = `badge-role ${currentUser.role}`;
        }

        // Score submission availability
        if (authRequiredBox) authRequiredBox.classList.add('hidden');
        if (scoreForm) scoreForm.classList.remove('hidden');
        if (submitUserLabel) submitUserLabel.textContent = `${currentUser.username} (${currentUser.role})`;

        // Show admin controls if role === 'admin'
        if (currentUser.role === 'admin') {
            if (adminPlayerNameGroup) adminPlayerNameGroup.classList.remove('hidden');
            if (adminDashboard) {
                adminDashboard.classList.remove('hidden');
                loadAdminQueue();
            }
        } else {
            if (adminPlayerNameGroup) adminPlayerNameGroup.classList.add('hidden');
            if (adminDashboard) adminDashboard.classList.add('hidden');
        }
    } else {
        if (authLoggedOut) authLoggedOut.classList.remove('hidden');
        if (authLoggedIn) authLoggedIn.classList.add('hidden');

        // Score submission locked
        if (authRequiredBox) authRequiredBox.classList.remove('hidden');
        if (scoreForm) scoreForm.classList.add('hidden');
        if (adminDashboard) adminDashboard.classList.add('hidden');
        if (adminPlayerNameGroup) adminPlayerNameGroup.classList.add('hidden');
    }
}

/**
 * Opens authentication modal dialog.
 */
function openAuthModal(tab = 'login') {
    if (!authModal) return;
    hideModalFeedback();
    switchAuthTab(tab);
    authModal.classList.remove('hidden');
    if (tab === 'login' && loginUsernameInput) loginUsernameInput.focus();
    if (tab === 'register' && registerUsernameInput) registerUsernameInput.focus();
}

/**
 * Closes authentication modal.
 */
function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.add('hidden');
    hideModalFeedback();
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
}

/**
 * Switches between Login and Register tabs inside the modal.
 */
function switchAuthTab(tab) {
    hideModalFeedback();
    if (tab === 'login') {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
    } else {
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabRegister) tabRegister.classList.add('active');
        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
    }
}

/**
 * Handles user login form submission.
 */
async function handleLoginSubmit(event) {
    event.preventDefault();

    const username = loginUsernameInput ? loginUsernameInput.value.trim() : '';
    const password = loginPasswordInput ? loginPasswordInput.value : '';

    if (!username || !password) {
        showModalFeedback('Please enter both username and password.', 'error');
        return;
    }

    const btn = document.getElementById('btnLoginSubmit');
    if (btn) btn.disabled = true;

    try {
        const response = await fetch('api/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            showModalFeedback(data.message || 'Login failed.', 'error');
            return;
        }

        currentUser = data.user;
        updateAuthUI();
        closeAuthModal();
        loadLeaderboard();
    } catch (err) {
        console.error('Login error:', err);
        showModalFeedback('Network error while logging in.', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Handles user registration form submission.
 */
async function handleRegisterSubmit(event) {
    event.preventDefault();

    const username = registerUsernameInput ? registerUsernameInput.value.trim() : '';
    const password = registerPasswordInput ? registerPasswordInput.value : '';

    if (!username || !password) {
        showModalFeedback('Please enter both username and password.', 'error');
        return;
    }

    if (username.length < 3 || username.length > 50) {
        showModalFeedback('Username must be between 3 and 50 characters.', 'error');
        return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showModalFeedback('Username may only contain letters, numbers, and underscores.', 'error');
        return;
    }

    if (password.length < 6) {
        showModalFeedback('Password must be at least 6 characters.', 'error');
        return;
    }

    const btn = document.getElementById('btnRegisterSubmit');
    if (btn) btn.disabled = true;

    try {
        const response = await fetch('api/register.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            showModalFeedback(data.message || 'Registration failed.', 'error');
            return;
        }

        currentUser = data.user;
        updateAuthUI();
        closeAuthModal();
        loadLeaderboard();
    } catch (err) {
        console.error('Registration error:', err);
        showModalFeedback('Network error while creating account.', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    try {
        await fetch('api/logout.php', { method: 'POST' });
        currentUser = null;
        updateAuthUI();
        loadLeaderboard();
    } catch (err) {
        console.error('Logout error:', err);
        currentUser = null;
        updateAuthUI();
    }
}

function showModalFeedback(message, type) {
    if (!authModalFeedback) return;
    authModalFeedback.textContent = message;
    authModalFeedback.className = `form-feedback ${type}`;
    authModalFeedback.classList.remove('hidden');
}

function hideModalFeedback() {
    if (!authModalFeedback) return;
    authModalFeedback.textContent = '';
    authModalFeedback.className = 'form-feedback hidden';
}

// =============================================================
// Leaderboard & Filtration Engine
// =============================================================

/**
 * Fetches distinct games to populate selectors and datalists.
 */
async function fetchGames() {
    try {
        const response = await fetch('api/get-games.php');
        const data = await response.json();

        if (response.ok && data.status === 'success' && Array.isArray(data.games)) {
            populateGameSelectors(data.games);
        }
    } catch (err) {
        console.error('Failed to load games:', err);
    }
}

function populateGameSelectors(games) {
    if (gameSelector) {
        const prevVal = gameSelector.value;
        gameSelector.replaceChildren();

        const optAll = document.createElement('option');
        optAll.value = 'all';
        optAll.textContent = 'All Games';
        gameSelector.appendChild(optAll);

        games.forEach((game) => {
            const opt = document.createElement('option');
            opt.value = game;
            opt.textContent = game;
            gameSelector.appendChild(opt);
        });

        if (activeFilters.game && (activeFilters.game === 'all' || games.includes(activeFilters.game))) {
            gameSelector.value = activeFilters.game;
        } else {
            gameSelector.value = prevVal || 'all';
        }
    }

    if (gamesDatalist) {
        gamesDatalist.replaceChildren();
        games.forEach((game) => {
            const opt = document.createElement('option');
            opt.value = game;
            gamesDatalist.appendChild(opt);
        });
    }

    if (formGameInput && !formGameInput.value && games.length > 0) {
        formGameInput.value = games[0];
    }
}

/**
 * Loads leaderboard scores according to activeFilters.
 */
async function loadLeaderboard() {
    updateFilterSummaryBadge();
    showLeaderboardStatus('Loading leaderboard rankings...', 'loading');
    showEmptyState(false);

    try {
        const params = new URLSearchParams({
            game: activeFilters.game,
            limit: activeFilters.limit,
            period: activeFilters.period,
            sort: activeFilters.sort,
        });

        if (activeFilters.search) {
            params.set('search', activeFilters.search);
        }

        const response = await fetch(`api/get-scores.php?${params.toString()}`);
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            showLeaderboardStatus(data.message || 'Failed to load scores.', 'error');
            renderLeaderboardTable([]);
            return;
        }

        hideLeaderboardStatus();
        renderLeaderboardTable(data.scores || []);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        showLeaderboardStatus('Network connection error.', 'error');
        renderLeaderboardTable([]);
    }
}

/**
 * Updates the filter summary pill badge in the card header.
 */
function updateFilterSummaryBadge() {
    if (!activeFilterBadge) return;

    const gameLabel = activeFilters.game === 'all' ? 'All Games' : activeFilters.game;
    const limitLabel = activeFilters.limit === 'all' ? 'All Scores' : `Top ${activeFilters.limit}`;
    const periodLabel = activeFilters.period === 'today' ? 'Today' : (activeFilters.period === 'week' ? 'This Week' : 'All-Time');

    activeFilterBadge.textContent = `${gameLabel} • ${limitLabel} • ${periodLabel}`;
}

/**
 * Renders leaderboard rows safely using document.createElement and textContent.
 */
function renderLeaderboardTable(scores) {
    if (!leaderboardBody) return;
    leaderboardBody.replaceChildren();

    const isAllGames = (activeFilters.game === 'all');
    if (thGameCol) {
        thGameCol.style.display = isAllGames ? '' : 'none';
    }

    if (!Array.isArray(scores) || scores.length === 0) {
        showEmptyState(true);
        return;
    }

    showEmptyState(false);

    scores.forEach((entry, index) => {
        const rankNumber = index + 1;
        const row = document.createElement('tr');

        if (rankNumber <= 3 && activeFilters.sort === 'score_desc') {
            row.classList.add(`rank-${rankNumber}`);
        }

        // 1. Rank Cell
        const rankCell = document.createElement('td');
        rankCell.className = 'td-rank';
        const rankBadge = document.createElement('span');
        rankBadge.className = (rankNumber <= 3 && activeFilters.sort === 'score_desc') ? 'rank-badge' : 'rank-default';
        rankBadge.textContent = `#${rankNumber}`;
        rankCell.appendChild(rankBadge);
        row.appendChild(rankCell);

        // 2. Game Cell (conditionally visible)
        if (isAllGames) {
            const gameCell = document.createElement('td');
            gameCell.className = 'td-game';
            gameCell.textContent = entry.game || '-';
            row.appendChild(gameCell);
        }

        // 3. Player Name Cell (strictly textContent for XSS protection)
        const playerCell = document.createElement('td');
        playerCell.className = 'td-player';
        playerCell.textContent = entry.player_name;
        row.appendChild(playerCell);

        // 4. Score Cell
        const scoreCell = document.createElement('td');
        scoreCell.className = 'td-score';
        const numScore = Number(entry.score);
        scoreCell.textContent = Number.isFinite(numScore) ? numScore.toLocaleString() : String(entry.score);
        row.appendChild(scoreCell);

        // 5. Date Cell
        const dateCell = document.createElement('td');
        dateCell.className = 'td-date';
        dateCell.textContent = formatTimestamp(entry.created_at);
        row.appendChild(dateCell);

        leaderboardBody.appendChild(row);
    });
}

function formatTimestamp(dateString) {
    if (!dateString) return '-';
    const parsed = new Date(dateString.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// =============================================================
// Authenticated Score Submission
// =============================================================

async function handleScoreSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
        openAuthModal('login');
        return;
    }

    const game = formGameInput ? formGameInput.value.trim() : '';
    const scoreRaw = scoreInput ? scoreInput.value.trim() : '';
    let customPlayerName = '';

    if (currentUser.role === 'admin' && playerNameOverrideInput) {
        customPlayerName = playerNameOverrideInput.value.trim();
    }

    if (!game) {
        showFormFeedback('Please enter or select a game name.', 'error');
        return;
    }

    if (game.length > 100) {
        showFormFeedback('Game name cannot exceed 100 characters.', 'error');
        return;
    }

    if (scoreRaw === '') {
        showFormFeedback('Please enter a score.', 'error');
        return;
    }

    if (!/^\d+$/.test(scoreRaw)) {
        if (scoreRaw.startsWith('-')) {
            showFormFeedback('Score must be a non-negative number (0 or greater).', 'error');
        } else {
            showFormFeedback('Score must be a valid whole integer.', 'error');
        }
        return;
    }

    if (scoreRaw.length > 10 || (scoreRaw.length === 10 && scoreRaw > String(MAX_ALLOWED_SCORE))) {
        showFormFeedback('Score is out of allowed range (must be between 0 and 2,147,483,647).', 'error');
        return;
    }

    const score = parseInt(scoreRaw, 10);
    setSubmitButtonState(true);
    hideFormFeedback();

    const payload = {
        game: game,
        score: score,
    };

    if (customPlayerName) {
        payload.player_name = customPlayerName;
    }

    try {
        const response = await fetch('api/post-score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            showFormFeedback(data.message || 'Submission failed.', 'error');
            return;
        }

        showFormFeedback(data.message || 'Score submitted and sent to the admin for verification.', 'success');

        if (scoreInput) scoreInput.value = '';
        if (playerNameOverrideInput) playerNameOverrideInput.value = '';

        // If admin submitted, reload admin queue immediately
        if (currentUser.role === 'admin') {
            loadAdminQueue();
        }
    } catch (err) {
        console.error('Score submission error:', err);
        showFormFeedback('Network error submitting score.', 'error');
    } finally {
        setSubmitButtonState(false);
    }
}

// =============================================================
// Admin Moderation Queue
// =============================================================

async function loadAdminQueue() {
    if (!currentUser || currentUser.role !== 'admin' || !adminDashboard) {
        return;
    }

    showAdminStatus('Loading moderation queue...', 'loading');

    try {
        const response = await fetch(`api/admin-pending-scores.php?status=${encodeURIComponent(adminActiveStatus)}`);
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            showAdminStatus(data.message || 'Failed to load moderation queue.', 'error');
            return;
        }

        hideAdminStatus();

        // Update count badges
        if (data.counts) {
            if (adminCountPending) adminCountPending.textContent = String(data.counts.pending || 0);
            if (adminCountApproved) adminCountApproved.textContent = String(data.counts.approved || 0);
            if (adminCountRejected) adminCountRejected.textContent = String(data.counts.rejected || 0);

            if (btnApproveAll) {
                btnApproveAll.disabled = (data.counts.pending === 0);
            }
        }

        renderAdminQueueTable(data.scores || []);
    } catch (err) {
        console.error('Admin queue error:', err);
        showAdminStatus('Error reaching moderation queue API.', 'error');
    }
}

function renderAdminQueueTable(scores) {
    if (!adminQueueBody) return;
    adminQueueBody.replaceChildren();

    if (!Array.isArray(scores) || scores.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyTd = document.createElement('td');
        emptyTd.colSpan = 6;
        emptyTd.style.textAlign = 'center';
        emptyTd.style.padding = '2rem';
        emptyTd.style.color = 'var(--text-muted)';
        emptyTd.textContent = `No ${adminActiveStatus} scores in queue.`;
        emptyRow.appendChild(emptyTd);
        adminQueueBody.appendChild(emptyRow);
        return;
    }

    scores.forEach((entry) => {
        const row = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.textContent = `#${entry.id}`;

        const tdGame = document.createElement('td');
        tdGame.textContent = entry.game;

        const tdPlayer = document.createElement('td');
        tdPlayer.textContent = entry.player_name;

        const tdScore = document.createElement('td');
        tdScore.style.textAlign = 'right';
        tdScore.style.fontWeight = '700';
        tdScore.textContent = Number(entry.score).toLocaleString();

        const tdDate = document.createElement('td');
        tdDate.className = 'td-date';
        tdDate.textContent = formatTimestamp(entry.created_at);

        const tdAction = document.createElement('td');
        tdAction.style.textAlign = 'center';

        if (entry.status === 'pending') {
            const btnApprove = document.createElement('button');
            btnApprove.type = 'button';
            btnApprove.className = 'btn-action-approve';
            btnApprove.textContent = 'Approve';
            btnApprove.addEventListener('click', () => handleAdminVerifyScore(entry.id, 'approve'));

            const btnReject = document.createElement('button');
            btnReject.type = 'button';
            btnReject.className = 'btn-action-reject';
            btnReject.textContent = 'Reject';
            btnReject.addEventListener('click', () => handleAdminVerifyScore(entry.id, 'reject'));

            tdAction.appendChild(btnApprove);
            tdAction.appendChild(btnReject);
        } else {
            const statusSpan = document.createElement('span');
            statusSpan.className = `badge-status badge-${entry.status === 'approved' ? '201' : '400'}`;
            statusSpan.textContent = entry.status.toUpperCase();
            tdAction.appendChild(statusSpan);
        }

        row.appendChild(tdId);
        row.appendChild(tdGame);
        row.appendChild(tdPlayer);
        row.appendChild(tdScore);
        row.appendChild(tdDate);
        row.appendChild(tdAction);

        adminQueueBody.appendChild(row);
    });
}

async function handleAdminVerifyScore(scoreId, action) {
    try {
        const payload = { action };
        if (scoreId !== null) {
            payload.score_id = scoreId;
        }

        const response = await fetch('api/admin-verify-score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            // Refresh admin queue, public leaderboard and analytics chart immediately
            loadAdminQueue();
            loadLeaderboard();
            if (typeof window.loadScoreChart === 'function') {
                window.loadScoreChart(activeFilters.game);
            }
        } else {
            alert(data.message || 'Action failed.');
        }
    } catch (err) {
        console.error('Verify error:', err);
        alert('Network error verifying score.');
    }
}

function showAdminStatus(message, type) {
    if (!adminQueueStatus) return;
    adminQueueStatus.textContent = message;
    adminQueueStatus.className = `status-message ${type}`;
    adminQueueStatus.style.display = type === 'loading' ? 'flex' : 'block';
}

function hideAdminStatus() {
    if (!adminQueueStatus) return;
    adminQueueStatus.textContent = '';
    adminQueueStatus.className = 'status-message';
    adminQueueStatus.style.display = 'none';
}

// =============================================================
// Player Rank Lookup
// =============================================================

async function handleRankLookupSubmit(event) {
    event.preventDefault();

    const playerName = rankPlayerInput ? rankPlayerInput.value.trim() : '';
    if (!playerName) {
        showRankResult('Please enter a player username.', 'error');
        return;
    }

    const targetGame = activeFilters.game === 'all' ? 'Space Blaster' : activeFilters.game;

    setRankButtonState(true);
    showRankResult(`Searching rank for "${playerName}" in ${targetGame}...`, 'loading');

    try {
        const url = `api/get-rank.php?game=${encodeURIComponent(targetGame)}&player_name=${encodeURIComponent(playerName)}&period=${encodeURIComponent(activeFilters.period)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            showRankResult(data.message || 'Failed to retrieve player rank.', 'error');
            return;
        }

        renderRankLookupResult(data, playerName, targetGame);
    } catch (err) {
        console.error('Rank lookup error:', err);
        showRankResult('Network error checking rank.', 'error');
    } finally {
        setRankButtonState(false);
    }
}

function renderRankLookupResult(data, searchedName, gameTitle) {
    if (!rankResult) return;
    rankResult.replaceChildren();

    const periodLabel = activeFilters.period === 'today' ? 'Today' : (activeFilters.period === 'week' ? 'This Week' : 'All-Time');

    if (!data.found) {
        rankResult.className = 'rank-result not-found';
        const msg = document.createElement('p');
        msg.textContent = `No approved scores found for player "${searchedName}" in ${gameTitle} (${periodLabel}).`;
        rankResult.appendChild(msg);
        rankResult.classList.remove('hidden');
        return;
    }

    rankResult.className = 'rank-result found';

    const p = document.createElement('p');
    p.appendChild(document.createTextNode('Player '));

    const nameSpan = document.createElement('strong');
    nameSpan.textContent = `"${data.player_name}"`;
    p.appendChild(nameSpan);

    p.appendChild(document.createTextNode(' is ranked '));

    const rankSpan = document.createElement('span');
    rankSpan.className = 'rank-highlight-badge';
    rankSpan.textContent = `#${data.rank}`;
    p.appendChild(rankSpan);

    p.appendChild(document.createTextNode(` in ${data.game} (${periodLabel}) with an approved best score of `));

    const scoreSpan = document.createElement('strong');
    scoreSpan.textContent = Number(data.best_score).toLocaleString();
    p.appendChild(scoreSpan);

    const attemptsText = data.attempts === 1 ? '1 approved score' : `${data.attempts} approved scores`;
    p.appendChild(document.createTextNode(` across ${attemptsText}.`));

    rankResult.appendChild(p);
    rankResult.classList.remove('hidden');
}

function showRankResult(message, type) {
    if (!rankResult) return;
    rankResult.replaceChildren();
    rankResult.className = `rank-result ${type}`;
    const p = document.createElement('p');
    p.textContent = message;
    rankResult.appendChild(p);
    rankResult.classList.remove('hidden');
}

function hideRankResult() {
    if (!rankResult) return;
    rankResult.replaceChildren();
    rankResult.className = 'rank-result hidden';
}

function setRankButtonState(isLoading) {
    if (!rankBtn) return;
    rankBtn.disabled = isLoading;
    const btnText = rankBtn.querySelector('.rank-btn-text');
    if (btnText) btnText.textContent = isLoading ? 'Searching...' : 'Find Rank';
}

function setSubmitButtonState(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    const btnText = submitBtn.querySelector('.btn-text');
    if (btnText) btnText.textContent = isLoading ? 'Submitting...' : 'Submit Score for Verification';
}

function showFormFeedback(message, type) {
    if (!formFeedback) return;
    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
    formFeedback.classList.remove('hidden');
}

function hideFormFeedback() {
    if (!formFeedback) return;
    formFeedback.textContent = '';
    formFeedback.className = 'form-feedback hidden';
}

function showLeaderboardStatus(message, type) {
    if (!leaderboardStatus) return;
    leaderboardStatus.textContent = message;
    leaderboardStatus.className = `status-message ${type}`;
    leaderboardStatus.style.display = type === 'loading' ? 'flex' : 'block';
}

function hideLeaderboardStatus() {
    if (!leaderboardStatus) return;
    leaderboardStatus.textContent = '';
    leaderboardStatus.className = 'status-message';
    leaderboardStatus.style.display = 'none';
}

function showEmptyState(show) {
    if (!emptyState || !leaderboardTable) return;
    if (show) {
        emptyState.classList.remove('hidden');
        leaderboardTable.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        leaderboardTable.classList.remove('hidden');
    }
}

// Bootstrap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
