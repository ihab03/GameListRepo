/**
 * Hyper Arena - Player Profile Modal Controller
 * 
 * Manages player telemetry inspection modal, historical per-game bests,
 * verified rank standings, and recent match telemetry.
 */

'use strict';

import { apiGet } from '../core/api-client.js';
import { formatDate, showStatus, clearStatus } from '../core/dom-utils.js';

/**
 * Fetches and displays player telemetry in the modal.
 * @param {string} playerName
 */
export async function openPlayerProfile(playerName) {
    const modal = document.getElementById('playerProfileModal');
    const nameEl = document.getElementById('modalPlayerName');
    const firstSeenEl = document.getElementById('modalPlayerFirstSeen');
    const statusEl = document.getElementById('modalProfileStatus');
    const contentEl = document.getElementById('modalProfileContent');
    const submissionsEl = document.getElementById('modalPlayerSubmissions');
    const highestEl = document.getElementById('modalPlayerHighest');
    const lastSeenEl = document.getElementById('modalPlayerLastSeen');
    const gamesBody = document.getElementById('modalPlayerGamesBody');
    const recentBody = document.getElementById('modalPlayerRecentBody');

    if (!modal) return;
    modal.classList.remove('hidden');

    if (nameEl) nameEl.textContent = playerName;
    if (firstSeenEl) firstSeenEl.textContent = 'Loading profile telemetry...';
    if (statusEl) showStatus(statusEl, 'Fetching player records...', 'loading');
    if (contentEl) contentEl.classList.add('hidden');

    const res = await apiGet(`api/get-player-profile.php?player_name=${encodeURIComponent(playerName)}`);

    if (!res.ok || res.data?.status !== 'success') {
        if (statusEl) {
            showStatus(statusEl, res.error || `No records found for '${playerName}'.`, 'error');
        }
        return;
    }

    if (statusEl) clearStatus(statusEl);
    if (contentEl) contentEl.classList.remove('hidden');

    const data = res.data;
    const summary = data.summary || {};

    if (firstSeenEl) {
        firstSeenEl.textContent = summary.first_seen
            ? `First recorded match: ${formatDate(summary.first_seen)}`
            : 'Recorded Player';
    }
    if (submissionsEl) {
        submissionsEl.textContent = Number(summary.total_approved_submissions || 0).toLocaleString();
    }
    if (highestEl) {
        highestEl.textContent = Number(summary.highest_score_overall || 0).toLocaleString();
    }
    if (lastSeenEl) {
        lastSeenEl.textContent = formatDate(summary.last_seen);
    }

    // Per-Game Standings Table
    if (gamesBody) {
        gamesBody.replaceChildren();
        const gamesList = Array.isArray(data.games) ? data.games : [];
        if (gamesList.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyTd = document.createElement('td');
            emptyTd.colSpan = 4;
            emptyTd.className = 'empty-state';
            emptyTd.textContent = 'No verified titles recorded.';
            emptyRow.appendChild(emptyTd);
            gamesBody.appendChild(emptyRow);
        } else {
            gamesList.forEach((g) => {
                const row = document.createElement('tr');

                const tdTitle = document.createElement('td');
                tdTitle.textContent = g.game;

                const tdBest = document.createElement('td');
                tdBest.className = 'num';
                tdBest.style.textAlign = 'right';
                tdBest.textContent = Number(g.best_score).toLocaleString();

                const tdRank = document.createElement('td');
                tdRank.style.textAlign = 'center';
                const badge = document.createElement('span');
                badge.className = `rank-badge ${g.rank <= 3 ? `rank-${g.rank}` : ''}`;
                badge.textContent = `#${g.rank}`;
                tdRank.appendChild(badge);

                const tdCount = document.createElement('td');
                tdCount.className = 'num';
                tdCount.style.textAlign = 'right';
                tdCount.textContent = String(g.submissions_count || 1);

                row.appendChild(tdTitle);
                row.appendChild(tdBest);
                row.appendChild(tdRank);
                row.appendChild(tdCount);

                gamesBody.appendChild(row);
            });
        }
    }

    // Recent Matches Table
    if (recentBody) {
        recentBody.replaceChildren();
        const recentList = Array.isArray(data.recent_scores) ? data.recent_scores : [];
        if (recentList.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyTd = document.createElement('td');
            emptyTd.colSpan = 3;
            emptyTd.className = 'empty-state';
            emptyTd.textContent = 'No recent score records.';
            emptyRow.appendChild(emptyTd);
            recentBody.appendChild(emptyRow);
        } else {
            recentList.forEach((r) => {
                const row = document.createElement('tr');

                const tdGame = document.createElement('td');
                tdGame.textContent = r.game;

                const tdScore = document.createElement('td');
                tdScore.className = 'num';
                tdScore.style.textAlign = 'right';
                tdScore.textContent = Number(r.score).toLocaleString();

                const tdDate = document.createElement('td');
                tdDate.className = 'td-date';
                tdDate.textContent = formatDate(r.created_at);

                row.appendChild(tdGame);
                row.appendChild(tdScore);
                row.appendChild(tdDate);

                recentBody.appendChild(row);
            });
        }
    }
}

/**
 * Closes the player profile modal.
 */
export function closePlayerProfileModal() {
    const modal = document.getElementById('playerProfileModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Initializes modal close button and backdrop click listeners.
 */
export function initPlayerModal() {
    const closeBtn = document.getElementById('btnCloseProfileModal');
    const modal = document.getElementById('playerProfileModal');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePlayerProfileModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePlayerProfileModal();
            }
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            closePlayerProfileModal();
        }
    });
}

