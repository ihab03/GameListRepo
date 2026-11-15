/**
 * Hyper Arena - Studio Admin Panel Controller
 * 
 * Manages the Moderation Queue, Game Registry, Audit Trail, and Studio API Key configuration.
 * Strictly adheres to DOM textContent manipulation for XSS immunity.
 */

'use strict';

import { state } from '../core/state.js';
import { apiGet, apiPost } from '../core/api-client.js';
import { SVG_ICONS, formatDate, showStatus, clearStatus } from '../core/dom-utils.js';

/**
 * Fetches dynamic studio configuration and admin secrets.
 * @returns {Promise<void>}
 */
export async function fetchStudioConfig() {
    const res = await apiGet('api/get-config.php');
    if (res.ok && res.data?.status === 'success' && res.data.config) {
        state.config = res.data.config;
        state.adminConfig = res.data.admin_config || null;

        if (res.data.config.app_title) {
            document.title = `${res.data.config.app_title} - Leaderboard Platform`;
            const sidebarTitle = document.getElementById('sidebarAppTitle');
            const cfgTitle = document.getElementById('cfgAppTitle');
            if (sidebarTitle) sidebarTitle.textContent = res.data.config.app_title;
            if (cfgTitle) cfgTitle.textContent = res.data.config.app_title;
        }

        if (typeof res.data.config.min_score === 'number') state.minScore = res.data.config.min_score;
        if (typeof res.data.config.max_score === 'number') state.maxScore = res.data.config.max_score;

        const boundsEl = document.getElementById('cfgScoreBounds');
        if (boundsEl) {
            boundsEl.textContent = `${state.minScore.toLocaleString()} - ${state.maxScore.toLocaleString()}`;
        }

        const limitsEl = document.getElementById('cfgAllowedLimits');
        if (limitsEl && Array.isArray(res.data.config.allowed_limits)) {
            limitsEl.textContent = res.data.config.allowed_limits.join(', ');
        }

        const rateLimitEl = document.getElementById('cfgRateLimit');
        if (rateLimitEl && res.data.config.rate_limit_max) {
            rateLimitEl.textContent = `${res.data.config.rate_limit_max} req / ${res.data.config.rate_limit_window || 60}s`;
        }

        const maxExportEl = document.getElementById('cfgMaxExport');
        if (maxExportEl && res.data.config.max_export_limit) {
            maxExportEl.textContent = `${res.data.config.max_export_limit} records`;
        }

        updateApiKeyUI();
    }
}

/**
 * Renders the Studio API Secret Key UI based on current admin authentication.
 */
export function updateApiKeyUI() {
    const user = state.currentUser || state.user;
    const isAdmin = user && user.role === 'admin';
    const secretKey = state.adminConfig?.api_secret_key || '';

    const adminContent = document.getElementById('apiKeyAdminContent');
    const guestContent = document.getElementById('apiKeyGuestContent');
    const keyInput = document.getElementById('apiSecretKeyInput');

    if (isAdmin && secretKey) {
        state.rawSecretKey = secretKey;
        if (adminContent) adminContent.classList.remove('hidden');
        if (guestContent) guestContent.classList.add('hidden');
        if (keyInput) {
            keyInput.type = state.isKeyRevealed ? 'text' : 'password';
            keyInput.value = state.isKeyRevealed ? secretKey : '••••••••••••••••••••';
        }
    } else {
        state.rawSecretKey = '';
        if (adminContent) adminContent.classList.add('hidden');
        if (guestContent) guestContent.classList.remove('hidden');
    }
}

/**
 * Toggles visibility of the Secret API Key.
 */
export function toggleRevealApiKey() {
    const keyInput = document.getElementById('apiSecretKeyInput');
    const revealIcon = document.getElementById('revealApiKeyIcon');
    const revealText = document.getElementById('revealApiKeyText');

    if (!keyInput || !state.rawSecretKey) return;
    state.isKeyRevealed = !state.isKeyRevealed;
    keyInput.type = state.isKeyRevealed ? 'text' : 'password';
    keyInput.value = state.isKeyRevealed ? state.rawSecretKey : '••••••••••••••••••••';

    if (revealIcon) revealIcon.innerHTML = state.isKeyRevealed ? SVG_ICONS.eyeOff : SVG_ICONS.eye;
    if (revealText) revealText.textContent = state.isKeyRevealed ? 'Hide' : 'Reveal';
}

