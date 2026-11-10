<?php
/**
 * Endpoint: POST /api/post-score.php
 * 
 * Authenticated submission: Submits a new score for a game.
 * Supports session-based authentication (player/admin) or secret API key authorization (X-API-Key).
 * Enforces IP/Session rate limiting (10 requests/minute).
 */

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/helpers.php';

// Allow POST method only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(405, [
        'status'  => 'error',
        'message' => 'Method Not Allowed. Only POST requests are accepted.'
    ]);
}

// 1. Enforce IP/Session Rate Limiting (max 10 submissions per 60 seconds)
enforceRateLimit('post-score', 10, 60);

// 2. Authentication Check (Session or Secret API Key)
$inputData = getRequestData();
$currentUser = getCurrentUser();
$isApiKeyValid = validateApiKey($inputData['api_key'] ?? null);

if ($currentUser === null && !$isApiKeyValid) {
    sendJsonResponse(401, [
        'status'  => 'error',
        'message' => 'Authentication required. Please log in or provide a valid X-API-Key header.'
    ]);
}

// 3. Resolve identity, player name, and initial score status
if ($isApiKeyValid) {
    // Direct server-to-server or trusted game client submission
    $userId = null;
    $status = 'approved'; // Trusted client keys are pre-approved

    if (isset($inputData['player_name']) && trim((string) $inputData['player_name']) !== '') {
        $playerName = trim((string) $inputData['player_name']);
    } else {
        $playerName = 'GameClient';
    }
    $inputData['player_name'] = $playerName;
} else {
    // Session authenticated user
    $userId = $currentUser['id'];
    $status = 'pending';

    // If admin and a custom player_name is supplied, allow it; otherwise lock to authenticated username
    if ($currentUser['role'] === 'admin' && isset($inputData['player_name']) && trim((string) $inputData['player_name']) !== '') {
        $playerName = trim((string) $inputData['player_name']);
    } else {
        $playerName = $currentUser['username'];
        $inputData['player_name'] = $playerName;
    }
}

// 4. Validate input
$validationError = validateScoreSubmission($inputData);
if ($validationError !== null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => $validationError
    ]);
}

$game = trim((string) $inputData['game']);
$score = (int) $inputData['score'];

try {
    $reviewedAt = ($status === 'approved') ? date('Y-m-d H:i:s') : null;
    $reviewedBy = null;

    $insertStatement = $pdo->prepare(
        'INSERT INTO scores (user_id, game, player_name, score, status, reviewed_by, reviewed_at) 
         VALUES (:user_id, :game, :player_name, :score, :status, :reviewed_by, :reviewed_at)'
    );
    $insertStatement->execute([
        ':user_id'     => $userId,
        ':game'        => $game,
        ':player_name' => $playerName,
        ':score'       => $score,
        ':status'      => $status,
        ':reviewed_by' => $reviewedBy,
        ':reviewed_at' => $reviewedAt,
    ]);

    $lastInsertId = (int) $pdo->lastInsertId();

    $responseMessage = ($status === 'approved')
        ? 'Score submitted and approved via API key successfully.'
        : 'Score submitted successfully and sent to the admin for verification.';

    sendJsonResponse(201, [
        'status'  => 'success',
        'message' => $responseMessage,
        'data'    => [
            'id'          => $lastInsertId,
            'user_id'     => $userId,
            'game'        => $game,
            'player_name' => $playerName,
            'score'       => $score,
            'status'      => $status,
        ]
    ]);
} catch (PDOException $e) {
    $sqlState = (string) ($e->errorInfo[0] ?? $e->getCode());
    if ($sqlState === '22003' || str_contains($e->getMessage(), '22003') || str_contains($e->getMessage(), 'Out of range')) {
        sendJsonResponse(400, [
            'status'  => 'error',
            'message' => 'Score is out of allowed range (must be between 0 and 2,147,483,647).'
        ]);
    }

    error_log('Database Insert Error in post-score.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to save score.'
    ]);
}
