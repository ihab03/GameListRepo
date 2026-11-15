<?php
/**
 * Endpoint: GET /api/get-player-profile.php
 * 
 * Returns a comprehensive player profile with overall statistics, per-game personal bests
 * and rankings (computed via MySQL 8 window functions without loops), and recent verified submissions.
 */

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(405, [
        'status'  => 'error',
        'message' => 'Method Not Allowed. Only GET requests are accepted.'
    ]);
}

$rawPlayer = trim((string) ($_GET['player_name'] ?? ''));
if ($rawPlayer === '') {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => 'Player name parameter (player_name) is required.'
    ]);
}
if (mb_strlen($rawPlayer) > 100) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => 'Player name cannot exceed 100 characters.'
    ]);
}

try {
    // 1. Overall player summary stats
    $summaryStmt = $pdo->prepare("
        SELECT 
            COUNT(*) AS total_approved_submissions,
            COALESCE(MAX(score), 0) AS highest_score_overall,
            COALESCE(MIN(created_at), '') AS first_seen,
            COALESCE(MAX(created_at), '') AS last_seen
        FROM scores
        WHERE player_name = :player_name AND status = 'approved'
    ");
    $summaryStmt->execute([':player_name' => $rawPlayer]);
    $summaryRow = $summaryStmt->fetch(PDO::FETCH_ASSOC);

    $totalSubmissions = (int) ($summaryRow['total_approved_submissions'] ?? 0);
    if ($totalSubmissions === 0) {
        sendJsonResponse(404, [
            'status'      => 'error',
            'message'     => "No approved scores found for player '{$rawPlayer}'.",
            'player_name' => $rawPlayer,
        ]);
    }

    $summary = [
        'total_approved_submissions' => $totalSubmissions,
        'highest_score_overall'      => (int) $summaryRow['highest_score_overall'],
        'first_seen'                 => (string) $summaryRow['first_seen'],
        'last_seen'                  => (string) $summaryRow['last_seen'],
    ];

    // 2. Per-game personal bests and ranks (computed efficiently via single window query, NO loops)
    $gamesStmt = $pdo->prepare("
        WITH RankedBests AS (
            SELECT 
                game,
                player_name,
                MAX(score) AS best_score,
                COUNT(*) AS submissions_count,
                DENSE_RANK() OVER (PARTITION BY game ORDER BY MAX(score) DESC) AS `rank`
            FROM scores
            WHERE status = 'approved'
            GROUP BY game, player_name
        )
        SELECT game, best_score, submissions_count, `rank`
        FROM RankedBests
        WHERE player_name = :player_name
        ORDER BY best_score DESC
    ");
    $gamesStmt->execute([':player_name' => $rawPlayer]);
    $rawGameRows = $gamesStmt->fetchAll(PDO::FETCH_ASSOC);

    $perGame = array_map(function ($row) {
        return [
            'game'              => (string) $row['game'],
            'best_score'        => (int) $row['best_score'],
            'submissions_count' => (int) $row['submissions_count'],
            'rank'              => (int) $row['rank'],
        ];
    }, $rawGameRows);

    // 3. Last 10 approved score submissions
    $recentStmt = $pdo->prepare("
        SELECT id, game, score, created_at
        FROM scores
        WHERE player_name = :player_name AND status = 'approved'
        ORDER BY created_at DESC
        LIMIT 10
    ");
    $recentStmt->execute([':player_name' => $rawPlayer]);
    $rawRecent = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    $recentScores = array_map(function ($row) {
        return [
            'id'         => (int) $row['id'],
            'game'       => (string) $row['game'],
            'score'      => (int) $row['score'],
            'created_at' => (string) $row['created_at'],
        ];
    }, $rawRecent);

    sendJsonResponse(200, [
        'status'        => 'success',
        'player_name'   => $rawPlayer,
        'summary'       => $summary,
        'games'         => $perGame,
        'recent_scores' => $recentScores,
    ]);
} catch (PDOException $e) {
    error_log('Database Error in get-player-profile.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to load player profile.'
    ]);
}

