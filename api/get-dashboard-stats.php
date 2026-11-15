<?php
/**
 * Endpoint: GET /api/get-dashboard-stats.php
 * 
 * Aggregates high-level telemetry and KPI statistics for the studio dashboard.
 * If the requester is an administrator, returns the moderation audit log trail.
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

$currentUser = getCurrentUser();
$isAdmin = ($currentUser !== null && $currentUser['role'] === 'admin');

try {
    // 1. Total verified (approved) scores
    $stmtApproved = $pdo->query("SELECT COUNT(*) FROM scores WHERE status = 'approved'");
    $totalVerified = (int) $stmtApproved->fetchColumn();

    // 2. Active unique players with approved scores
    $stmtPlayers = $pdo->query("SELECT COUNT(DISTINCT player_name) FROM scores WHERE status = 'approved'");
    $activePlayers = (int) $stmtPlayers->fetchColumn();

    // 3. Pending verification scores count
    $stmtPending = $pdo->query("SELECT COUNT(*) FROM scores WHERE status = 'pending'");
    $pendingCount = (int) $stmtPending->fetchColumn();

    // 4. Most played game by approved count
    $stmtTopGame = $pdo->query("
        SELECT game, COUNT(*) AS cnt 
        FROM scores 
        WHERE status = 'approved' 
        GROUP BY game 
        ORDER BY cnt DESC 
        LIMIT 1
    ");
    $topGameRow = $stmtTopGame->fetch(PDO::FETCH_ASSOC);
    $mostPlayedGame = $topGameRow ? (string) $topGameRow['game'] : 'N/A';

    $response = [
        'status' => 'success',
        'stats'  => [
            'total_verified_scores' => $totalVerified,
            'active_players'        => $activePlayers,
            'pending_scores_count'  => $pendingCount,
            'most_played_game'      => $mostPlayedGame,
        ]
    ];

    // If admin, attach the latest 100 audit log rows
    if ($isAdmin) {
        $stmtAudit = $pdo->query("
            SELECT id, admin_id, admin_username, action, target_id, details, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 100
        ");
        $response['audit_logs'] = $stmtAudit->fetchAll(PDO::FETCH_ASSOC);
    }

    sendJsonResponse(200, $response);
} catch (PDOException $e) {
    error_log('Database error in get-dashboard-stats.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to load dashboard statistics.'
    ]);
}

