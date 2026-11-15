/**
 * Hyper Arena - Centralized API Client
 * 
 * Provides unified HTTP GET/POST wrappers with session cookie inclusion,
 * aggressive cache prevention, and structured JSON parsing.
 */

'use strict';

/**
 * Dispatches an HTTP GET request with credentials and cache prevention.
 * 
 * @param {string} endpoint API endpoint path (e.g., 'api/get-config.php')
 * @returns {Promise<{ ok: boolean, status: number, data: any, error?: string }>}
 */
export async function apiGet(endpoint) {
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
            },
        });

        let data = null;
        try {
            data = await response.json();
        } catch (parseErr) {
            data = null;
        }

        return {
            ok: response.ok,
            status: response.status,
            data,
            error: response.ok ? null : (data?.message || `Request failed with status ${response.status}`)
        };
    } catch (netErr) {
        return {
            ok: false,
            status: 0,
            data: null,
            error: 'Network connectivity failure. Please check server.'
        };
    }
}

/**
 * Dispatches an HTTP POST request with JSON payload and session credentials.
 * 
 * @param {string} endpoint API endpoint path (e.g., 'api/post-score.php')
 * @param {object} payload Request body object to serialize as JSON
 * @returns {Promise<{ ok: boolean, status: number, data: any, error?: string }>}
 */
export async function apiPost(endpoint, payload = {}) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        let data = null;
        try {
            data = await response.json();
        } catch (parseErr) {
            data = null;
        }

        return {
            ok: response.ok,
            status: response.status,
            data,
            error: response.ok ? null : (data?.message || `Request failed with status ${response.status}`)
        };
    } catch (netErr) {
        return {
            ok: false,
            status: 0,
            data: null,
            error: 'Network connectivity failure. Please check server.'
        };
    }
}

