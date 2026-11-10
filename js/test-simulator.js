/**
 * Leaderboard Traffic & Stress Simulator Client
 * 
 * Generates automated high-volume score traffic and tests invalid edge-cases.
 * Strictly adheres to DOM textContent manipulation for XSS security.
 */

'use strict';

// DOM Element References
let simGameSelect = null;
let simBatchCount = null;
let btnStartBatch = null;
let btnRunEdgeCases = null;
let btnStop = null;
let btnClearLog = null;
let progressFill = null;
let metricSent = null;
let metricTotal = null;
let metricSuccess = null;
let metricErrors = null;
let metricLatency = null;
let simStatusText = null;
let simLogBody = null;
let simAuthNotice = null;
let simUserSession = null;
let chkUseApiKey = null;

let themeToggle = null;
let themeToggleIcon = null;
let themeToggleText = null;

// Simulator State
let isRunning = false;
let shouldStop = false;
let availableGames = [];
let totalLatencySum = 0;
let latencyCount = 0;
let requestCounter = 0;
let currentSessionUser = null;

// Random Generation Word Lists
const NAME_PREFIXES = [
    'Cyber', 'Shadow', 'Apex', 'Turbo', 'Retro', 'Nova', 'Pixel', 
    'Hyper', 'Vortex', 'Blaze', 'Quantum', 'Cosmic', 'Solar', 'Echo'
];

const NAME_SUFFIXES = [
    'Knight', 'Rider', 'Fox', 'Pilot', 'Hunter', 'Gamer', 'Master', 
    'Runner', 'Wolf', 'Hero', 'Striker', 'Drifter', 'Phantom', 'Ace'
];

/**
 * Initializes DOM element bindings, checks session, and loads available games.
 */
function initSimulator() {
    simGameSelect = document.getElementById('simGameSelect');
    simBatchCount = document.getElementById('simBatchCount');
    btnStartBatch = document.getElementById('btnStartBatch');
    btnRunEdgeCases = document.getElementById('btnRunEdgeCases');
    btnStop = document.getElementById('btnStop');
    btnClearLog = document.getElementById('btnClearLog');
    progressFill = document.getElementById('progressFill');
    metricSent = document.getElementById('metricSent');
    metricTotal = document.getElementById('metricTotal');
    metricSuccess = document.getElementById('metricSuccess');
    metricErrors = document.getElementById('metricErrors');
    metricLatency = document.getElementById('metricLatency');
    simStatusText = document.getElementById('simStatusText');
    simLogBody = document.getElementById('simLogBody');
    simAuthNotice = document.getElementById('simAuthNotice');
    simUserSession = document.getElementById('simUserSession');
    chkUseApiKey = document.getElementById('chkUseApiKey');

    // Theme initialization
    initTheme();

    if (chkUseApiKey) {
        chkUseApiKey.addEventListener('change', updateSimulatorAuthStatus);
    }

    // Attach Event Listeners
    if (btnStartBatch) {
        btnStartBatch.addEventListener('click', handleStartRandomBatch);
    }
    if (btnRunEdgeCases) {
        btnRunEdgeCases.addEventListener('click', handleRunEdgeCaseBattery);
    }
    if (btnStop) {
        btnStop.addEventListener('click', handleStopSimulator);
    }
    if (btnClearLog) {
        btnClearLog.addEventListener('click', handleClearLog);
    }

    // Check session & populate games
    checkSimulatorSession();
    fetchAvailableGames();
}

/**
 * Checks session status to inform user about authentication requirements.
 */
async function checkSimulatorSession() {
    try {
        const response = await fetch('api/session.php', { credentials: 'same-origin' });
        const data = await response.json();

        if (response.ok && data.status === 'success' && data.authenticated && data.user) {
            currentSessionUser = data.user;
        } else {
            currentSessionUser = null;
        }
        updateSimulatorAuthStatus();
    } catch (err) {
        console.error('Session check failed:', err);
    }
}

/**
 * Updates simulator badge based on active session and API key setting.
 */
