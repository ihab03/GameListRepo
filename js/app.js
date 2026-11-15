/**
 * Hyper Arena - Master Application Controller
 * 
 * Orchestrates modular subsystems: state management, API client, authentication,
 * leaderboard standings, score submissions, telemetry KPIs, and admin workflows.
 */

'use strict';

import { state, restoreFilterPreferences } from './core/state.js';
import { apiGet } from './core/api-client.js';
import { initSidebar, initTheme, applyTheme, toggleTheme, switchWindow } from './core/dom-utils.js';
import { checkAuthSession, updateAuthUI, openAccountScreen, initAuthAccount } from './modules/auth-account.js';
import { fetchStudioConfig, loadAdminQueue, loadGameRegistry, loadAuditTrail, initAdminPanel } from './modules/admin-panel.js';
import { fetchGames, loadLeaderboard, initLeaderboardView } from './modules/leaderboard-view.js';
import { initScoreSubmit } from './modules/score-submit.js';
import { openPlayerProfile, initPlayerModal } from './modules/player-modal.js';
import { initChartView, loadScoreChart, refreshScoreChartTheme } from './modules/chart-view.js';

/**
 * Fetches and updates telemetry KPI cards and moderation badge.
 */
export async function loadDashboardStats() {
    const res = await apiGet('api/get-dashboard-stats.php');
    if (!res.ok || res.data?.status !== 'success' || !res.data.stats) return;

    const stats = res.data.stats;
    const kpiTotal = document.getElementById('kpiTotalScores');
    const kpiPlayers = document.getElementById('kpiActivePlayers');
    const kpiPending = document.getElementById('kpiPendingScores');
    const kpiPendingCard = document.getElementById('kpiPendingCard');
    const kpiMost = document.getElementById('kpiMostPlayed');
    const navPendingBadge = document.getElementById('navPendingBadge');

    const totalCount = Number(stats.total_verified_scores ?? stats.total_scores ?? 0);
    const playersCount = Number(stats.active_players ?? 0);
    const pendingCount = Number(stats.pending_scores_count ?? stats.pending_scores ?? 0);

    if (kpiTotal) kpiTotal.textContent = totalCount.toLocaleString();
    if (kpiPlayers) kpiPlayers.textContent = playersCount.toLocaleString();
    if (kpiMost) kpiMost.textContent = stats.most_played_game || 'None';

    const isAdmin = (state.currentUser || state.user)?.role === 'admin';

    if (kpiPending) kpiPending.textContent = String(pendingCount);
    if (kpiPendingCard) kpiPendingCard.classList.toggle('hidden', !(isAdmin && pendingCount > 0));

    if (navPendingBadge) {
        navPendingBadge.textContent = String(pendingCount);
        navPendingBadge.classList.toggle('hidden', !(isAdmin && pendingCount > 0));
    }
}

/**
 * Handles window tab activation callbacks.
 * @param {string} tabId
 */
function handleTabActivated(tabId) {
    if (tabId === 'studio-api') fetchStudioConfig();
    else if (tabId === 'moderation') loadAdminQueue();
    else if (tabId === 'game-registry') loadGameRegistry();
    else if (tabId === 'audit-trail') loadAuditTrail();
    else if (tabId === 'analytics') loadScoreChart(state.game);
    else if (tabId === 'leaderboard') loadLeaderboard(openPlayerProfile);
}

/**
 * Bootstraps the application on DOMContentLoaded.
 */
async function initApp() {
    // 1. Navigation & Theme
    initSidebar();
    restoreFilterPreferences();
    initTheme(refreshScoreChartTheme);

    // 2. Wire Tab Navigation Buttons
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (tabId) switchWindow(tabId, { onTabActivated: handleTabActivated });
        });
    });

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) switchWindow(hash, { onTabActivated: handleTabActivated });
    });

    // 3. Initialize Modules
    initAuthAccount({
        onAuthChange: async () => {
            updateAuthUI();
            await fetchStudioConfig();
            loadDashboardStats();
            loadLeaderboard(openPlayerProfile);
        },
    });

    initAdminPanel({
        onActionComplete: () => {
            loadDashboardStats();
            loadLeaderboard(openPlayerProfile);
        },
    });

    initLeaderboardView({
        onFilterChange: () => loadScoreChart(state.game),
        onPlayerClick: openPlayerProfile,
    });

    initScoreSubmit({
        onRequireAuth: openAccountScreen,
        onScoreSubmitted: ({ isApproved }) => {
            fetchGames();
            loadDashboardStats();
            if (isApproved) {
                loadLeaderboard(openPlayerProfile);
                loadScoreChart(state.game);
            } else if ((state.currentUser || state.user)?.role === 'admin') {
                loadAdminQueue();
            }
        },
    });

    initPlayerModal();
    initChartView();

    // 4. Load Dynamic Configuration & Initial Data
    await checkAuthSession();
    await fetchStudioConfig();
    await fetchGames();
    loadDashboardStats();
    loadLeaderboard(openPlayerProfile);

    // 5. Restore Initial URL Hash
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash) {
        switchWindow(initialHash, { onTabActivated: handleTabActivated });
    }
}

document.addEventListener('DOMContentLoaded', initApp);
