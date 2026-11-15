<?php
/**
 * Validation Core
 * 
 * Provides strict input sanitation, boundary checking, and parameter validation.
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config.php';

if (!defined('MIN_SCORE')) {
    define('MIN_SCORE', 0);
}
if (!defined('MAX_SCORE')) {
    define('MAX_SCORE', 2147483647);
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
    $default = defined('DEFAULT_LIMIT') ? (int) DEFAULT_LIMIT : 10;
    if ($limitRaw === null || $limitRaw === '') {
        return $default;
    }

    $limitStr = strtolower(trim((string) $limitRaw));
    if ($limitStr === 'all') {
        return defined('MAX_EXPORT_LIMIT') ? (int) MAX_EXPORT_LIMIT : 500;
    }

    $allowedList = defined('ALLOWED_LIMITS') ? ALLOWED_LIMITS : [10, 15, 25, 50, 100, 'all'];
    if (!is_numeric($limitStr)) {
        return null;
    }

    $val = (int) $limitStr;
    if (in_array($val, $allowedList, true) && $val > 0) {
        return $val;
    }

    return null;
}

/**
 * Validates leaderboard sort parameter.
 *
 * @param mixed $sortRaw
 * @return string|null Valid sort string or null if invalid.
 */
function validateSort($sortRaw): ?string {
    if ($sortRaw === null || $sortRaw === '') {
        return 'score_desc';
    }

    $normalized = strtolower(trim((string) $sortRaw));
    $allowedSorts = ['score_desc', 'score_asc', 'newest'];

    return in_array($normalized, $allowedSorts, true) ? $normalized : null;
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
        return null;
    }

    if (!is_string($period)) {
        return 'Invalid period specified. Allowed values: all, week, today.';
    }

    $normalized = strtolower(trim($period));
    $allowedMap = defined('ALLOWED_PERIODS') ? ALLOWED_PERIODS : ['all' => 'All-Time', 'week' => 'This Week', 'today' => 'Today'];
    $allowedKeys = array_keys($allowedMap);

    if (!in_array($normalized, $allowedKeys, true)) {
        return 'Invalid period specified. Allowed values: ' . implode(', ', $allowedKeys) . '.';
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
    if (isset($input['player_name'])) {
        $playerError = validatePlayerName($input['player_name']);
        if ($playerError !== null) {
            return $playerError;
        }
    }

    if (!isset($input['game'])) {
        return 'Game name is required and cannot be empty.';
    }
    $gameError = validateGameName($input['game']);
    if ($gameError !== null) {
        return $gameError;
    }

    if (!isset($input['score']) || (is_string($input['score']) && trim($input['score']) === '')) {
        return 'Score is required.';
    }

    if (is_bool($input['score']) || is_float($input['score']) || is_array($input['score'])) {
        return 'Score must be a valid integer.';
    }

    $scoreString = trim((string) $input['score']);

    if ($scoreString !== '' && $scoreString[0] === '-') {
        return 'Score must be a non-negative integer (0 or greater).';
    }

    if (!ctype_digit($scoreString)) {
        return 'Score must be a valid integer.';
    }

    $unpaddedScore = ltrim($scoreString, '0');
    if ($unpaddedScore === '') {
        $unpaddedScore = '0';
    }

    $maxScoreString = (string) MAX_SCORE;
    if (
        strlen($unpaddedScore) > strlen($maxScoreString) ||
        (strlen($unpaddedScore) === strlen($maxScoreString) && strcmp($unpaddedScore, $maxScoreString) > 0)
    ) {
        return 'Score is out of allowed range (must be between 0 and 2,147,483,647).';
    }

    return null;
}

