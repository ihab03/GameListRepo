/**
 * Hyper Arena - Leaderboard View & Standings Engine
 * 
 * Manages leaderboard data retrieval, real-time multi-dimensional filtration,
 * search debouncing, safe table rendering, player rank lookup, and CSV/JSON export.
 */

'use strict';

import { state, saveFilterPreferences } from '../core/state.js';
import { apiGet } from '../core/api-client.js';
import { formatDate, showStatus, clearStatus } from '../core/dom-utils.js';

let searchDebounceTimer = null;

/**
 * Fetches the active games list from GET api/get-games.php and populates dropdowns.
 * @returns {Promise<string[]>}
 */
export async function fetchGames() {
    const res = await apiGet('api/get-games.php');
    if (res.ok && res.data?.status === 'success' && Array.isArray(res.data.games)) {
        populateGameSelectors(res.data.games);
        return res.data.games;
    }
    return [];
}

/**
 * Populates all game selector dropdowns and datalists in the DOM.
 * @param {string[]} games
 */
export function populateGameSelectors(games) {
    // Prevent stale localStorage game selection bug
    if (state.game && state.game !== 'all' && !games.includes(state.game)) {
        state.game = 'all';
        saveFilterPreferences();
    }

    try {
        const storedSelected = localStorage.getItem('selectedGame');
        if (storedSelected && storedSelected !== 'all' && !games.includes(storedSelected)) {
            localStorage.setItem('selectedGame', 'all');
        }
        const prefGame = localStorage.getItem('pref_game');
        if (prefGame && prefGame !== 'all' && !games.includes(prefGame)) {
            localStorage.setItem('pref_game', 'all');
        }
    } catch (e) {}

    const gameSelector = document.getElementById('gameSelector');
    if (gameSelector) {
        gameSelector.replaceChildren();

        const optAll = document.createElement('option');
        optAll.value = 'all';
        optAll.textContent = 'All Games';
        gameSelector.appendChild(optAll);

        games.forEach((g) => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            gameSelector.appendChild(opt);
        });

        gameSelector.value = (state.game && games.includes(state.game)) ? state.game : 'all';
    }

    const gamesDatalist = document.getElementById('gamesDatalist');
    if (gamesDatalist) {
        gamesDatalist.replaceChildren();
        games.forEach((g) => {
            const opt = document.createElement('option');
            opt.value = g;
            gamesDatalist.appendChild(opt);
        });
    }

    const formGameInput = document.getElementById('formGameInput');
    if (formGameInput) {
        if (!formGameInput.value || !games.includes(formGameInput.value)) {
            formGameInput.value = games.length > 0 ? games[0] : 'Tetris Effect';
        }
    }
}

/**
 * Loads leaderboard standings from GET api/get-scores.php using active state filters.
 * @param {Function} [onPlayerClick]
 */
export async function loadLeaderboard(onPlayerClick) {
    updateFilterSummaryBadge();
    const statusEl = document.getElementById('leaderboardStatus');
    const emptyStateEl = document.getElementById('emptyState');
    const emptyStateText = document.getElementById('emptyStateText');

    showStatus(statusEl, 'Loading leaderboard rankings...', 'loading');
    if (emptyStateEl) emptyStateEl.classList.add('hidden');

    const params = new URLSearchParams({
        game: state.game,
        limit: state.limit,
        period: state.period,
        sort: state.sort,
    });
    if (state.search) {
        params.set('search', state.search);
    }

    const res = await apiGet(`api/get-scores.php?${params.toString()}`);
    if (!res.ok || res.data?.status !== 'success') {
        showStatus(statusEl, res.error || 'Failed to load leaderboard.', 'error');
        renderLeaderboardTable([], false, onPlayerClick);
        return;
    }

    clearStatus(statusEl);
    const scores = Array.isArray(res.data.scores) ? res.data.scores : [];
    const isCrossGame = state.game === 'all';
    renderLeaderboardTable(scores, isCrossGame, onPlayerClick);

    if (scores.length === 0 && emptyStateEl) {
        emptyStateEl.classList.remove('hidden');
        if (emptyStateText) {
            emptyStateText.textContent = state.search
                ? `No approved scores match "${state.search}".`
                : 'No approved scores recorded for this timeframe.';
        }
    }
}

/**
 * Updates the filter summary badge pill in the filtration section.
 */
export function updateFilterSummaryBadge() {
    const badge = document.getElementById('activeFilterBadge');
    if (!badge) return;

    const gameLabel = state.game === 'all' ? 'All Games' : state.game;
    const limitLabel = state.limit === 'all' ? 'All Records' : `Top ${state.limit}`;
    const periodLabel = state.period === 'today' ? 'Today' : (state.period === 'week' ? 'This Week' : 'All-Time');
    const searchLabel = state.search ? `"${state.search}"` : '';

    const parts = [gameLabel, limitLabel, periodLabel];
    if (searchLabel) parts.push(searchLabel);
    badge.textContent = parts.join(' \u2022 ');
}

