/**
 * Hyper Arena - Central Application State
 * 
 * Manages reactive runtime state, dynamic configuration bounds, and user preferences.
 */

'use strict';

export const state = {
    user: null,              // Authenticated user { id, username, role, stats, recent_submissions }
    currentUser: null,       // Convenient alias
    config: null,            // Dynamic configuration from GET api/get-config.php
    adminConfig: null,       // Admin secrets & endpoints when authenticated as admin
    activeTab: 'leaderboard',
    sidebarCollapsed: false,
    game: 'all',
    limit: '10',
    period: 'all',
    sort: 'score_desc',
    search: '',
    adminStatus: 'pending',
    theme: 'dark',
    rawSecretKey: '',
    isKeyRevealed: false,
    minScore: 0,
    maxScore: 2147483647,
};

/**
 * Retrieves the stored theme preference from localStorage.
 * @returns {string} 'dark' or 'light'
 */
export function getStoredTheme() {
    try {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') return stored;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
    } catch (e) {}
    return 'dark';
}

/**
 * Persists theme preference to localStorage.
 * @param {string} theme 'dark' or 'light'
 */
export function setStoredTheme(theme) {
    try {
        localStorage.setItem('theme', theme);
    } catch (e) {}
}

/**
 * Retrieves sidebar collapsed preference from localStorage.
 * @returns {boolean}
 */
export function getStoredSidebarCollapsed() {
    try {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch (e) {}
    return false;
}

/**
 * Persists sidebar collapsed preference to localStorage.
 * @param {boolean} collapsed
 */
export function setStoredSidebarCollapsed(collapsed) {
    try {
        localStorage.setItem('sidebar_collapsed', String(collapsed));
    } catch (e) {}
}

/**
 * Restores cached filter preferences from localStorage.
 */
export function restoreFilterPreferences() {
    try {
        const savedGame = localStorage.getItem('pref_game') || localStorage.getItem('selectedGame');
        const savedLimit = localStorage.getItem('pref_limit');
        const savedPeriod = localStorage.getItem('pref_period');
        const savedSort = localStorage.getItem('pref_sort');

        if (savedGame) state.game = savedGame;
        if (savedLimit) state.limit = savedLimit;
        if (savedPeriod) state.period = savedPeriod;
        if (savedSort) state.sort = savedSort;
    } catch (e) {}
}

/**
 * Persists current filter preferences to localStorage.
 */
export function saveFilterPreferences() {
    try {
        localStorage.setItem('pref_game', state.game);
        localStorage.setItem('selectedGame', state.game);
        localStorage.setItem('pref_limit', state.limit);
        localStorage.setItem('pref_period', state.period);
        localStorage.setItem('pref_sort', state.sort);
    } catch (e) {}
}

