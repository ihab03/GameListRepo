<?php
/**
 * Shared API Helpers
 * 
 * Provides centralized response formatting, request parsing, authentication,
 * session management, and parameter validation.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

const MIN_SCORE = 0;
const MAX_SCORE = 2147483647;

/**
 * Initializes a secure session with HttpOnly and Lax cookie policies.
 *
 * @return void
 */
function startSecureSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        // Enforce cookie security flags
        $cookieParams = session_get_cookie_params();
        session_set_cookie_params([
            'lifetime' => 86400 * 7, // 7 days
            'path'     => '/',
            'domain'   => $cookieParams['domain'] ?? '',
            'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax',
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
    if ($user['role'] !== 'admin') {
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
        // Check HTTP_X_API_KEY from server environment
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

/**
 * Enforces an IP/Session request rate limit on sensitive endpoints.
 * Emits HTTP 429 Too Many Requests if the limit is exceeded.
 *
 * @param string $endpoint Name of the endpoint for rate limiting tracking
 * @param int $maxAttempts Maximum allowable requests within the window
 * @param int $windowSeconds Window size in seconds (default 60 seconds)
 * @return void
 */
function enforceRateLimit(string $endpoint = 'post-score', int $maxAttempts = 10, int $windowSeconds = 60): void {
    require_once __DIR__ . '/../db.php';
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $now = time();

    try {
        $pdo = getDbConnection();
        $selectStmt = $pdo->prepare(
            'SELECT hit_count, window_start FROM rate_limits WHERE ip_address = :ip AND endpoint = :endpoint'
        );
        $selectStmt->execute([':ip' => $ip, ':endpoint' => $endpoint]);
        $record = $selectStmt->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            $insertStmt = $pdo->prepare(
                'INSERT INTO rate_limits (ip_address, endpoint, hit_count, window_start) 
                 VALUES (:ip, :endpoint, 1, :now)
                 ON DUPLICATE KEY UPDATE hit_count = 1, window_start = :now_update'
            );
            $insertStmt->execute([':ip' => $ip, ':endpoint' => $endpoint, ':now' => $now, ':now_update' => $now]);
            return;
        }

        $windowStart = (int) $record['window_start'];
        $hitCount = (int) $record['hit_count'];
        $elapsed = $now - $windowStart;

        if ($elapsed >= $windowSeconds) {
            // Window has expired; reset counter for a new window
            $resetStmt = $pdo->prepare(
                'UPDATE rate_limits SET hit_count = 1, window_start = :now WHERE ip_address = :ip AND endpoint = :endpoint'
            );
            $resetStmt->execute([':now' => $now, ':ip' => $ip, ':endpoint' => $endpoint]);
            return;
        }

        if ($hitCount >= $maxAttempts) {
            $retryAfter = max(1, $windowSeconds - $elapsed);
            header('Retry-After: ' . $retryAfter);
            sendJsonResponse(429, [
                'status'      => 'error',
                'message'     => 'Too many submissions. Please wait a moment before submitting another score.',
                'retry_after' => $retryAfter,
            ]);
        }

        $incrementStmt = $pdo->prepare(
            'UPDATE rate_limits SET hit_count = hit_count + 1 WHERE ip_address = :ip AND endpoint = :endpoint'
        );
        $incrementStmt->execute([':ip' => $ip, ':endpoint' => $endpoint]);
    } catch (\Throwable $e) {
        error_log('Rate limiting database error: ' . $e->getMessage());
    }
}

/**
 * Resets the rate limit counter for a specific IP and endpoint.
 *
 * @param string $ip
 * @param string $endpoint
 * @return void
 */
function resetRateLimit(string $ip = '127.0.0.1', string $endpoint = 'post-score'): void {
    require_once __DIR__ . '/../db.php';
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare('DELETE FROM rate_limits WHERE ip_address = :ip AND endpoint = :endpoint');
        $stmt->execute([':ip' => $ip, ':endpoint' => $endpoint]);
    } catch (\Throwable $e) {
        error_log('Reset rate limit error: ' . $e->getMessage());
    }
}

/**
 * Validates user credentials for registration or login.
 *
 * @param string $username
 * @param string $password
 * @param bool $isRegistration
 * @return string|null Error message or null if valid.
 */
function validateCredentials(string $username, string $password, bool $isRegistration = false): ?string {
    $trimmedUsername = trim($username);

    if ($trimmedUsername === '') {
        return 'Username is required.';
    }

    if (mb_strlen($trimmedUsername) < 3 || mb_strlen($trimmedUsername) > 50) {
        return 'Username must be between 3 and 50 characters.';
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $trimmedUsername)) {
        return 'Username may only contain letters, numbers, and underscores.';
    }

    if ($password === '') {
        return 'Password is required.';
    }

    if ($isRegistration && strlen($password) < 6) {
        return 'Password must be at least 6 characters.';
    }

    return null;
}

/**
 * Validates pagination/limit parameter (10, 15, 25, 50, 100, or all).
 *
 * @param mixed $limitRaw
 * @return int|null Valid integer limit or null if invalid.
 */
