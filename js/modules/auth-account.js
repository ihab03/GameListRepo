/**
 * Hyper Arena - Authentication & Account Controller
 * 
 * Manages user sessions, login/registration forms, the bottom sidebar profile pod,
 * and the full-screen account dashboard overlay.
 */

'use strict';

import { state } from '../core/state.js';
import { apiGet, apiPost } from '../core/api-client.js';
import { SVG_ICONS, formatDate, showStatus, clearStatus } from '../core/dom-utils.js';
import { fetchStudioConfig, updateApiKeyUI } from './admin-panel.js';

/**
 * Checks existing session cookie and synchronizes user state.
 * @returns {Promise<boolean>}
 */
export async function checkAuthSession() {
    const res = await apiGet('api/session.php');
    if (res.ok && res.data?.authenticated && res.data.user) {
        state.user = res.data.user;
        state.currentUser = res.data.user;
    } else {
        state.user = null;
        state.currentUser = null;
    }
    updateAuthUI();
    return state.user !== null;
}

/**
 * Updates sidebar user pod, admin nav items, and submit form visibility.
 */
export function updateAuthUI() {
    const user = state.currentUser || state.user;
    const isLoggedIn = user !== null;
    const isAdmin = isLoggedIn && user.role === 'admin';

    // Update bottom sidebar user pod
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (avatarEl) {
        avatarEl.innerHTML = (isLoggedIn && isAdmin) ? SVG_ICONS.shield : SVG_ICONS.user;
    }

    const usernameEl = document.getElementById('sidebarUsername');
    if (usernameEl) {
        usernameEl.textContent = isLoggedIn ? user.username : 'Guest';
    }

    const roleBadgeEl = document.getElementById('sidebarRoleBadge');
    if (roleBadgeEl) {
        roleBadgeEl.textContent = isLoggedIn ? (isAdmin ? 'Admin' : 'Player') : 'Sign In / Register';
    }

    const submitUserLabel = document.getElementById('submitUserLabel');
    if (submitUserLabel && isLoggedIn) {
        submitUserLabel.textContent = user.username;
    }

    // Toggle admin sidebar items
    const navAdminLabel = document.getElementById('navAdminSectionLabel');
    if (navAdminLabel) navAdminLabel.classList.toggle('hidden', !isAdmin);

    document.querySelectorAll('.nav-admin-item').forEach((item) => {
        item.classList.toggle('hidden', !isAdmin);
    });

    // Score submission form lockbox vs authenticated form
    const lockbox = document.getElementById('authRequiredBox');
    const scoreForm = document.getElementById('scoreForm');
    const adminOverrideGroup = document.getElementById('adminPlayerNameGroup');

    if (lockbox) lockbox.classList.toggle('hidden', isLoggedIn);
    if (scoreForm) scoreForm.classList.toggle('hidden', !isLoggedIn);
    if (adminOverrideGroup) adminOverrideGroup.classList.toggle('hidden', !isAdmin);

    renderAccountView();
    updateApiKeyUI();
}

/**
 * Opens full-screen Account/Authentication view.
 */
export async function openAccountScreen() {
    const view = document.getElementById('fullScreenAccountView');
    if (!view) return;

    view.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // If logged in, fetch fresh session data for telemetry and recent submissions
    if (state.user) {
        const res = await apiGet('api/session.php');
        if (res.ok && res.data?.authenticated && res.data.user) {
            state.user = res.data.user;
            state.currentUser = res.data.user;
        }
    }
    renderAccountView();
}

/**
 * Closes full-screen Account view and restores dashboard view.
 */
export function closeAccountScreen() {
    const view = document.getElementById('fullScreenAccountView');
    if (view) view.classList.add('hidden');

    const appShell = document.getElementById('appShell');
    if (appShell) appShell.classList.remove('hidden');

    document.body.style.overflow = '';
}

/**
 * Renders the state of the account view (State A: Auth Card, State B: Dashboard).
 */
