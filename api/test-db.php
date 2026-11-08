<?php
/**
 * Verification Endpoint for Database Connection and Schema
 * 
 * Verifies that the PDO connection is functional, queries the scores table,
 * and returns summary statistics in JSON format.
 */

declare(strict_types=1);

require_once __DIR__ . '/../db.php';

try {
    // 1. Prepared statement to count total rows in scores
    $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM `scores`');
    $countStmt->execute();
    $totalScores = (int) $countStmt->fetchColumn();

    // 2. Prepared statement to fetch distinct games
    $gamesStmt = $pdo->prepare('SELECT DISTINCT `game` FROM `scores` ORDER BY `game` ASC');
    $gamesStmt->execute();
    $games = $gamesStmt->fetchAll(PDO::FETCH_COLUMN);

    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status'       => 'ok',
        'total_scores' => $totalScores,
        'games'        => $games,
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    error_log('Query Error in test-db.php: ' . $e->getMessage());

    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status'  => 'error',
        'message' => 'Failed to query database'
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

