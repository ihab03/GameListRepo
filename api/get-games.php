<?php
/**
 * Endpoint: GET /api/get-games.php
 * 
 * Retrieves games from the studio games registry with approved scores metrics.
 * By default returns active games; supports ?include_inactive=1 for administrators.
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
$includeInactive = $isAdmin && isset($_GET['include_inactive']) && $_GET['include_inactive'] === '1';

try {
    $whereClause = $includeInactive ? '' : 'WHERE g.is_active = 1';

    $sql = "
        SELECT 
            g.id,
            g.slug,
            g.title,
            g.genre,
            g.is_active,
            g.created_at,
            COUNT(s.id) AS approved_scores_count,
            COALESCE(MAX(s.score), 0) AS highest_score
        FROM games g
        LEFT JOIN scores s ON s.game = g.title AND s.status = 'approved'
        {$whereClause}
        GROUP BY g.id, g.slug, g.title, g.genre, g.is_active, g.created_at
        ORDER BY g.title ASC
    ";

    $stmt = $pdo->query($sql);
    $rawGames = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $formattedGames = array_map(function ($row) {
        return [
            'id'                    => (int) $row['id'],
            'slug'                  => (string) $row['slug'],
            'title'                 => (string) $row['title'],
            'genre'                 => (string) $row['genre'],
            'is_active'             => (int) $row['is_active'],
            'created_at'            => (string) $row['created_at'],
            'approved_scores_count' => (int) $row['approved_scores_count'],
            'highest_score'         => (int) $row['highest_score'],
        ];
    }, $rawGames);

    // Keep 'games' array of titles for 100% backward compatibility
    $titles = array_column($formattedGames, 'title');

    sendJsonResponse(200, [
        'status' => 'success',
        'games'  => $titles,
        'data'   => $formattedGames,
    ]);
} catch (PDOException $e) {
    error_log('Database Select Error in get-games.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to fetch games.'
    ]);
}