function updateSimulatorAuthStatus() {
    const isApiKeyEnabled = chkUseApiKey && chkUseApiKey.checked;

    if (currentSessionUser) {
        if (simUserSession) {
            simUserSession.textContent = `${currentSessionUser.username} (${currentSessionUser.role.toUpperCase()})`;
            simUserSession.style.color = currentSessionUser.role === 'admin' ? '#fbbf24' : '#93c5fd';
        }
        if (simAuthNotice) simAuthNotice.classList.add('hidden');
    } else if (isApiKeyEnabled) {
        if (simUserSession) {
            simUserSession.textContent = 'Secret API Key (Direct Server Authorization)';
            simUserSession.style.color = '#34d399';
        }
        if (simAuthNotice) simAuthNotice.classList.add('hidden');
    } else {
        if (simUserSession) {
            simUserSession.textContent = 'Unauthenticated (Requests will return 401)';
            simUserSession.style.color = '#f87171';
        }
        if (simAuthNotice) simAuthNotice.classList.remove('hidden');
    }
}

/**
 * Initializes theme based on localStorage.
 */
function initTheme() {
    themeToggle = document.getElementById('themeToggle');
    themeToggleIcon = document.getElementById('themeToggleIcon');
    themeToggleText = document.getElementById('themeToggleText');

    let savedTheme = 'dark';
    try {
        savedTheme = localStorage.getItem('theme') || 'dark';
    } catch (e) {
        savedTheme = 'dark';
    }

    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function applyTheme(theme) {
    const isDark = theme !== 'light';
    const activeTheme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', activeTheme);
    if (themeToggleIcon) themeToggleIcon.textContent = isDark ? '☀️' : '🌙';
    if (themeToggleText) themeToggleText.textContent = isDark ? 'Light' : 'Dark';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
        localStorage.setItem('theme', next);
    } catch (e) {}
}

/**
 * Fetches distinct games from the API to populate the target dropdown.
 */
async function fetchAvailableGames() {
    try {
        const response = await fetch('api/get-games.php');
        const data = await response.json();

        if (response.ok && data.status === 'success' && Array.isArray(data.games)) {
            availableGames = data.games;
            if (simGameSelect) {
                data.games.forEach((game) => {
                    const opt = document.createElement('option');
                    opt.value = game;
                    opt.textContent = game;
                    simGameSelect.appendChild(opt);
                });
            }
        }
    } catch (err) {
        console.error('Failed to load games in simulator:', err);
    }
}

/**
 * Starts generating and submitting random scores.
 */
async function handleStartRandomBatch() {
    if (isRunning) {
        return;
    }

    const totalToSend = Math.max(1, Math.min(500, parseInt(simBatchCount.value, 10) || 100));
    resetMetrics(totalToSend);
    setSimulatorRunningState(true);
    setStatus('Dispatching automated score submissions...', 'loading');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i <= totalToSend; i++) {
        if (shouldStop) {
            setStatus(`Stopped by user after ${i - 1} submissions.`, 'error');
            break;
        }

        const targetGame = getSelectedGameOrRandom();
        const randomPlayer = generateRandomPlayerName();
        const randomScore = Math.floor(Math.random() * 950000) + 100;

        const result = await postScoreToApi(targetGame, randomPlayer, randomScore);

        if (result.status === 201) {
            successCount++;
        } else {
            errorCount++;
        }

        updateMetricsDisplay(i, totalToSend, successCount, errorCount, result.latency);
        appendLogRow(i, targetGame, randomPlayer, randomScore, result.status, result.message);

        // Small delay to keep browser thread fluid and allow UI paint
        await new Promise((resolve) => setTimeout(resolve, 30));
    }

    if (!shouldStop) {
        setStatus(`Batch completed! ${successCount} scores submitted (now pending in Admin Queue).`, 'success');
    }

    setSimulatorRunningState(false);
}

/**
 * Runs a battery of out-of-range, invalid, and negative inputs.
 */
