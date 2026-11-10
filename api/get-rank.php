<?php
/**
 * Endpoint: GET /api/get-rank.php
 * 
 * Looks up a specific player's highest approved score, rank, and attempts for a game and period.
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
        'message' => $gameError
    ]);
}

$rawPlayer = $_GET['player_name'] ?? '';
$playerError = validatePlayerName($rawPlayer);
if ($playerError !== null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => $playerError
    ]);
}

$rawPeriod = $_GET['period'] ?? 'all';
$periodError = validatePeriod($rawPeriod);
if ($periodError !== null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => $periodError
    ]);
}

$game = trim((string) $rawGame);
$playerName = trim((string) $rawPlayer);
$period = strtolower(trim((string) $rawPeriod));
if ($period === '') {
    $period = 'all';
}

// Index-friendly date filtering
$dateCondition = '';
if ($period === 'today') {
    $dateCondition = 'AND created_at >= CURDATE()';
} elseif ($period === 'week') {
    $dateCondition = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
}

try {
    // Query 1: Find highest approved score and submission count for this player
    $bestStmt = $pdo->prepare(
        "SELECT MAX(score) AS best_score, COUNT(*) AS attempts 
         FROM scores 
         WHERE status = 'approved' AND game = :game AND player_name = :player_name {$dateCondition}"
    );
    $bestStmt->execute([
        ':game'        => $game,
        ':player_name' => $playerName,
    ]);
    $playerData = $bestStmt->fetch();

    if (!$playerData || $playerData['best_score'] === null || (int) $playerData['attempts'] === 0) {
        sendJsonResponse(200, [
            'status'      => 'success',
            'found'       => false,
            'game'        => $game,
            'period'      => $period,
            'player_name' => $playerName,
            'message'     => 'No approved scores found for this player in the selected game and period.'
        ]);
    }

    $bestScore = (int) $playerData['best_score'];
    $attempts = (int) $playerData['attempts'];

    // Query 2: Compute player's rank relative to all approved scores in the same game and period
    $rankStmt = $pdo->prepare(
        "SELECT COUNT(*) + 1 AS player_rank 
         FROM scores 
         WHERE status = 'approved' AND game = :game {$dateCondition} AND score > :best_score"
    );
    $rankStmt->execute([
        ':game'       => $game,
        ':best_score' => $bestScore,
    ]);
    $rank = (int) $rankStmt->fetchColumn();

    sendJsonResponse(200, [
        'status'      => 'success',
        'found'       => true,
        'game'        => $game,
        'period'      => $period,
        'player_name' => $playerName,
        'best_score'  => $bestScore,
        'rank'        => $rank,
        'attempts'    => $attempts,
    ]);
} catch (PDOException $e) {
    error_log('Database Error in get-rank.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to calculate player rank.'
    ]);
}
