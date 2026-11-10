<?php
/**
 * Endpoint: GET /api/get-scores.php
 * 
 * Retrieves approved scores with full filtration (game, timeframe, limit, search, sort).
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

// 1. Validate Game parameter
$rawGame = $_GET['game'] ?? 'all';
$game = trim((string) $rawGame);
if ($game === '') {
    $game = 'all';
}

if ($game !== 'all') {
    $gameError = validateGameName($game);
    if ($gameError !== null) {
        sendJsonResponse(400, [
            'status'  => 'error',
            'message' => $gameError
        ]);
    }
}

// 2. Validate Limit parameter
$rawLimit = $_GET['limit'] ?? '10';
$limit = validateLimit($rawLimit);
if ($limit === null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => 'Invalid limit specified. Allowed: 10, 15, 25, 50, 100, all.'
    ]);
}

// 3. Validate Period parameter
$rawPeriod = $_GET['period'] ?? 'all';
$periodError = validatePeriod($rawPeriod);
if ($periodError !== null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => $periodError
    ]);
}
$period = strtolower(trim((string) $rawPeriod));
if ($period === '') {
    $period = 'all';
}

// 4. Validate Sort parameter
$rawSort = $_GET['sort'] ?? 'score_desc';
$sort = validateSort($rawSort);
if ($sort === null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => 'Invalid sort specified. Allowed: score_desc, score_asc, newest.'
    ]);
}

// 5. Search parameter
$search = isset($_GET['search']) ? trim((string) $_GET['search']) : '';
if (mb_strlen($search) > 100) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => 'Search term cannot exceed 100 characters.'
    ]);
}

// Build query
$whereClauses = ["status = 'approved'"];
$params = [];

if ($game !== 'all') {
    $whereClauses[] = 'game = :game';
    $params[':game'] = $game;
}

if ($period === 'today') {
    $whereClauses[] = 'created_at >= CURDATE()';
} elseif ($period === 'week') {
    $whereClauses[] = 'created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
}

if ($search !== '') {
    $whereClauses[] = 'player_name LIKE :search';
    $params[':search'] = '%' . $search . '%';
}

$orderBy = match ($sort) {
    'score_asc' => 'score ASC, created_at ASC',
    'newest'    => 'created_at DESC, score DESC',
    default     => 'score DESC, created_at ASC',
};

$whereSql = implode(' AND ', $whereClauses);
$sql = "SELECT id, user_id, game, player_name, score, created_at 
        FROM scores 
        WHERE {$whereSql} 
        ORDER BY {$orderBy} 
        LIMIT {$limit}";

try {
    $selectStatement = $pdo->prepare($sql);
    $selectStatement->execute($params);
    $scores = $selectStatement->fetchAll();

    $formattedScores = array_map(static function (array $row): array {
        return [
            'id'          => (int) $row['id'],
            'user_id'     => $row['user_id'] !== null ? (int) $row['user_id'] : null,
            'game'        => $row['game'],
            'player_name' => $row['player_name'],
            'score'       => (int) $row['score'],
            'created_at'  => $row['created_at'],
        ];
    }, $scores);

    sendJsonResponse(200, [
        'status'         => 'success',
        'filters'        => [
            'game'   => $game,
            'period' => $period,
            'limit'  => $rawLimit,
            'sort'   => $sort,
            'search' => $search,
        ],
        'total_returned' => count($formattedScores),
        'scores'         => $formattedScores,
    ]);
} catch (PDOException $e) {
    error_log('Database Select Error in get-scores.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to fetch scores.'
    ]);
}