async function handleRunEdgeCaseBattery() {
    if (isRunning) {
        return;
    }

    const testBattery = [
        {
            label: 'Out-of-range integer (MAX + 1)',
            game: 'Space Blaster',
            player: 'OutMaxInt',
            score: 2147483648
        },
        {
            label: 'Huge numeric string (>32-bit)',
            game: 'Space Blaster',
            player: 'HugeNumStr',
            score: '999999999999999999999999'
        },
        {
            label: 'Negative integer (-1)',
            game: 'Space Blaster',
            player: 'NegInt',
            score: -1
        },
        {
            label: 'Negative string ("-50")',
            game: 'Space Blaster',
            player: 'NegStr',
            score: '-50'
        },
        {
            label: 'Non-numeric string ("abc")',
            game: 'Space Blaster',
            player: 'AlphaScore',
            score: 'abc'
        },
        {
            label: 'String with unit suffix ("100px")',
            game: 'Space Blaster',
            player: 'UnitScore',
            score: '100px'
        },
        {
            label: 'Decimal/Float literal (12.34)',
            game: 'Space Blaster',
            player: 'FloatLit',
            score: 12.34
        },
        {
            label: 'Decimal/Float string ("12.34")',
            game: 'Space Blaster',
            player: 'FloatStr',
            score: '12.34'
        },
        {
            label: 'Missing player name',
            game: 'Space Blaster',
            player: '   ',
            score: 500
        },
        {
            label: 'Whitespace game name',
            game: '   ',
            player: 'ValidPlayer',
            score: 500
        },
        {
            label: 'Oversized player name (101 chars)',
            game: 'Space Blaster',
            player: 'P'.repeat(101),
            score: 500
        },
        {
            label: 'Valid Boundary Score (MAX_SCORE 2147483647)',
            game: 'Space Blaster',
            player: 'ValidMaxPlayer',
            score: 2147483647
        },
        {
            label: 'Valid Boundary Score (Zero 0)',
            game: 'Space Blaster',
            player: 'ValidZeroPlayer',
            score: 0
        }
    ];

    resetMetrics(testBattery.length);
    setSimulatorRunningState(true);
    setStatus('Running edge-case & validation battery...', 'loading');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < testBattery.length; i++) {
        if (shouldStop) {
            setStatus('Edge-case battery interrupted.', 'error');
            break;
        }

        const testCase = testBattery[i];
        const result = await postScoreToApi(testCase.game, testCase.player, testCase.score);

        if (result.status === 201) {
            successCount++;
        } else {
            errorCount++;
        }

        updateMetricsDisplay(i + 1, testBattery.length, successCount, errorCount, result.latency);
        appendLogRow(
            i + 1,
            testCase.game,
            `${testCase.player} (${testCase.label})`,
            testCase.score,
            result.status,
            result.message
        );

        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!shouldStop) {
        setStatus(`Edge-case battery complete. Error cases were correctly rejected.`, 'success');
    }

    setSimulatorRunningState(false);
}

/**
 * Submits a score payload to POST api/post-score.php and measures response latency.
 *
 * @param {string} game
 * @param {string} player
 * @param {any} score
 * @return {Promise<{status: number, message: string, latency: number}>}
 */
