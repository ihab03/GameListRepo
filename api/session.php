<?php
/**
 * Endpoint: GET /api/session.php
 * 
 * Returns the current authentication and session status.
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(405, [
        'status'  => 'error',
        'message' => 'Method Not Allowed. Only GET requests are accepted.'
    ]);
}

$user = getCurrentUser();

sendJsonResponse(200, [
    'status'        => 'success',
    'authenticated' => ($user !== null),
    'user'          => $user,
]);

