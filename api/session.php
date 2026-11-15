<?php
/**
 * Endpoint: GET /api/session.php
 * 
 * Returns the current authentication and session status, including
 * personal telemetry stats and recent submissions when logged in.
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

startSecureSession();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(405, [
        'status'  => 'error',
        'message' => 'Method Not Allowed. Only GET requests are accepted.'
    ]);
}

$user = getCurrentUser();

if ($user !== null) {
    require_once __DIR__ . '/../db.php';
    $pdo = getDbConnection();

    // Query personal telemetry statistics
    $statsStmt = $pdo->prepare('
        SELECT 
            COUNT(CASE WHEN status = "approved" THEN 1 END) AS approved_count,
            COUNT(CASE WHEN status = "pending" THEN 1 END) AS pending_count,
            COUNT(CASE WHEN status = "rejected" THEN 1 END) AS rejected_count,
            COALESCE(MAX(CASE WHEN status = "approved" THEN score END), 0) AS best_score
        FROM scores
        WHERE user_id = :uid OR player_name = :uname
    ');
    $statsStmt->execute([
        ':uid'   => $user['id'],
        ':uname' => $user['username']
    ]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: [
        'approved_count' => 0,
        'pending_count'  => 0,
        'rejected_count' => 0,
        'best_score'     => 0
    ];

    // Query last 15 recent submissions
    $recentStmt = $pdo->prepare('
        SELECT id, game, score, status, created_at
        FROM scores
        WHERE user_id = :uid OR player_name = :uname
        ORDER BY created_at DESC
        LIMIT 15
    ');
    $recentStmt->execute([
        ':uid'   => $user['id'],
        ':uname' => $user['username']
    ]);
    $recentSubmissions = $recentStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $user['stats'] = [
        'approved_count' => (int) $stats['approved_count'],
        'pending_count'  => (int) $stats['pending_count'],
        'rejected_count' => (int) $stats['rejected_count'],
        'best_score'     => (int) $stats['best_score']
    ];

    $user['recent_submissions'] = array_map(function($row) {
        return [
            'id'         => (int) $row['id'],
            'game'       => (string) $row['game'],
            'score'      => (int) $row['score'],
            'status'     => (string) $row['status'],
            'created_at' => (string) $row['created_at']
        ];
    }, $recentSubmissions);
}

sendJsonResponse(200, [
    'status'             => 'success',
    'authenticated'      => ($user !== null),
    'user'               => $user,
    'stats'              => $user ? $user['stats'] : null,
    'recent_submissions' => $user ? $user['recent_submissions'] : []
]);
