<?php
/**
 * Endpoint: POST /api/login.php
 * 
 * Authenticates user credentials and creates a secure session.
 */

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(405, [
        'status'  => 'error',
        'message' => 'Method Not Allowed. Only POST requests are accepted.'
    ]);
}

$input = getRequestData();
$username = trim((string) ($input['username'] ?? ''));
$password = (string) ($input['password'] ?? '');

$validationError = validateCredentials($username, $password, false);
if ($validationError !== null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => $validationError
    ]);
}

try {
    $stmt = $pdo->prepare('SELECT id, username, password_hash, role FROM users WHERE username = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    $userRow = $stmt->fetch();

    if (!$userRow || !password_verify($password, $userRow['password_hash'])) {
        sendJsonResponse(401, [
            'status'  => 'error',
            'message' => 'Invalid username or password.'
        ]);
    }

    startSecureSession();
    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id'       => (int) $userRow['id'],
        'username' => (string) $userRow['username'],
        'role'     => (string) $userRow['role'],
    ];

    sendJsonResponse(200, [
        'status'  => 'success',
        'message' => 'Login successful.',
        'user'    => $_SESSION['user']
    ]);
} catch (PDOException $e) {
    error_log('Database Error in login.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Login failed due to a server error.'
    ]);
}

