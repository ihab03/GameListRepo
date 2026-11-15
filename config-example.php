<?php
/**
 * Database Configuration Template
 * 
 * Copy this file to config.php and update with your local database credentials.
 * For default XAMPP installations, the password is empty ("").
 */

if (!defined('DB_HOST')) {
    define('DB_HOST', '127.0.0.1');
}
if (!defined('DB_NAME')) {
    define('DB_NAME', 'game_leaderboard');
}
if (!defined('DB_USER')) {
    define('DB_USER', 'root');
}
if (!defined('DB_PASS')) {
    define('DB_PASS', '');
}
if (!defined('DB_CHARSET')) {
    define('DB_CHARSET', 'utf8mb4');
}
if (!defined('API_SECRET_KEY')) {
    define('API_SECRET_KEY', 'hyper-arena-secret-key-2026');
}

// Studio Application Constants (Zero Hardcoded Values)
if (!defined('APP_TITLE')) {
    define('APP_TITLE', 'Hyper Arena');
}
if (!defined('MIN_SCORE')) {
    define('MIN_SCORE', 0);
}
if (!defined('MAX_SCORE')) {
    define('MAX_SCORE', 2147483647);
}
if (!defined('DEFAULT_LIMIT')) {
    define('DEFAULT_LIMIT', 10);
}
if (!defined('ALLOWED_LIMITS')) {
    define('ALLOWED_LIMITS', [10, 15, 25, 50, 100, 250, 'all']);
}
if (!defined('MAX_EXPORT_LIMIT')) {
    define('MAX_EXPORT_LIMIT', 2000);
}
if (!defined('ALLOWED_PERIODS')) {
    define('ALLOWED_PERIODS', [
        'all'   => 'All-Time',
        'week'  => 'This Week',
        'today' => 'Today',
    ]);
}
if (!defined('RATE_LIMIT_MAX_ATTEMPTS')) {
    define('RATE_LIMIT_MAX_ATTEMPTS', 10);
}
if (!defined('RATE_LIMIT_WINDOW_SECONDS')) {
    define('RATE_LIMIT_WINDOW_SECONDS', 60);
}

return [
    'host'                      => DB_HOST,
    'name'                      => DB_NAME,
    'user'                      => DB_USER,
    'pass'                      => DB_PASS,
    'charset'                   => DB_CHARSET,
    'api_secret_key'            => API_SECRET_KEY,
    'app_title'                 => APP_TITLE,
    'min_score'                 => MIN_SCORE,
    'max_score'                 => MAX_SCORE,
    'default_limit'             => DEFAULT_LIMIT,
    'allowed_limits'            => ALLOWED_LIMITS,
    'max_export_limit'          => MAX_EXPORT_LIMIT,
    'allowed_periods'           => ALLOWED_PERIODS,
    'rate_limit_max_attempts'   => RATE_LIMIT_MAX_ATTEMPTS,
    'rate_limit_window_seconds' => RATE_LIMIT_WINDOW_SECONDS,
];