export function renderAccountView() {
    const user = state.currentUser || state.user;
    const isLoggedIn = user !== null;
    const isAdmin = isLoggedIn && user.role === 'admin';

    const loggedInView = document.getElementById('accountLoggedInView');
    const loggedOutView = document.getElementById('accountLoggedOutView');

    if (loggedInView) loggedInView.classList.toggle('hidden', !isLoggedIn);
    if (loggedOutView) loggedOutView.classList.toggle('hidden', isLoggedIn);

    if (isLoggedIn && user) {
        const avatarEl = document.getElementById('accProfileAvatar');
        const usernameEl = document.getElementById('accProfileUsername');
        const roleEl = document.getElementById('accProfileRole');
        const approvedEl = document.getElementById('accStatApproved');
        const pendingEl = document.getElementById('accStatPending');
        const rejectedEl = document.getElementById('accStatRejected');
        const bestEl = document.getElementById('accStatBest');
        const bodyEl = document.getElementById('accSubmissionsBody');
        const emptyEl = document.getElementById('accSubmissionsEmpty');

        if (avatarEl) avatarEl.innerHTML = isAdmin ? SVG_ICONS.shieldLg : SVG_ICONS.userLg;
        if (usernameEl) usernameEl.textContent = user.username;
        if (roleEl) {
            roleEl.textContent = user.role.toUpperCase();
            roleEl.className = `user-role-badge ${isAdmin ? 'badge-admin' : ''}`;
        }

        const stats = user.stats || {};
        if (approvedEl) approvedEl.textContent = Number(stats.approved_count || 0).toLocaleString();
        if (pendingEl) pendingEl.textContent = Number(stats.pending_count || 0).toLocaleString();
        if (rejectedEl) rejectedEl.textContent = Number(stats.rejected_count || 0).toLocaleString();
        if (bestEl) bestEl.textContent = Number(stats.best_score || 0).toLocaleString();

        if (bodyEl) {
            bodyEl.replaceChildren();
            const recents = Array.isArray(user.recent_submissions) ? user.recent_submissions : [];
            if (emptyEl) emptyEl.classList.toggle('hidden', recents.length > 0);

            recents.forEach((item) => {
                const tr = document.createElement('tr');

                const tdGame = document.createElement('td');
                tdGame.textContent = item.game;
                tr.appendChild(tdGame);

                const tdScore = document.createElement('td');
                tdScore.className = 'td-score';
                tdScore.style.textAlign = 'right';
                tdScore.textContent = Number(item.score).toLocaleString();
                tr.appendChild(tdScore);

                const tdStatus = document.createElement('td');
                tdStatus.style.textAlign = 'center';
                const badge = document.createElement('span');
                badge.className = `badge-status badge-${item.status}`;
                badge.textContent = item.status.charAt(0).toUpperCase() + item.status.slice(1);
                tdStatus.appendChild(badge);
                tr.appendChild(tdStatus);

                const tdDate = document.createElement('td');
                tdDate.className = 'td-date';
                tdDate.textContent = formatDate(item.created_at);
                tr.appendChild(tdDate);

                bodyEl.appendChild(tr);
            });
        }
    } else {
        switchAuthTab('login');
    }
}

/**
 * Switches between 'login' and 'register' mode in the logged-out card.
 * @param {'login'|'register'} mode
 */
export function switchAuthTab(mode) {
    const isLogin = mode === 'login';
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginInput = document.getElementById('loginUsername');
    const registerInput = document.getElementById('registerUsername');

    if (tabLogin) tabLogin.classList.toggle('active', isLogin);
    if (tabRegister) tabRegister.classList.toggle('active', !isLogin);
    if (loginForm) loginForm.classList.toggle('hidden', !isLogin);
    if (registerForm) registerForm.classList.toggle('hidden', isLogin);

    clearStatus(document.getElementById('authFeedback'));

    if (isLogin && loginInput) loginInput.focus();
    else if (!isLogin && registerInput) registerInput.focus();
}

/**
 * Handles user login form submission.
 */
