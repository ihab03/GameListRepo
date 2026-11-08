<?php
/**
 * Endpoint: GET /api/get-scores.php
 * 
 * Retrieves the Top 10 scores for a specified game.
 */

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/helpers.php';

// Allow GET method only
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(405, [
        'status'  => 'error',
        'message' => 'Method Not Allowed. Only GET requests are accepted.'
    ]);
}

$rawGame = $_GET['game'] ?? '';
$gameError = validateGameName($rawGame);

if ($gameError !== null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => 'Please provide a valid game name.'
    ]);
}

$game = trim((string) $rawGame);

try {
    $selectStatement = $pdo->prepare(
        'SELECT id, player_name, score, created_at 
         FROM scores 
         WHERE game = :game 
         ORDER BY score DESC, created_at ASC 
         LIMIT 10'
    );
    $selectStatement->execute([':game' => $game]);
    $scores = $selectStatement->fetchAll();

    // Ensure strict typing in JSON output
    $formattedScores = array_map(static function (array $row): array {
        return [
            'id'          => (int) $row['id'],
            'player_name' => $row['player_name'],
            'score'       => (int) $row['score'],
            'created_at'  => $row['created_at'],
        ];
    }, $scores);

    sendJsonResponse(200, [
        'status' => 'success',
        'game'   => $game,
        'scores' => $formattedScores,
    ]);
} catch (PDOException $e) {
    error_log('Database Select Error in get-scores.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to fetch scores.'
    ]);
}

