<?php
/**
 * Session Management and Authentication Core
 * 
 * Provides secure cookie-based session initialization, user session extraction,
 * authentication/admin authorization guards, and Secret API Key verification.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/response.php';

/**
 * Initializes a secure session with HttpOnly, SameSite Lax, and environment-aware Secure flags.
 *
 * @return void
 */
function startSecureSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                   || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'httponly' => true,
            'secure'   => $isHttps,
            'samesite' => 'Lax'
        ]);
        session_start();
    }
}

/**
 * Returns the currently authenticated user session or null if not logged in.
 *
 * @return array{id: int, username: string, role: string}|null
 */
function getCurrentUser(): ?array {
    startSecureSession();
    if (!isset($_SESSION['user']) || !is_array($_SESSION['user'])) {
        return null;
    }
    return [
        'id'       => (int) $_SESSION['user']['id'],
        'username' => (string) $_SESSION['user']['username'],
        'role'     => (string) $_SESSION['user']['role'],
    ];
}

/**
 * Enforces that a valid user session is active.
 * Emits HTTP 401 Unauthorized and terminates if not authenticated.
 *
 * @return array{id: int, username: string, role: string}
 */
function requireAuth(): array {
    $user = getCurrentUser();
    if ($user === null) {
        sendJsonResponse(401, [
            'status'  => 'error',
            'message' => 'Authentication required. Please log in to submit a score.'
        ]);
    }
    return $user;
}

/**
 * Enforces that the current session belongs to an administrator.
 * Emits HTTP 401 if unauthenticated or HTTP 403 Forbidden if not an admin.
 *
 * @return array{id: int, username: string, role: string}
 */
function requireAdmin(): array {
    $user = requireAuth();
    if (strtolower(trim($user['role'])) !== 'admin') {
        sendJsonResponse(403, [
            'status'  => 'error',
            'message' => 'Admin access required.'
        ]);
    }
    return $user;
}

/**
 * Validates the Secret API Key against API_SECRET_KEY in config.
 * Checks the X-API-Key HTTP header and/or an optional payload field.
 *
 * @param string|null $providedKey
 * @return bool True if valid key matches, false otherwise.
 */
function validateApiKey(?string $providedKey = null): bool {
    if (!defined('API_SECRET_KEY') || API_SECRET_KEY === '') {
        return false;
    }

    $candidateKey = $providedKey;

    if ($candidateKey === null || trim($candidateKey) === '') {
        if (!empty($_SERVER['HTTP_X_API_KEY'])) {
            $candidateKey = (string) $_SERVER['HTTP_X_API_KEY'];
        } elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $name => $val) {
                if (strcasecmp($name, 'X-API-Key') === 0) {
                    $candidateKey = (string) $val;
                    break;
                }
            }
        }
    }

    if ($candidateKey === null || trim((string) $candidateKey) === '') {
        return false;
    }

    return hash_equals(API_SECRET_KEY, trim((string) $candidateKey));
}

