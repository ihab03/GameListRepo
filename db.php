<?php
/**
 * Database Connection Layer (PDO)
 * 
 * Provides a single shared PDO instance and helper function for database operations.
 */

require_once __DIR__ . '/config.php';

/**
 * Returns the singleton PDO database connection instance.
 *
 * @return PDO
 */
function getDbConnection(): PDO {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $host = defined('DB_HOST') ? DB_HOST : '127.0.0.1';
    $name = defined('DB_NAME') ? DB_NAME : 'game_leaderboard';
    $user = defined('DB_USER') ? DB_USER : 'root';
    $pass = defined('DB_PASS') ? DB_PASS : 'ihab135798642@';
    $charset = defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4';

    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
        return $pdo;
    } catch (PDOException $e) {
        // Log sensitive error details to server log, never leak to client
        error_log('Database Connection Error: ' . $e->getMessage());

        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed'
        ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        exit;
    }
}

// Global instance exposed for direct require_once usage
$pdo = getDbConnection();

