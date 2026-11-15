<?php
/**
 * Response and Request Helpers
 * 
 * Centralizes JSON response emission, HTTP method guards, and payload extraction.
 */

declare(strict_types=1);

/**
 * Sends a structured JSON response and terminates script execution.
 *
 * @param int $statusCode HTTP response status code
 * @param array $data Data payload to serialize as JSON
 * @return void
 */
function sendJsonResponse(int $statusCode, array $data): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Enforces that the incoming request uses the expected HTTP method.
 * Emits HTTP 405 Method Not Allowed and terminates if it does not match.
 *
 * @param string $method Expected HTTP method (e.g., 'GET', 'POST')
 * @return void
 */
function requireMethod(string $method): void {
    if (strcasecmp($_SERVER['REQUEST_METHOD'] ?? '', $method) !== 0) {
        sendJsonResponse(405, [
            'status'  => 'error',
            'message' => "Method Not Allowed. Only {$method} requests are accepted."
        ]);
    }
}

/**
 * Extracts request data, supporting both JSON payload and $_POST form data.
 *
 * @return array
 */
function getRequestData(): array {
    $rawInput = file_get_contents('php://input');

    if (!empty($rawInput)) {
        $decoded = json_decode($rawInput, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return is_array($_POST) ? $_POST : [];
}