/**
 * Safely renders leaderboard rows into #leaderboardBody using strict DOM manipulation.
 * @param {Array} scores
 * @param {boolean} isCrossGame
 * @param {Function} [onPlayerClick]
 */
export function renderLeaderboardTable(scores, isCrossGame, onPlayerClick) {
    const tbody = document.getElementById('leaderboardBody');
    const thGameCol = document.getElementById('thGameCol');
    if (!tbody) return;
    tbody.replaceChildren();

    if (thGameCol) {
        thGameCol.classList.toggle('hidden', !isCrossGame);
    }

    scores.forEach((entry, index) => {
        const rank = index + 1;
        const row = document.createElement('tr');

        // Rank Cell
        const tdRank = document.createElement('td');
        tdRank.className = 'td-rank';
        const rankBadge = document.createElement('span');
        rankBadge.className = `rank-badge ${rank <= 3 ? `rank-${rank}` : ''}`;
        rankBadge.textContent = String(rank);
        tdRank.appendChild(rankBadge);

        // Optional Cross-Game Title Cell
        let tdGame = null;
        if (isCrossGame) {
            tdGame = document.createElement('td');
            tdGame.textContent = entry.game || state.game;
        }

        // Clickable Player Name Cell
        const tdPlayer = document.createElement('td');
        tdPlayer.className = 'td-player';
        const playerBtn = document.createElement('button');
        playerBtn.type = 'button';
        playerBtn.className = 'btn-player-link';
        playerBtn.textContent = entry.player_name;
        playerBtn.title = `Inspect ${entry.player_name}'s standings and telemetry`;
        playerBtn.addEventListener('click', () => {
            if (typeof onPlayerClick === 'function') {
                onPlayerClick(entry.player_name);
            }
        });
        tdPlayer.appendChild(playerBtn);

        // Score Cell
        const tdScore = document.createElement('td');
        tdScore.className = 'td-score';
        tdScore.textContent = Number(entry.score).toLocaleString();

        // Date Cell
        const tdDate = document.createElement('td');
        tdDate.className = 'td-date';
        tdDate.textContent = formatDate(entry.created_at);

        row.appendChild(tdRank);
        if (tdGame) row.appendChild(tdGame);
        row.appendChild(tdPlayer);
        row.appendChild(tdScore);
        row.appendChild(tdDate);

        tbody.appendChild(row);
    });
}

/**
 * Exports currently filtered leaderboard data as CSV or JSON file.
 * @param {'csv'|'json'} format
 */
export async function exportLeaderboard(format) {
    const params = new URLSearchParams({
        game: state.game,
        limit: 'all',
        period: state.period,
        sort: state.sort,
    });
    if (state.search) params.set('search', state.search);

    const res = await apiGet(`api/get-scores.php?${params.toString()}`);
    if (!res.ok || res.data?.status !== 'success' || !Array.isArray(res.data.scores)) {
        alert('Failed to fetch data for export.');
        return;
    }

    const scores = res.data.scores;
    const filename = `leaderboard-${state.game}-${new Date().toISOString().slice(0, 10)}.${format}`;

    if (format === 'csv') {
        const headers = ['ID', 'Game', 'Player', 'Score', 'Timestamp'];
        const rows = scores.map((s) => [
            s.id,
            escapeCsv(s.game),
            escapeCsv(s.player_name),
            s.score,
            escapeCsv(s.created_at),
        ]);
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
        downloadBlob(csvContent, 'text/csv;charset=utf-8;', filename);
    } else {
        const jsonContent = JSON.stringify(scores, null, 2);
        downloadBlob(jsonContent, 'application/json;charset=utf-8;', filename);
    }
}

/**
 * Handles Player Rank Lookup form submission.
 * @param {Event} event
 * @param {Function} [onPlayerClick]
 */