function validateLimit($limitRaw): ?int {
    if ($limitRaw === null || $limitRaw === '') {
        return 10; // Default limit
    }

    $limitStr = strtolower(trim((string) $limitRaw));
    if ($limitStr === 'all') {
        return 500; // Capped max for 'all' to protect memory
    }

    $allowedLimits = ['10' => 10, '15' => 15, '25' => 25, '50' => 50, '100' => 100];
    return $allowedLimits[$limitStr] ?? null;
}

/**
 * Validates leaderboard sort parameter.
 *
 * @param mixed $sortRaw
 * @return string|null Valid sort string or null if invalid.
 */
function validateSort($sortRaw): ?string {
    if ($sortRaw === null || $sortRaw === '') {
        return 'score_desc'; // Default sort
    }

    $normalized = strtolower(trim((string) $sortRaw));
    $allowedSorts = ['score_desc', 'score_asc', 'newest'];

    return in_array($normalized, $allowedSorts, true) ? $normalized : null;
}

/**
 * Sends a structured JSON response and terminates script execution.
 *
 * @param int $statusCode HTTP response status code
 * @param array $data Data payload to serialize as JSON
 * @return void
 */
function sendJsonResponse(int $statusCode, array $data): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Extracts request data, supporting both JSON payload and $_POST form data.
 *
 * @return array
 */
function getRequestData(): array {
    $rawInput = file_get_contents('php://input');

    if (!empty($rawInput)) {
        $decoded = json_decode($rawInput, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return is_array($_POST) ? $_POST : [];
}

/**
 * Validates a game name string.
 *
 * @param mixed $game
 * @return string|null Error message string if invalid, or null if valid.
 */
function validateGameName($game): ?string {
    if (!is_string($game) || trim($game) === '') {
        return 'Game name is required and cannot be empty.';
    }

    $trimmedGame = trim($game);
    if (mb_strlen($trimmedGame) > 100) {
        return 'Game name must not exceed 100 characters.';
    }

    return null;
}

/**
 * Validates a player name string.
 *
 * @param mixed $playerName
 * @return string|null Error message string if invalid, or null if valid.
 */
function validatePlayerName($playerName): ?string {
    if (!is_string($playerName) || trim($playerName) === '') {
        return 'Player name is required and cannot be empty.';
    }

    $trimmed = trim($playerName);
    if (mb_strlen($trimmed) > 100) {
        return 'Player name must not exceed 100 characters.';
    }

    return null;
}

/**
 * Validates a leaderboard time period filter.
 *
 * @param mixed $period
 * @return string|null Error message string if invalid, or null if valid.
 */
function validatePeriod($period): ?string {
    if ($period === null || $period === '') {
        return null; // Defaults to 'all'
    }

    if (!is_string($period)) {
        return 'Invalid period specified. Allowed values: all, week, today.';
    }

    $normalized = strtolower(trim($period));
    $allowed = ['all', 'week', 'today'];

    if (!in_array($normalized, $allowed, true)) {
        return 'Invalid period specified. Allowed values: all, week, today.';
    }

    return null;
}

/**
 * Validates score submission input array.
 *
 * @param array $input
 * @return string|null Error message string if invalid, or null if valid.
 */
function validateScoreSubmission(array $input): ?string {
    // Validate player_name if explicitly provided
    if (isset($input['player_name'])) {
        $playerError = validatePlayerName($input['player_name']);
        if ($playerError !== null) {
            return $playerError;
        }
    }

    // Validate game
    if (!isset($input['game'])) {
        return 'Game name is required and cannot be empty.';
    }
    $gameError = validateGameName($input['game']);
    if ($gameError !== null) {
        return $gameError;
    }

    // Validate score existence (do not use empty() because '0' or 0 are valid scores)
    if (!isset($input['score']) || (is_string($input['score']) && trim($input['score']) === '')) {
        return 'Score is required.';
    }

    // Reject booleans, floats, or arrays before integer validation
    if (is_bool($input['score']) || is_float($input['score']) || is_array($input['score'])) {
        return 'Score must be a valid integer.';
    }

    $scoreString = trim((string) $input['score']);

    // Check for negative numbers
    if ($scoreString !== '' && $scoreString[0] === '-') {
        return 'Score must be a non-negative integer (0 or greater).';
    }

    // Ensure raw string contains only digits
    if (!ctype_digit($scoreString)) {
        return 'Score must be a valid integer.';
    }

    // Strip leading zeros for safe length and range comparison
    $unpaddedScore = ltrim($scoreString, '0');
    if ($unpaddedScore === '') {
        $unpaddedScore = '0';
    }

    // Check signed 32-bit INT bounds (0 to 2,147,483,647) without integer overflow risks
    $maxScoreString = (string) MAX_SCORE;
    if (
        strlen($unpaddedScore) > strlen($maxScoreString) ||
        (strlen($unpaddedScore) === strlen($maxScoreString) && strcmp($unpaddedScore, $maxScoreString) > 0)
    ) {
        return 'Score is out of allowed range (must be between 0 and 2,147,483,647).';
    }

    return null;
}
