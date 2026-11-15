<?php
/**
 * Endpoint: GET /api/get-config.php
 * 
 * Exposes dynamic studio configuration to the client to eliminate hardcoded values.
 * Returns public parameters for all users, plus admin secrets/metadata for authenticated administrators.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/helpers.php';

// Ensure session is started at the very top before user extraction
startSecureSession();

requireMethod('GET');

// Ensure responses are never cached by browsers or proxies
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$currentUser = getCurrentUser();

$publicConfig = [
    'app_title'          => defined('APP_TITLE') ? APP_TITLE : 'Hyper Arena',
    'min_score'          => defined('MIN_SCORE') ? MIN_SCORE : 0,
    'max_score'          => defined('MAX_SCORE') ? MAX_SCORE : 2147483647,
    'default_limit'      => defined('DEFAULT_LIMIT') ? DEFAULT_LIMIT : 10,
    'allowed_limits'     => defined('ALLOWED_LIMITS') ? ALLOWED_LIMITS : [10, 15, 25, 50, 100, 'all'],
    'max_export_limit'   => defined('MAX_EXPORT_LIMIT') ? MAX_EXPORT_LIMIT : 500,
    'allowed_periods'    => defined('ALLOWED_PERIODS') ? ALLOWED_PERIODS : [
        'all'   => 'All-Time',
        'week'  => 'This Week',
        'today' => 'Today'
    ],
    'rate_limit_max'     => defined('RATE_LIMIT_MAX_ATTEMPTS') ? RATE_LIMIT_MAX_ATTEMPTS : 10,
    'rate_limit_window'  => defined('RATE_LIMIT_WINDOW_SECONDS') ? RATE_LIMIT_WINDOW_SECONDS : 60,
];

$response = [
    'status' => 'success',
    'config' => $publicConfig,
];

$isAdmin = ($currentUser !== null && isset($currentUser['role']) && strtolower(trim((string) $currentUser['role'])) === 'admin');

if ($isAdmin) {
    $response['admin_config'] = [
        'api_secret_key'    => defined('API_SECRET_KEY') ? API_SECRET_KEY : '',
        'rate_limit_max'    => defined('RATE_LIMIT_MAX_ATTEMPTS') ? RATE_LIMIT_MAX_ATTEMPTS : 10,
        'rate_limit_window' => defined('RATE_LIMIT_WINDOW_SECONDS') ? RATE_LIMIT_WINDOW_SECONDS : 60,
        'endpoints'         => [
            'config'          => 'api/get-config.php',
            'session'         => 'api/session.php',
            'login'           => 'api/login.php',
            'logout'          => 'api/logout.php',
            'register'        => 'api/register.php',
            'scores'          => 'api/get-scores.php',
            'post_score'      => 'api/post-score.php',
            'rank'            => 'api/get-rank.php',
            'games'           => 'api/get-games.php',
            'chart_data'      => 'api/get-chart-data.php',
            'dashboard_stats' => 'api/get-dashboard-stats.php',
            'player_profile'  => 'api/get-player-profile.php',
            'admin_pending'   => 'api/admin-pending-scores.php',
            'admin_verify'    => 'api/admin-verify-score.php',
            'admin_games'     => 'api/admin-manage-games.php',
        ]
    ];
}

sendJsonResponse(200, $response);