export async function handleRankLookup(event, onPlayerClick) {
    event.preventDefault();
    const rankInput = document.getElementById('rankPlayerInput');
    const rankResult = document.getElementById('rankResult');
    const formGameInput = document.getElementById('formGameInput');

    if (!rankInput || !rankResult) return;
    const player = rankInput.value.trim();

    if (!player) {
        rankResult.className = 'rank-result-box';
        rankResult.textContent = 'Please enter a player handle.';
        rankResult.classList.remove('hidden');
        return;
    }

    rankResult.className = 'rank-result-box';
    rankResult.textContent = 'Searching rankings...';
    rankResult.classList.remove('hidden');

    const game = state.game === 'all'
        ? (formGameInput && formGameInput.value ? formGameInput.value : 'Tetris Effect')
        : state.game;

    const params = new URLSearchParams({
        game: game,
        player_name: player,
        period: state.period,
    });

    const res = await apiGet(`api/get-rank.php?${params.toString()}`);
    if (!res.ok || res.data?.status !== 'success') {
        rankResult.textContent = res.error || 'Failed to find player rank.';
        return;
    }

    rankResult.replaceChildren();
    const data = res.data;

    if (data.found) {
        const container = document.createElement('div');
        container.className = 'rank-result-found';

        const header = document.createElement('div');
        header.className = 'rank-result-badge';
        header.textContent = `Rank #${data.rank} in ${data.game}`;

        const statsGrid = document.createElement('div');
        statsGrid.className = 'rank-stats-grid';

        const statBest = document.createElement('div');
        statBest.className = 'rank-stat';
        const statBestLbl = document.createElement('div');
        statBestLbl.className = 'rank-stat-label';
        statBestLbl.textContent = 'Personal Best';
        const statBestVal = document.createElement('div');
        statBestVal.className = 'rank-stat-val num';
        statBestVal.textContent = Number(data.best_score).toLocaleString();
        statBest.appendChild(statBestLbl);
        statBest.appendChild(statBestVal);

        const statAttempts = document.createElement('div');
        statAttempts.className = 'rank-stat';
        const statAttemptsLbl = document.createElement('div');
        statAttemptsLbl.className = 'rank-stat-label';
        statAttemptsLbl.textContent = 'Total Matches';
        const statAttemptsVal = document.createElement('div');
        statAttemptsVal.className = 'rank-stat-val num';
        statAttemptsVal.textContent = String(data.attempts || 1);
        statAttempts.appendChild(statAttemptsLbl);
        statAttempts.appendChild(statAttemptsVal);

        statsGrid.appendChild(statBest);
        statsGrid.appendChild(statAttempts);

        container.appendChild(header);
        container.appendChild(statsGrid);

        const profileLink = document.createElement('button');
        profileLink.type = 'button';
        profileLink.className = 'btn btn-sm btn-secondary';
        profileLink.style.marginTop = '0.65rem';
        profileLink.textContent = `View Full Profile for ${player}`;
        profileLink.addEventListener('click', () => {
            if (typeof onPlayerClick === 'function') {
                onPlayerClick(player);
            }
        });
        container.appendChild(profileLink);

        rankResult.appendChild(container);
    } else {
        const emptyText = document.createElement('span');
        emptyText.style.color = 'var(--text-muted)';
        emptyText.textContent = `No approved scores recorded for "${player}" in ${data.game}.`;
        rankResult.appendChild(emptyText);
    }
}

/**
 * Initializes all event listeners for the leaderboard filtration and rank lookup controls.
 * @param {object} callbacks Map of { onFilterChange(), onPlayerClick(playerName) }
 */
export function initLeaderboardView(callbacks = {}) {
    const gameSelector = document.getElementById('gameSelector');
    const limitSelector = document.getElementById('limitSelector');
    const sortSelector = document.getElementById('sortSelector');
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');
    const periodButtons = document.querySelectorAll('.period-btn');
    const btnExportCsv = document.getElementById('btnExportCsv');
    const btnExportJson = document.getElementById('btnExportJson');
    const rankForm = document.getElementById('rankForm');

    // Game Selector
    if (gameSelector) {
        gameSelector.addEventListener('change', () => {
            state.game = gameSelector.value;
            saveFilterPreferences();
            loadLeaderboard(callbacks.onPlayerClick);
            if (typeof callbacks.onFilterChange === 'function') callbacks.onFilterChange();
        });
    }

    // Limit Selector
    if (limitSelector) {
        limitSelector.addEventListener('change', () => {
            state.limit = limitSelector.value;
            saveFilterPreferences();
            loadLeaderboard(callbacks.onPlayerClick);
        });
    }

    // Sort Selector
    if (sortSelector) {
        sortSelector.addEventListener('change', () => {
            state.sort = sortSelector.value;
            saveFilterPreferences();
            loadLeaderboard(callbacks.onPlayerClick);
        });
    }

    // Search Input with Debounce
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (btnClearSearch) {
                btnClearSearch.classList.toggle('hidden', searchInput.value.length === 0);
            }
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                state.search = searchInput.value.trim();
                loadLeaderboard(callbacks.onPlayerClick);
            }, 300);
        });
    }

    // Clear Search Button
    if (btnClearSearch && searchInput) {
        btnClearSearch.addEventListener('click', () => {
            searchInput.value = '';
            btnClearSearch.classList.add('hidden');
            state.search = '';
            loadLeaderboard(callbacks.onPlayerClick);
            searchInput.focus();
        });
    }

    // Period Filter Buttons
    periodButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            periodButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.period = btn.dataset.period || 'all';
            saveFilterPreferences();
            loadLeaderboard(callbacks.onPlayerClick);
            if (typeof callbacks.onFilterChange === 'function') callbacks.onFilterChange();
        });
    });

    // CSV & JSON Export
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => exportLeaderboard('csv'));
    }
    if (btnExportJson) {
        btnExportJson.addEventListener('click', () => exportLeaderboard('json'));
    }

    // Rank Lookup Form
    if (rankForm) {
        rankForm.addEventListener('submit', (e) => handleRankLookup(e, callbacks.onPlayerClick));
    }
}

/**
 * Escapes CSV special characters.
 */
function escapeCsv(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Triggers browser download of a client-side Blob.
 */
function downloadBlob(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

