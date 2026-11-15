/**
 * Hyper Arena - Score Submission Engine
 * 
 * Handles player score submissions, client-side dynamic boundary validation,
 * admin player override, rate limit notifications, and post-submission lifecycle.
 */

'use strict';

import { state } from '../core/state.js';
import { apiPost } from '../core/api-client.js';
import { showStatus, clearStatus } from '../core/dom-utils.js';

/**
 * Handles submission of a game score.
 * @param {Event} event
 * @param {object} callbacks Map of { onRequireAuth(), onScoreSubmitted(result) }
 */
export async function handleScoreSubmit(event, callbacks = {}) {
    event.preventDefault();
    clearFormFeedback();

    const user = state.currentUser || state.user;
    if (!user) {
        showFormFeedback('You must sign in to submit a score.', 'error');
        if (typeof callbacks.onRequireAuth === 'function') {
            callbacks.onRequireAuth();
        }
        return;
    }

    const formGameInput = document.getElementById('formGameInput');
    const scoreInput = document.getElementById('scoreInput');
    const playerNameOverrideInput = document.getElementById('playerNameOverrideInput');

    const game = formGameInput ? formGameInput.value.trim() : '';
    const scoreVal = scoreInput ? scoreInput.value.trim() : '';

    if (!game) {
        showFormFeedback('Please specify a game title.', 'error');
        return;
    }
    if (scoreVal === '') {
        showFormFeedback('Please enter a score.', 'error');
        return;
    }

    const scoreNum = Number(scoreVal);
    const minBound = state.minScore ?? 0;
    const maxBound = state.maxScore ?? 2147483647;

    if (!Number.isInteger(scoreNum) || scoreNum < minBound) {
        showFormFeedback(`Score must be an integer between ${minBound} and ${maxBound.toLocaleString()}.`, 'error');
        return;
    }
    if (scoreNum > maxBound) {
        showFormFeedback(`Score exceeds maximum allowed value (${maxBound.toLocaleString()}).`, 'error');
        return;
    }

    const payload = {
        game: game,
        score: scoreNum,
    };

    if (user.role === 'admin' && playerNameOverrideInput && playerNameOverrideInput.value.trim() !== '') {
        payload.player_name = playerNameOverrideInput.value.trim();
    }

    setSubmittingState(true);

    try {
        const res = await apiPost('api/post-score.php', payload);

        if (res.status === 201 && res.data?.status === 'success') {
            const isApproved = res.data.data && res.data.data.status === 'approved';
            showFormFeedback(
                isApproved
                    ? 'Score submitted and verified successfully.'
                    : 'Score submitted successfully. Pending admin approval.',
                'success'
            );

            if (scoreInput) scoreInput.value = '';
            if (playerNameOverrideInput) playerNameOverrideInput.value = '';

            if (typeof callbacks.onScoreSubmitted === 'function') {
                callbacks.onScoreSubmitted({ isApproved, game });
            }
        } else if (res.status === 429) {
            showFormFeedback(res.error || 'Submission rate limit exceeded. Please wait a moment.', 'error');
        } else {
            showFormFeedback(res.error || 'Submission rejected.', 'error');
        }
    } catch (err) {
        showFormFeedback('Network error while submitting score.', 'error');
    } finally {
        setSubmittingState(false);
    }
}

/**
 * Toggles submission button disabled and loading state.
 * @param {boolean} isSubmitting
 */
export function setSubmittingState(isSubmitting) {
    const btn = document.getElementById('submitBtn');
    if (!btn) return;
    btn.disabled = isSubmitting;
    btn.textContent = isSubmitting ? 'Submitting...' : 'Submit for Verification';
}

/**
 * Displays status feedback message under score form.
 * @param {string} message
 * @param {'success'|'error'|'loading'} type
 */
export function showFormFeedback(message, type) {
    const el = document.getElementById('formFeedback');
    showStatus(el, message, type);
}

/**
 * Clears status feedback message under score form.
 */
export function clearFormFeedback() {
    const el = document.getElementById('formFeedback');
    clearStatus(el);
}

/**
 * Initializes score form listeners.
 * @param {object} callbacks Map of { onRequireAuth(), onScoreSubmitted(result) }
 */
export function initScoreSubmit(callbacks = {}) {
    const form = document.getElementById('scoreForm');
    if (form) {
        form.addEventListener('submit', (e) => handleScoreSubmit(e, callbacks));
    }
}