/**
 * Copies the raw API secret key to clipboard.
 */
export async function copyApiKeyToClipboard() {
    const btn = document.getElementById('btnCopyApiKey');
    const copyIcon = document.getElementById('copyApiKeyIcon');
    const copyText = document.getElementById('copyApiKeyText');

    if (!state.rawSecretKey || !btn) return;
    try {
        await navigator.clipboard.writeText(state.rawSecretKey);
        if (copyIcon) copyIcon.innerHTML = SVG_ICONS.check;
        if (copyText) copyText.textContent = 'Copied!';
        btn.classList.add('btn-success');
        setTimeout(() => {
            if (copyIcon) copyIcon.innerHTML = SVG_ICONS.copy;
            if (copyText) copyText.textContent = 'Copy';
            btn.classList.remove('btn-success');
        }, 1800);
    } catch (e) {
        alert('Could not copy API Key to clipboard.');
    }
}

/**
 * Loads pending, approved, or rejected scores into the Moderation Queue.
 */
export async function loadAdminQueue(onActionComplete) {
    const statusEl = document.getElementById('adminQueueStatus');
    const bodyEl = document.getElementById('adminQueueBody');
    if (!bodyEl) return;

    showStatus(statusEl, 'Loading moderation queue...', 'loading');
    const res = await apiGet(`api/admin-pending-scores.php?status=${encodeURIComponent(state.adminStatus)}`);
    clearStatus(statusEl);

    if (!res.ok || res.data?.status !== 'success') {
        showStatus(statusEl, res.error || 'Failed to load queue.', 'error');
        return;
    }

    const scores = res.data.scores || [];
    bodyEl.replaceChildren();

    if (scores.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = 'empty-state';
        td.textContent = `No ${state.adminStatus} scores in queue.`;
        tr.appendChild(td);
        bodyEl.appendChild(tr);
        return;
    }

    scores.forEach((s) => {
        const tr = document.createElement('tr');

        const tdGame = document.createElement('td');
        tdGame.textContent = s.game;
        tr.appendChild(tdGame);

        const tdPlayer = document.createElement('td');
        tdPlayer.textContent = s.player_name;
        tr.appendChild(tdPlayer);

        const tdScore = document.createElement('td');
        tdScore.className = 'td-score';
        tdScore.textContent = Number(s.score).toLocaleString();
        tr.appendChild(tdScore);

        const tdDate = document.createElement('td');
        tdDate.className = 'td-date';
        tdDate.textContent = formatDate(s.created_at);
        tr.appendChild(tdDate);

        const tdActions = document.createElement('td');
        tdActions.style.textAlign = 'center';

        if (state.adminStatus === 'pending') {
            const row = document.createElement('div');
            row.className = 'action-btn-row';

            const btnApprove = document.createElement('button');
            btnApprove.type = 'button';
            btnApprove.className = 'btn-mini-approve';
            btnApprove.textContent = 'Approve';
            btnApprove.addEventListener('click', async () => {
                await verifyScore(s.id, 'approved', onActionComplete);
            });

            const btnReject = document.createElement('button');
            btnReject.type = 'button';
            btnReject.className = 'btn-mini-reject';
            btnReject.textContent = 'Reject';
            btnReject.addEventListener('click', async () => {
                await verifyScore(s.id, 'rejected', onActionComplete);
            });

            row.appendChild(btnApprove);
            row.appendChild(btnReject);
            tdActions.appendChild(row);
        } else {
            const span = document.createElement('span');
            span.className = `status-badge badge-${state.adminStatus}`;
            span.textContent = state.adminStatus.toUpperCase();
            tdActions.appendChild(span);
        }

        tr.appendChild(tdActions);
        bodyEl.appendChild(tr);
    });
}

async function verifyScore(id, action, onActionComplete) {
    const res = await apiPost('api/admin-verify-score.php', { id, action });
    if (res.ok) {
        await loadAdminQueue(onActionComplete);
        if (typeof onActionComplete === 'function') onActionComplete();
    } else {
        alert(res.error || 'Failed to update score status.');
    }
}

/**
 * Batch approves all pending scores.
 */
export async function approveAllPendingScores(onActionComplete) {
    const res = await apiPost('api/admin-verify-score.php', { action: 'approve_all' });
    if (res.ok) {
        await loadAdminQueue(onActionComplete);
        if (typeof onActionComplete === 'function') onActionComplete();
    } else {
        alert(res.error || 'Batch approval failed.');
    }
}

