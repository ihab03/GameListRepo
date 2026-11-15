/**
 * Game Leaderboard Platform - Traffic & Stress Simulator Controller
 * 
 * Automates high-volume score generation, concurrency testing, and security edge-case runs.
 * Strictly adheres to DOM textContent manipulation for XSS immunity. Zero emojis.
 */

'use strict';

const SVG_ICONS = {
    sun: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    moon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
};

// DOM References
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

const NAME_PREFIXES = [
    'Cyber', 'Shadow', 'Apex', 'Turbo', 'Retro', 'Nova', 'Pixel', 
    'Hyper', 'Vortex', 'Blaze', 'Quantum', 'Cosmic', 'Solar', 'Echo'
];

const NAME_SUFFIXES = [
    'Knight', 'Rider', 'Fox', 'Pilot', 'Hunter', 'Gamer', 'Master', 
    'Runner', 'Wolf', 'Hero', 'Striker', 'Drifter', 'Phantom', 'Ace'
];

/**
 * Initializes DOM elements and loads state.
 */
function initSimulator() {
    bindSimulatorElements();
    initTheme();

    if (chkUseApiKey) {
        chkUseApiKey.addEventListener('change', updateSimulatorAuthStatus);
    }

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

    checkSimulatorSession();
    fetchAvailableGames();
}

function bindSimulatorElements() {
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

    themeToggle = document.getElementById('themeToggle');
    themeToggleIcon = document.getElementById('themeToggleIcon');
    themeToggleText = document.getElementById('themeToggleText');
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
        currentSessionUser = null;
        updateSimulatorAuthStatus();
    }
}

/**
 * Updates simulator session indicator without emojis.
 */
function updateSimulatorAuthStatus() {
    const isApiKeyEnabled = chkUseApiKey && chkUseApiKey.checked;

    if (currentSessionUser) {
        if (simUserSession) {
            simUserSession.textContent = `${currentSessionUser.username} [${currentSessionUser.role.toUpperCase()}]`;
            simUserSession.style.color = currentSessionUser.role === 'admin' ? '#f59e0b' : '#38bdf8';
        }
        if (simAuthNotice) simAuthNotice.classList.add('hidden');
    } else if (isApiKeyEnabled) {
        if (simUserSession) {
            simUserSession.textContent = 'Secret API Key [Direct Server Authorization]';
            simUserSession.style.color = '#34d399';
        }
        if (simAuthNotice) simAuthNotice.classList.add('hidden');
    } else {
        if (simUserSession) {
            simUserSession.textContent = 'Unauthenticated [Requests will return 401]';
            simUserSession.style.color = '#f87171';
        }
        if (simAuthNotice) simAuthNotice.classList.remove('hidden');
    }
}

/**
 * Initializes theme based on localStorage.
 */
function initTheme() {
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
    if (themeToggleIcon) {
        themeToggleIcon.innerHTML = isDark ? SVG_ICONS.moon : SVG_ICONS.sun;
    }
    if (themeToggleText) {
        themeToggleText.textContent = isDark ? 'Dark' : 'Light';
    }
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
                while (simGameSelect.options.length > 1) {
                    simGameSelect.remove(1);
                }
                availableGames.forEach((game) => {
                    const opt = document.createElement('option');
                    opt.value = game;
                    opt.textContent = game;
                    simGameSelect.appendChild(opt);
                });
            }
        }
    } catch (err) {}
}

/**
 * Generates a random alphanumeric player handle.
 */
function generateRandomPlayerName() {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    return `${prefix}${suffix}${num}`;
}

/**
 * Generates a realistic score with nice distribution.
 */
function generateRandomScore() {
    const tier = Math.random();
    if (tier < 0.15) {
        return Math.floor(Math.random() * 2000) + 500;
    }
    if (tier < 0.65) {
        return Math.floor(Math.random() * 15000) + 2000;
    }
    if (tier < 0.90) {
        return Math.floor(Math.random() * 75000) + 15000;
    }
    return Math.floor(Math.random() * 450000) + 75000;
}

/**
 * Launches an automated batch of randomized score submissions.
 */