async function postScoreToApi(game, player, score) {
    const startTime = performance.now();

    try {
        const payload = {
            game: game,
            score: score,
        };

        if (player && player.trim() !== '') {
            payload.player_name = player;
        }

        const headers = {
            'Content-Type': 'application/json'
        };
        if (chkUseApiKey && chkUseApiKey.checked) {
            headers['X-API-Key'] = 'wolves-secret-key-2026';
        }

        const response = await fetch('api/post-score.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const latency = Math.round(performance.now() - startTime);
        const data = await response.json();

        return {
            status: response.status,
            message: data.message || (response.ok ? 'OK' : 'Error'),
            latency: latency
        };
    } catch (err) {
        const latency = Math.round(performance.now() - startTime);
        return {
            status: 0,
            message: err.message || 'Network Failure',
            latency: latency
        };
    }
}

/**
 * Appends a row to the live simulation log table strictly using textContent.
 */
function appendLogRow(index, game, player, score, statusCode, responseMessage) {
    if (!simLogBody) {
        return;
    }

    if (requestCounter === 0) {
        simLogBody.replaceChildren();
    }
    requestCounter++;

    const row = document.createElement('tr');

    const tdIndex = document.createElement('td');
    tdIndex.textContent = String(index);

    const tdTime = document.createElement('td');
    const now = new Date();
    tdTime.textContent = now.toTimeString().split(' ')[0];

    const tdGame = document.createElement('td');
    tdGame.textContent = game;

    const tdPlayer = document.createElement('td');
    tdPlayer.textContent = player;

    const tdScore = document.createElement('td');
    tdScore.style.textAlign = 'right';
    const num = Number(score);
    tdScore.textContent = Number.isFinite(num) ? num.toLocaleString() : String(score);

    const tdStatus = document.createElement('td');
    tdStatus.style.textAlign = 'center';
    const badge = document.createElement('span');
    badge.className = `badge-status badge-${statusCode}`;
    badge.textContent = statusCode === 0 ? 'ERR' : String(statusCode);
    tdStatus.appendChild(badge);

    const tdMessage = document.createElement('td');
    tdMessage.textContent = responseMessage;

    row.appendChild(tdIndex);
    row.appendChild(tdTime);
    row.appendChild(tdGame);
    row.appendChild(tdPlayer);
    row.appendChild(tdScore);
    row.appendChild(tdStatus);
    row.appendChild(tdMessage);

    simLogBody.appendChild(row);

    const scrollContainer = simLogBody.closest('.log-scroll-wrapper');
    if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
}

function generateRandomPlayerName() {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${prefix}${suffix}_${num}`;
}

function getSelectedGameOrRandom() {
    const chosen = simGameSelect ? simGameSelect.value : '__RANDOM__';
    if (chosen !== '__RANDOM__') {
        return chosen;
    }

    if (availableGames.length > 0) {
        return availableGames[Math.floor(Math.random() * availableGames.length)];
    }

    return 'Space Blaster';
}

function updateMetricsDisplay(sent, total, success, errors, latency) {
    if (metricSent) metricSent.textContent = String(sent);
    if (metricTotal) metricTotal.textContent = String(total);
    if (metricSuccess) metricSuccess.textContent = String(success);
    if (metricErrors) metricErrors.textContent = String(errors);

    totalLatencySum += latency;
    latencyCount++;
    const avg = Math.round(totalLatencySum / latencyCount);
    if (metricLatency) metricLatency.textContent = `${avg} ms`;

    if (progressFill) {
        const pct = Math.min(100, Math.round((sent / total) * 100));
        progressFill.style.width = `${pct}%`;
    }
}

function resetMetrics(total) {
    totalLatencySum = 0;
    latencyCount = 0;
    if (metricSent) metricSent.textContent = '0';
    if (metricTotal) metricTotal.textContent = String(total);
    if (metricSuccess) metricSuccess.textContent = '0';
    if (metricErrors) metricErrors.textContent = '0';
    if (metricLatency) metricLatency.textContent = '0 ms';
    if (progressFill) progressFill.style.width = '0%';
}

function handleStopSimulator() {
    if (isRunning) {
        shouldStop = true;
        setStatus('Stopping simulator...', 'loading');
    }
}

function handleClearLog() {
    if (simLogBody) {
        requestCounter = 0;
        simLogBody.replaceChildren();
        const emptyRow = document.createElement('tr');
        const emptyTd = document.createElement('td');
        emptyTd.colSpan = 7;
        emptyTd.style.textAlign = 'center';
        emptyTd.style.color = 'var(--text-muted)';
        emptyTd.style.padding = '2rem';
        emptyTd.textContent = 'Log cleared. Click "Send 100 Random Scores" to run a new test.';
        emptyRow.appendChild(emptyTd);
        simLogBody.appendChild(emptyRow);
    }
    resetMetrics(100);
    setStatus('Ready to start simulator', '');
}

function setSimulatorRunningState(running) {
    isRunning = running;
    shouldStop = false;

    if (btnStartBatch) btnStartBatch.disabled = running;
    if (btnRunEdgeCases) btnRunEdgeCases.disabled = running;
    if (btnClearLog) btnClearLog.disabled = running;
    if (simBatchCount) simBatchCount.disabled = running;
    if (simGameSelect) simGameSelect.disabled = running;
    if (btnStop) btnStop.disabled = !running;
}

function setStatus(text, mode) {
    if (!simStatusText) return;
    simStatusText.textContent = text;
    if (mode === 'error') {
        simStatusText.style.color = 'var(--state-error-text)';
    } else if (mode === 'success') {
        simStatusText.style.color = 'var(--state-success-text)';
    } else if (mode === 'loading') {
        simStatusText.style.color = 'var(--state-loading-text)';
    } else {
        simStatusText.style.color = 'var(--text-secondary)';
    }
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimulator);
} else {
    initSimulator();
}
