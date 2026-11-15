/**
 * Hyper Arena - Safe DOM Utilities & Navigation
 * 
 * Provides XSS-immune element builders, formatters, theme management,
 * and responsive sidebar/window switching controls.
 */

'use strict';

import { state, getStoredTheme, setStoredTheme, getStoredSidebarCollapsed, setStoredSidebarCollapsed } from './state.js';

export const SVG_ICONS = {
    sun: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    moon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    userLg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    shieldLg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    eyeOff: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="23" x2="23" y2="1"></line></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
};

export const TAB_METADATA = {
    'leaderboard':   { panelId: 'panelLeaderboard',   breadcrumb: 'Leaderboard Standings' },
    'analytics':     { panelId: 'panelAnalytics',     breadcrumb: 'Performance Analytics' },
    'submit-rank':   { panelId: 'panelSubmitRank',   breadcrumb: 'Submit & Rank' },
    'moderation':    { panelId: 'panelModeration',    breadcrumb: 'Moderation Queue',    adminOnly: true },
    'game-registry': { panelId: 'panelGameRegistry', breadcrumb: 'Game Registry',       adminOnly: true },
    'audit-trail':   { panelId: 'panelAuditTrail',   breadcrumb: 'Studio Audit Trail',  adminOnly: true },
    'studio-api':    { panelId: 'panelStudioApi',    breadcrumb: 'Studio API & Config', adminOnly: false },
};

/**
 * Formats a number with comma separators.
 * @param {number|string} val
 * @returns {string}
 */
export function formatNumber(val) {
    const num = Number(val);
    return isNaN(num) ? '0' : num.toLocaleString();
}

/**
 * Formats an ISO datetime string into human readable date.
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
    if (!dateString) return '--';
    const date = new Date(dateString.replace(' ', 'T'));
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Displays status message on target element.
 * @param {HTMLElement} el
 * @param {string} message
 * @param {string} type 'success' | 'error' | 'loading' | 'info'
 */
export function showStatus(el, message, type = 'info') {
    if (!el) return;
    el.textContent = message;
    el.className = `status-msg visible ${type}`;
}

/**
 * Clears status message on target element.
 * @param {HTMLElement} el
 */
export function clearStatus(el) {
    if (!el) return;
    el.textContent = '';
    el.className = 'status-msg';
}

/**
 * Initializes and binds theme from stored preference.
 * @param {Function} [onThemeRefresh]
 */
export function initTheme(onThemeRefresh) {
    const savedTheme = getStoredTheme();
    applyTheme(savedTheme, onThemeRefresh);

    const toggleBtn = document.getElementById('themeToggle') || document.getElementById('themeToggleBtn');
    if (toggleBtn && !toggleBtn.dataset.themeBound) {
        toggleBtn.dataset.themeBound = 'true';
        toggleBtn.addEventListener('click', () => toggleTheme(onThemeRefresh));
    }
}

/**
 * Applies active theme to document and toggler.
 * @param {string} theme
 * @param {Function} [onThemeRefresh]
 */
export function applyTheme(theme, onThemeRefresh) {
    const isDark = theme !== 'light';
    const activeTheme = isDark ? 'dark' : 'light';
    state.theme = activeTheme;
    document.documentElement.setAttribute('data-theme', activeTheme);

    const themeToggleIcon = document.getElementById('themeToggleIcon');
    const themeToggleText = document.getElementById('themeToggleText');

    if (themeToggleIcon) {
        themeToggleIcon.innerHTML = isDark ? SVG_ICONS.moon : SVG_ICONS.sun;
    }
    if (themeToggleText) {
        themeToggleText.textContent = isDark ? 'Dark' : 'Light';
    }

    if (typeof onThemeRefresh === 'function') {
        onThemeRefresh();
    }
}

/**
 * Toggles theme between Dark and Light.
 * @param {Function} [onThemeRefresh]
 */
export function toggleTheme(onThemeRefresh) {
    const current = document.documentElement.getAttribute('data-theme') || state.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setStoredTheme(next);
    applyTheme(next, onThemeRefresh);
}

/**
 * Initializes sidebar collapse and responsive drawer toggling.
 */
export function initSidebar() {
    const appSidebar = document.getElementById('appSidebar');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const btnMobileSidebarToggle = document.getElementById('btnMobileSidebarToggle');

    const isCollapsed = getStoredSidebarCollapsed();
    state.sidebarCollapsed = isCollapsed;
    if (appSidebar) {
        appSidebar.classList.toggle('sidebar-collapsed', isCollapsed);
    }

    if (btnToggleSidebar && appSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            const next = !appSidebar.classList.contains('sidebar-collapsed');
            appSidebar.classList.toggle('sidebar-collapsed', next);
            state.sidebarCollapsed = next;
            setStoredSidebarCollapsed(next);
        });
    }

    if (btnMobileSidebarToggle && appSidebar && sidebarBackdrop) {
        btnMobileSidebarToggle.addEventListener('click', () => {
            appSidebar.classList.add('sidebar-open');
            sidebarBackdrop.classList.add('active');
        });

        sidebarBackdrop.addEventListener('click', () => {
            appSidebar.classList.remove('sidebar-open');
            sidebarBackdrop.classList.remove('active');
        });
    }
}

/**
 * Switches the active dashboard window panel.
 * @param {string} tabId
 * @param {object} callbacks Map of { onTabActivated(tabId) }
 */
export function switchWindow(tabId, callbacks = {}) {
    if (!TAB_METADATA[tabId]) tabId = 'leaderboard';
    state.activeTab = tabId;

    // Update active nav button
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
        const isActive = btn.dataset.tab === tabId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update breadcrumb
    const breadcrumb = document.getElementById('activeWindowBreadcrumb');
    if (breadcrumb && TAB_METADATA[tabId]) {
        breadcrumb.textContent = TAB_METADATA[tabId].breadcrumb;
    }

    // Toggle window panels
    Object.keys(TAB_METADATA).forEach((id) => {
        const panel = document.getElementById(TAB_METADATA[id].panelId);
        if (panel) {
            panel.classList.toggle('active', id === tabId);
            panel.classList.toggle('hidden', id !== tabId);
        }
    });

    if (window.location.hash !== `#${tabId}`) {
        history.replaceState(null, '', `#${tabId}`);
    }

    // Close mobile drawer if open
    const appSidebar = document.getElementById('appSidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (appSidebar) appSidebar.classList.remove('sidebar-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');

    if (typeof callbacks.onTabActivated === 'function') {
        callbacks.onTabActivated(tabId);
    }
}