export async function handleLoginSubmit(event, onAuthSuccess) {
    event.preventDefault();
    const feedback = document.getElementById('authFeedback');
    clearStatus(feedback);

    const username = document.getElementById('loginUsername')?.value.trim() || '';
    const password = document.getElementById('loginPassword')?.value || '';
    const btnSubmit = document.getElementById('btnLoginSubmit');

    if (!username || !password) {
        showStatus(feedback, 'Username and password are required.', 'error');
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Signing in...';
    }

    const res = await apiPost('api/login.php', { username, password });
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Sign In';
    }

    if (res.ok && res.data?.status === 'success' && res.data.user) {
        state.user = res.data.user;
        state.currentUser = res.data.user;
        const passInput = document.getElementById('loginPassword');
        if (passInput) passInput.value = '';

        await checkAuthSession();
        await fetchStudioConfig(); // Part 1: Re-fetch dynamic config with admin credentials
        closeAccountScreen();

        if (typeof onAuthSuccess === 'function') onAuthSuccess();
    } else {
        showStatus(feedback, res.error || 'Invalid username or password.', 'error');
    }
}

/**
 * Handles user registration form submission.
 */
export async function handleRegisterSubmit(event, onAuthSuccess) {
    event.preventDefault();
    const feedback = document.getElementById('authFeedback');
    clearStatus(feedback);

    const username = document.getElementById('registerUsername')?.value.trim() || '';
    const password = document.getElementById('registerPassword')?.value || '';
    const btnSubmit = document.getElementById('btnRegisterSubmit');

    if (!username || !password) {
        showStatus(feedback, 'Username and password are required.', 'error');
        return;
    }
    if (username.length < 3 || username.length > 50) {
        showStatus(feedback, 'Username must be between 3 and 50 characters.', 'error');
        return;
    }
    if (password.length < 6) {
        showStatus(feedback, 'Password must be at least 6 characters.', 'error');
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Creating account...';
    }

    const res = await apiPost('api/register.php', { username, password });
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Create Account';
    }

    if (res.ok && res.data?.status === 'success' && res.data.user) {
        state.user = res.data.user;
        state.currentUser = res.data.user;

        const uInput = document.getElementById('registerUsername');
        const pInput = document.getElementById('registerPassword');
        if (uInput) uInput.value = '';
        if (pInput) pInput.value = '';

        await checkAuthSession();
        await fetchStudioConfig(); // Part 1: Re-fetch dynamic config with admin credentials
        closeAccountScreen();

        if (typeof onAuthSuccess === 'function') onAuthSuccess();
    } else {
        showStatus(feedback, res.error || 'Registration failed.', 'error');
    }
}

/**
 * Handles user logout.
 */
export async function handleLogout(onLogoutComplete) {
    await apiPost('api/logout.php');
    state.user = null;
    state.currentUser = null;
    state.adminConfig = null;
    state.rawSecretKey = '';

    updateAuthUI();
    await fetchStudioConfig(); // Part 1: Re-fetch public config as guest
    closeAccountScreen();

    if (typeof onLogoutComplete === 'function') onLogoutComplete();
}

/**
 * Initializes all auth/account DOM event listeners.
 */
export function initAuthAccount(callbacks = {}) {
    const userPod = document.getElementById('sidebarUserPod');
    if (userPod) {
        userPod.addEventListener('click', openAccountScreen);
        userPod.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openAccountScreen();
            }
        });
    }

    const closeBtn = document.getElementById('closeAccountScreenBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeAccountScreen);

    const btnPromptAuth = document.getElementById('btnPromptAuth');
    if (btnPromptAuth) {
        btnPromptAuth.addEventListener('click', () => {
            openAccountScreen();
            switchAuthTab('login');
        });
    }

    const tabLogin = document.getElementById('tabLogin');
    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));

    const tabRegister = document.getElementById('tabRegister');
    if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', (e) => handleLoginSubmit(e, callbacks.onAuthSuccess));

    const regForm = document.getElementById('registerForm');
    if (regForm) regForm.addEventListener('submit', (e) => handleRegisterSubmit(e, callbacks.onAuthSuccess));

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => handleLogout(callbacks.onLogout));

    document.querySelectorAll('.demo-fill-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const u = btn.dataset.user || '';
            const p = btn.dataset.pass || '';
            switchAuthTab('login');
            const uInput = document.getElementById('loginUsername');
            const pInput = document.getElementById('loginPassword');
            if (uInput) uInput.value = u;
            if (pInput) pInput.value = p;
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const view = document.getElementById('fullScreenAccountView');
            if (view && !view.classList.contains('hidden')) {
                closeAccountScreen();
            }
        }
    });
}

