<?php
/**
 * Endpoint: GET /api/admin-pending-scores.php
 * 
 * Admin only: Retrieves moderation queues and summary statistics for scores.
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

// Enforce admin privileges
$admin = requireAdmin();

$rawStatus = $_GET['status'] ?? 'pending';
$allowedStatuses = ['pending', 'approved', 'rejected'];
$status = in_array(strtolower(trim((string) $rawStatus)), $allowedStatuses, true)
    ? strtolower(trim((string) $rawStatus))
    : 'pending';

$gameFilter = isset($_GET['game']) && trim((string) $_GET['game']) !== '' && trim((string) $_GET['game']) !== 'all'
    ? trim((string) $_GET['game'])
    : null;

try {
    // 1. Fetch queue items
    $query = "SELECT id, user_id, game, player_name, score, status, reviewed_by, reviewed_at, created_at 
              FROM scores 
              WHERE status = :status";
    $params = [':status' => $status];

    if ($gameFilter !== null) {
        $query .= " AND game = :game";
        $params[':game'] = $gameFilter;
    }

    $query .= " ORDER BY created_at DESC LIMIT 200";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $formattedScores = array_map(static function (array $row): array {
        return [
            'id'          => (int) $row['id'],
            'user_id'     => $row['user_id'] !== null ? (int) $row['user_id'] : null,
            'game'        => $row['game'],
            'player_name' => $row['player_name'],
            'score'       => (int) $row['score'],
            'status'      => $row['status'],
            'reviewed_by' => $row['reviewed_by'] !== null ? (int) $row['reviewed_by'] : null,
            'reviewed_at' => $row['reviewed_at'],
            'created_at'  => $row['created_at'],
        ];
    }, $rows);

    // 2. Fetch summary count aggregation
    $countStmt = $pdo->prepare("SELECT status, COUNT(*) AS total FROM scores GROUP BY status");
    $countStmt->execute();
    $rawCounts = $countStmt->fetchAll();

    $counts = [
        'pending'  => 0,
        'approved' => 0,
        'rejected' => 0,
    ];

    foreach ($rawCounts as $c) {
        if (isset($counts[$c['status']])) {
            $counts[$c['status']] = (int) $c['total'];
        }
    }

    sendJsonResponse(200, [
        'status'  => 'success',
        'filter'  => [
            'status' => $status,
            'game'   => $gameFilter ?? 'all',
        ],
        'counts'  => $counts,
        'scores'  => $formattedScores,
    ]);
} catch (PDOException $e) {
    error_log('Database Error in admin-pending-scores.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to load moderation queue.'
    ]);
}

