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
    define('API_SECRET_KEY', 'wolves-secret-key-2026');
}

return [
    'host'           => DB_HOST,
    'name'           => DB_NAME,
    'user'           => DB_USER,
    'pass'           => DB_PASS,
    'charset'        => DB_CHARSET,
    'api_secret_key' => API_SECRET_KEY,
];

