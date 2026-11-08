<?php
/**
 * Shared API Helpers
 * 
 * Provides centralized response formatting, request parsing, and input validation.
 */

declare(strict_types=1);

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
 * Validates score submission input array.
 *
 * @param array $input
 * @return string|null Error message string if invalid, or null if valid.
 */
function validateScoreSubmission(array $input): ?string {
    // Validate player_name
    if (!isset($input['player_name']) || !is_string($input['player_name']) || trim($input['player_name']) === '') {
        return 'Player name is required and cannot be empty.';
    }

    $trimmedPlayerName = trim($input['player_name']);
    if (mb_strlen($trimmedPlayerName) > 100) {
        return 'Player name must not exceed 100 characters.';
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

    // Reject booleans or arrays before integer validation
    if (is_bool($input['score']) || is_array($input['score'])) {
        return 'Score must be a valid integer.';
    }

    // Validate integer format
    if (filter_var($input['score'], FILTER_VALIDATE_INT) === false) {
        return 'Score must be a valid integer.';
    }

    // Validate non-negative score
    $numericScore = (int) $input['score'];
    if ($numericScore < 0) {
        return 'Score must be a non-negative integer (0 or greater).';
    }

    return null;
}

