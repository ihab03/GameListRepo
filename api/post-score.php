<?php
/**
 * Endpoint: POST /api/post-score.php
 * 
 * Submits a new score for a specific game and player.
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

$inputData = getRequestData();

// Validate input
$validationError = validateScoreSubmission($inputData);
if ($validationError !== null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => $validationError
    ]);
}

$game = trim((string) $inputData['game']);
$playerName = trim((string) $inputData['player_name']);
$score = (int) $inputData['score'];

try {
    $insertStatement = $pdo->prepare('INSERT INTO scores (game, player_name, score) VALUES (:game, :player_name, :score)');
    $insertStatement->execute([
        ':game'        => $game,
        ':player_name' => $playerName,
        ':score'       => $score,
    ]);

    $lastInsertId = (int) $pdo->lastInsertId();

    sendJsonResponse(201, [
        'status'  => 'success',
        'message' => 'Score saved successfully.',
        'data'    => [
            'id'          => $lastInsertId,
            'game'        => $game,
            'player_name' => $playerName,
            'score'       => $score,
        ]
    ]);
} catch (PDOException $e) {
    error_log('Database Insert Error in post-score.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to save score.'
    ]);
}

