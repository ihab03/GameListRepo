<?php
/**
 * Endpoint: GET /api/get-chart-data.php
 * 
 * Aggregates daily score statistics (highest score, total submissions, average score)
 * for a given game (or all games) over a specified timeframe (7, 30, or 90 days).
 */

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/helpers.php';

// Method check: GET only
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(405, [
        'status'  => 'error',
        'message' => 'Method Not Allowed. Only GET requests are accepted.'
    ]);
}

// 1. Validate 'game' parameter
if (!isset($_GET['game']) || trim((string) $_GET['game']) === '') {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => 'Game parameter is required.'
    ]);
}

$rawGame = trim((string) $_GET['game']);
if (strtolower($rawGame) !== 'all') {
    $gameError = validateGameName($rawGame);
    if ($gameError !== null) {
        sendJsonResponse(400, [
            'status'  => 'error',
            'message' => $gameError
        ]);
    }
    $game = $rawGame;
    $isAllGames = false;
} else {
    $game = 'all';
    $isAllGames = true;
}

// 2. Validate 'days' parameter (7, 30, or 90; default 30)
$allowedDays = [7, 30, 90];
$rawDays = $_GET['days'] ?? 30;
$days = (int) $rawDays;
if (!in_array($days, $allowedDays, true)) {
    $days = 30;
}

try {
    if ($isAllGames) {
        $sql = "SELECT 
                    DATE(created_at) AS date_point, 
                    MAX(score) AS highest_score, 
                    COUNT(*) AS total_submissions, 
                    ROUND(AVG(score)) AS average_score 
                FROM scores 
                WHERE status = 'approved' 
                  AND created_at >= DATE_SUB(CURDATE(), INTERVAL {$days} DAY) 
                GROUP BY DATE(created_at) 
                ORDER BY date_point ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
    } else {
        $sql = "SELECT 
                    DATE(created_at) AS date_point, 
                    MAX(score) AS highest_score, 
                    COUNT(*) AS total_submissions, 
                    ROUND(AVG(score)) AS average_score 
                FROM scores 
                WHERE status = 'approved' 
                  AND game = :game 
                  AND created_at >= DATE_SUB(CURDATE(), INTERVAL {$days} DAY) 
                GROUP BY DATE(created_at) 
                ORDER BY date_point ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':game' => $game]);
    }

    $rawRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $formattedData = [];
    foreach ($rawRows as $row) {
        $formattedData[] = [
            'date_point'        => (string) $row['date_point'],
            'highest_score'     => (int) $row['highest_score'],
            'total_submissions' => (int) $row['total_submissions'],
            'average_score'     => (int) $row['average_score'],
        ];
    }

    sendJsonResponse(200, [
        'status' => 'success',
        'game'   => $game,
        'days'   => $days,
        'data'   => $formattedData,
    ]);
} catch (PDOException $e) {
    error_log('Database query error in get-chart-data.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to load chart analytics.'
    ]);
}