/**
 * Loads dynamic game registry list.
 */
export async function loadGameRegistry() {
    const bodyEl = document.getElementById('gamesTableBody');
    if (!bodyEl) return;

    const res = await apiGet('api/get-games.php');
    if (!res.ok) return;

    const games = res.data?.games || [];
    bodyEl.replaceChildren();

    games.forEach((g) => {
        const tr = document.createElement('tr');
        const tdTitle = document.createElement('td');
        tdTitle.textContent = g.name;
        const tdCount = document.createElement('td');
        tdCount.style.textAlign = 'right';
        tdCount.textContent = Number(g.total_scores || 0).toLocaleString();

        tr.appendChild(tdTitle);
        tr.appendChild(tdCount);
        bodyEl.appendChild(tr);
    });
}

/**
 * Handles creation of a new game in the registry.
 */
export async function handleCreateGame(event, onGameCreated) {
    event.preventDefault();
    const titleInput = document.getElementById('newGameTitle');
    const descInput = document.getElementById('newGameDesc');
    const feedback = document.getElementById('gameRegistryFormFeedback');
    const name = titleInput?.value.trim() || '';
    const description = descInput?.value.trim() || '';

    if (!name) {
        showStatus(feedback, 'Game title is required.', 'error');
        return;
    }

    const res = await apiPost('api/admin-manage-games.php', { action: 'create', name, description });
    if (res.ok && res.data?.status === 'success') {
        showStatus(feedback, 'Game created successfully!', 'success');
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        await loadGameRegistry();
        if (typeof onGameCreated === 'function') onGameCreated();
    } else {
        showStatus(feedback, res.error || 'Failed to create game.', 'error');
    }
}

/**
 * Loads admin audit trail from dashboard telemetry.
 */
export async function loadAuditTrail() {
    const bodyEl = document.getElementById('auditLogBody');
    if (!bodyEl) return;

    const res = await apiGet('api/get-dashboard-stats.php');
    if (!res.ok) return;

    const logs = res.data?.recent_audit_logs || [];
    bodyEl.replaceChildren();

    if (logs.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.className = 'empty-state';
        td.textContent = 'No administrative actions logged yet.';
        tr.appendChild(td);
        bodyEl.appendChild(tr);
        return;
    }

    logs.forEach((log) => {
        const tr = document.createElement('tr');

        const tdAdmin = document.createElement('td');
        tdAdmin.textContent = log.admin_username || `Admin #${log.admin_id}`;
        tr.appendChild(tdAdmin);

        const tdAction = document.createElement('td');
        tdAction.textContent = log.action;
        tr.appendChild(tdAction);

        const tdDetails = document.createElement('td');
        tdDetails.textContent = log.details || '--';
        tr.appendChild(tdDetails);

        const tdDate = document.createElement('td');
        tdDate.className = 'td-date';
        tdDate.textContent = formatDate(log.created_at);
        tr.appendChild(tdDate);

        bodyEl.appendChild(tr);
    });
}

/**
 * Initializes all admin panel DOM listeners.
 */
export function initAdminPanel(refreshCallbacks = {}) {
    document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.adminStatus = btn.dataset.status || 'pending';
            loadAdminQueue(refreshCallbacks.onQueueUpdated);
        });
    });

    const btnApproveAll = document.getElementById('btnApproveAll');
    if (btnApproveAll) {
        btnApproveAll.addEventListener('click', () => approveAllPendingScores(refreshCallbacks.onQueueUpdated));
    }

    const createForm = document.getElementById('createGameForm');
    if (createForm) {
        createForm.addEventListener('submit', (e) => handleCreateGame(e, refreshCallbacks.onGameCreated));
    }

    const btnRefreshGames = document.getElementById('btnRefreshGames');
    if (btnRefreshGames) {
        btnRefreshGames.addEventListener('click', loadGameRegistry);
    }

    const btnRefreshAudit = document.getElementById('btnRefreshAudit');
    if (btnRefreshAudit) {
        btnRefreshAudit.addEventListener('click', loadAuditTrail);
    }

    const btnReveal = document.getElementById('btnRevealApiKey');
    if (btnReveal) {
        btnReveal.addEventListener('click', toggleRevealApiKey);
    }

    const btnCopy = document.getElementById('btnCopyApiKey');
    if (btnCopy) {
        btnCopy.addEventListener('click', copyApiKeyToClipboard);
    }
}

