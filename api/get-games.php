<?php
/**
 * Endpoint: GET /api/get-games.php
 * 
 * Retrieves all distinct game names available in the leaderboard.
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

try {
    $selectStatement = $pdo->prepare("SELECT DISTINCT game FROM scores WHERE status = 'approved' ORDER BY game ASC");
    $selectStatement->execute();
    $games = $selectStatement->fetchAll(PDO::FETCH_COLUMN);

    sendJsonResponse(200, [
        'status' => 'success',
        'games'  => $games,
    ]);
} catch (PDOException $e) {
    error_log('Database Select Error in get-games.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to fetch games.'
    ]);
}