async function handleStartRandomBatch() {
    if (isRunning) return;

    const countInput = simBatchCount ? parseInt(simBatchCount.value, 10) : 100;
    const totalRequests = isNaN(countInput) || countInput <= 0 ? 100 : Math.min(500, countInput);

    const selectedTarget = simGameSelect ? simGameSelect.value : '__RANDOM__';
    const gamePool = availableGames.length > 0 ? availableGames : ['Tetris Effect', 'Pac-Man', 'Subway Surfers', 'Vampire Survivors', 'Trackmania'];

    setSimulatorRunningState(true);
    resetMetrics(totalRequests);
    setStatus(`Dispatching ${totalRequests} score submissions...`, 'running');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i <= totalRequests; i++) {
        if (shouldStop) {
            setStatus(`Batch stopped by operator at #${i - 1} submissions.`, 'warning');
            break;
        }

        const game = selectedTarget === '__RANDOM__'
            ? gamePool[Math.floor(Math.random() * gamePool.length)]
            : selectedTarget;

        const player = generateRandomPlayerName();
        const score = generateRandomScore();

        const result = await postScoreToApi(game, player, score);

        if (result.status === 201) {
            successCount++;
        } else {
            errorCount++;
        }

        updateMetrics(i, totalRequests, successCount, errorCount, result.latency);
        appendLogRow(i, game, player, score, result.status, result.message, result.latency);

        // Small interval to simulate network traffic
        await new Promise((resolve) => setTimeout(resolve, 40));
    }

    if (!shouldStop) {
        setStatus(`Batch completed. ${successCount} saved, ${errorCount} errors.`, 'success');
    }

    setSimulatorRunningState(false);
}

/**
 * Dispatches an automated battery of invalid and edge-case inputs.
 */
async function handleRunEdgeCaseBattery() {
    if (isRunning) return;

    setSimulatorRunningState(true);

    const edgeCases = [
        { label: 'Negative score (-1)', game: 'Tetris Effect', player: 'NegativeTester', score: -1, expectStatus: 400 },
        { label: 'String negative ("-50")', game: 'Tetris Effect', player: 'StringNegTester', score: '-50', expectStatus: 400 },
        { label: 'Alpha score ("abc")', game: 'Tetris Effect', player: 'AlphaTester', score: 'abc', expectStatus: 400 },
        { label: 'Float score (12.34)', game: 'Tetris Effect', player: 'FloatTester', score: 12.34, expectStatus: 400 },
        { label: 'Null score', game: 'Tetris Effect', player: 'NullTester', score: null, expectStatus: 400 },
        { label: 'Boolean score (true)', game: 'Tetris Effect', player: 'BoolTester', score: true, expectStatus: 400 },
        { label: 'Array score ([100])', game: 'Tetris Effect', player: 'ArrayTester', score: [100], expectStatus: 400 },
        { label: '32-bit INT overflow (2147483648)', game: 'Tetris Effect', player: 'OverflowTester', score: 2147483648, expectStatus: 400 },
        { label: 'Gigantic string overflow ("999999999999999")', game: 'Tetris Effect', player: 'GiganticTester', score: '999999999999999', expectStatus: 400 },
        { label: 'Whitespace player ("   ")', game: 'Tetris Effect', player: '   ', score: 5000, expectStatus: 400 },
        { label: 'Whitespace game ("   ")', game: '   ', player: 'ValidPlayer', score: 5000, expectStatus: 400 },
        { label: 'Valid Zero score (0)', game: 'Tetris Effect', player: 'ZeroTester', score: 0, expectStatus: 201 },
        { label: 'Max 32-bit bound (2147483647)', game: 'Tetris Effect', player: 'MaxBoundTester', score: 2147483647, expectStatus: 201 },
    ];

    const totalRequests = edgeCases.length;
    resetMetrics(totalRequests);
    setStatus(`Executing ${totalRequests} validation edge-cases...`, 'running');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < edgeCases.length; i++) {
        if (shouldStop) break;

        const tc = edgeCases[i];
        const result = await postScoreToApi(tc.game, tc.player, tc.score);

        if (result.status === 201) {
            successCount++;
        } else {
            errorCount++;
        }

        updateMetrics(i + 1, totalRequests, successCount, errorCount, result.latency);
        appendLogRow(
            i + 1,
            tc.game,
            tc.player,
            typeof tc.score === 'object' ? JSON.stringify(tc.score) : String(tc.score),
            result.status,
            `[${tc.label}] ${result.message}`,
            result.latency
        );

        await new Promise((resolve) => setTimeout(resolve, 60));
    }

    if (!shouldStop) {
        setStatus(`Edge-case battery complete. Error cases were correctly validated.`, 'success');
    }

    setSimulatorRunningState(false);
}

