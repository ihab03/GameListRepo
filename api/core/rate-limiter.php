<?php
/**
 * Rate Limiter Core
 * 
 * Enforces database-backed IP/Endpoint sliding window rate limiting.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/response.php';

/**
 * Enforces an IP/Session request rate limit on sensitive endpoints.
 * Emits HTTP 429 Too Many Requests if the limit is exceeded.
 *
 * @param string $endpoint Name of the endpoint for rate limiting tracking
 * @param int|null $maxAttempts Maximum allowable requests within the window
 * @param int|null $windowSeconds Window size in seconds (default 60 seconds)
 * @return void
 */
function enforceRateLimit(string $endpoint = 'post-score', ?int $maxAttempts = null, ?int $windowSeconds = null): void {
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $now = time();

    $maxAttempts = $maxAttempts ?? (defined('RATE_LIMIT_MAX_ATTEMPTS') ? (int) RATE_LIMIT_MAX_ATTEMPTS : 10);
    $windowSeconds = $windowSeconds ?? (defined('RATE_LIMIT_WINDOW_SECONDS') ? (int) RATE_LIMIT_WINDOW_SECONDS : 60);

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
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare('DELETE FROM rate_limits WHERE ip_address = :ip AND endpoint = :endpoint');
        $stmt->execute([':ip' => $ip, ':endpoint' => $endpoint]);
    } catch (\Throwable $e) {
        error_log('Reset rate limit error: ' . $e->getMessage());
    }
}

