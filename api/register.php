<?php
/**
 * Endpoint: POST /api/register.php
 * 
 * Registers a new player account and initializes user session.
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

$validationError = validateCredentials($username, $password, true);
if ($validationError !== null) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => $validationError
    ]);
}

try {
    // Check if username already exists
    $checkStmt = $pdo->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');
    $checkStmt->execute([':username' => $username]);
    if ($checkStmt->fetch()) {
        sendJsonResponse(409, [
            'status'  => 'error',
            'message' => 'Username is already taken. Please choose another.'
        ]);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $insertStmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (:username, :password_hash, :role)');
    $insertStmt->execute([
        ':username'      => $username,
        ':password_hash' => $passwordHash,
        ':role'          => 'player',
    ]);

    $userId = (int) $pdo->lastInsertId();

    startSecureSession();
    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id'       => $userId,
        'username' => $username,
        'role'     => 'player',
    ];

    sendJsonResponse(201, [
        'status'  => 'success',
        'message' => 'Account created successfully.',
        'user'    => $_SESSION['user']
    ]);
} catch (PDOException $e) {
    error_log('Database Error in register.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Registration failed due to a server error.'
    ]);
}