/**
 * Submits a score payload to POST api/post-score.php and measures latency.
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
            headers['X-API-Key'] = 'hyper-arena-secret-key-2026';
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
function appendLogRow(index, game, player, score, statusCode, responseMessage, latency) {
    if (!simLogBody) return;

    if (requestCounter === 0) {
        simLogBody.replaceChildren();
    }
    requestCounter++;

    const row = document.createElement('tr');

    const tdIndex = document.createElement('td');
    tdIndex.className = 'num';
    tdIndex.textContent = String(index);

    const tdTime = document.createElement('td');
    tdTime.className = 'td-date';
    const now = new Date();
    tdTime.textContent = now.toTimeString().split(' ')[0];

    const tdGame = document.createElement('td');
    tdGame.textContent = game;

    const tdPlayer = document.createElement('td');
    tdPlayer.className = 'td-player';
    tdPlayer.textContent = player;

    const tdScore = document.createElement('td');
    tdScore.className = 'td-score';
    tdScore.textContent = typeof score === 'number' ? score.toLocaleString() : String(score);

    const tdStatus = document.createElement('td');
    tdStatus.style.textAlign = 'center';
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${statusCode === 201 ? 'badge-approved' : (statusCode === 429 ? 'badge-pending' : 'badge-rejected')}`;
    statusBadge.textContent = String(statusCode);
    tdStatus.appendChild(statusBadge);

    const tdMessage = document.createElement('td');
    tdMessage.style.maxWidth = '260px';
    tdMessage.style.overflow = 'hidden';
    tdMessage.style.textOverflow = 'ellipsis';
    tdMessage.style.whiteSpace = 'nowrap';
    tdMessage.textContent = responseMessage;

    const tdLatency = document.createElement('td');
    tdLatency.className = 'num';
    tdLatency.style.textAlign = 'right';
    tdLatency.style.color = latency > 120 ? '#f87171' : 'var(--text-secondary)';
    tdLatency.textContent = `${latency} ms`;

    row.appendChild(tdIndex);
    row.appendChild(tdTime);
    row.appendChild(tdGame);
    row.appendChild(tdPlayer);
    row.appendChild(tdScore);
    row.appendChild(tdStatus);
    row.appendChild(tdMessage);
    row.appendChild(tdLatency);

    simLogBody.insertBefore(row, simLogBody.firstChild);

    // Cap log at 150 rows
    while (simLogBody.children.length > 150) {
        simLogBody.removeChild(simLogBody.lastChild);
    }
}

function updateMetrics(sent, total, success, errors, latency) {
    if (metricSent) metricSent.textContent = String(sent);
    if (metricTotal) metricTotal.textContent = String(total);
    if (metricSuccess) metricSuccess.textContent = String(success);
    if (metricErrors) metricErrors.textContent = String(errors);

    totalLatencySum += latency;
    latencyCount++;
    const avg = Math.round(totalLatencySum / latencyCount);
    if (metricLatency) metricLatency.textContent = `${avg} ms`;

    if (progressFill) {
        const percent = Math.min(100, Math.round((sent / total) * 100));
        progressFill.style.width = `${percent}%`;
    }
}

function resetMetrics(total) {
    totalLatencySum = 0;
    latencyCount = 0;
    requestCounter = 0;
    if (metricSent) metricSent.textContent = '0';
    if (metricTotal) metricTotal.textContent = String(total);
    if (metricSuccess) metricSuccess.textContent = '0';
    if (metricErrors) metricErrors.textContent = '0';
    if (metricLatency) metricLatency.textContent = '0 ms';
    if (progressFill) progressFill.style.width = '0%';
}

function setSimulatorRunningState(running) {
    isRunning = running;
    shouldStop = false;

    if (btnStartBatch) btnStartBatch.disabled = running;
    if (btnRunEdgeCases) btnRunEdgeCases.disabled = running;
    if (btnStop) btnStop.disabled = !running;
    if (simGameSelect) simGameSelect.disabled = running;
    if (simBatchCount) simBatchCount.disabled = running;
}

function handleStopSimulator() {
    if (isRunning) {
        shouldStop = true;
        setStatus('Stopping simulator...', 'warning');
        if (btnStop) btnStop.disabled = true;
    }
}

function handleClearLog() {
    if (simLogBody) {
        simLogBody.replaceChildren();
        const emptyRow = document.createElement('tr');
        const emptyTd = document.createElement('td');
        emptyTd.colSpan = 8;
        emptyTd.className = 'empty-state';
        emptyTd.textContent = 'Log cleared. Launch a batch to observe requests.';
        emptyRow.appendChild(emptyTd);
        simLogBody.appendChild(emptyRow);
    }
    requestCounter = 0;
}

function setStatus(text, type = 'normal') {
    if (!simStatusText) return;
    simStatusText.textContent = text;
    simStatusText.style.color = type === 'success' ? '#86efac' : (type === 'warning' ? '#fde047' : (type === 'running' ? '#38bdf8' : 'var(--text-muted)'));
}

document.addEventListener('DOMContentLoaded', initSimulator);
