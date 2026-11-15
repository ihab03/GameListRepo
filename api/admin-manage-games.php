<?php
/**
 * Endpoint: POST /api/admin-manage-games.php
 * 
 * Administrator game management: allows creating new studio titles and toggling active/inactive status.
 * All operations are restricted to administrators and logged into the audit_logs table.
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

// 1. Enforce Administrator authentication
$admin = requireAdmin();

// 2. Extract request body
$input = getRequestData();
$action = strtolower(trim((string) ($input['action'] ?? '')));

if ($action === 'create') {
    $rawTitle = trim((string) ($input['title'] ?? ''));
    $rawGenre = trim((string) ($input['genre'] ?? 'Arcade'));

    if ($rawTitle === '') {
        sendJsonResponse(400, [
            'status'  => 'error',
            'message' => 'Game title is required.'
        ]);
    }
    if (mb_strlen($rawTitle) > 100) {
        sendJsonResponse(400, [
            'status'  => 'error',
            'message' => 'Game title cannot exceed 100 characters.'
        ]);
    }

    if ($rawGenre === '') {
        $rawGenre = 'Arcade';
    }
    if (mb_strlen($rawGenre) > 50) {
        sendJsonResponse(400, [
            'status'  => 'error',
            'message' => 'Genre cannot exceed 50 characters.'
        ]);
    }

    // Generate URL-friendly slug
    $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $rawTitle), '-'));
    if ($slug === '') {
        $slug = 'game-' . time();
    }

    try {
        // Check for duplicates
        $checkStmt = $pdo->prepare("SELECT id FROM games WHERE title = :title OR slug = :slug");
        $checkStmt->execute([':title' => $rawTitle, ':slug' => $slug]);
        if ($checkStmt->fetch()) {
            sendJsonResponse(400, [
                'status'  => 'error',
                'message' => 'A game with this title already exists in the registry.'
            ]);
        }

        $insertStmt = $pdo->prepare("
            INSERT INTO games (slug, title, genre, is_active)
            VALUES (:slug, :title, :genre, 1)
        ");
        $insertStmt->execute([
            ':slug'  => $slug,
            ':title' => $rawTitle,
            ':genre' => $rawGenre,
        ]);
        $newId = (int) $pdo->lastInsertId();

        // Audit log
        logAdminAction(
            $pdo,
            $admin,
            'add_game',
            $newId,
            "Registered new studio game '{$rawTitle}' ({$rawGenre})"
        );

        sendJsonResponse(201, [
            'status'  => 'success',
            'message' => 'Game created successfully.',
            'game'    => [
                'id'        => $newId,
                'slug'      => $slug,
                'title'     => $rawTitle,
                'genre'     => $rawGenre,
                'is_active' => 1,
            ]
        ]);
    } catch (PDOException $e) {
        error_log('Database error in admin-manage-games.php (create): ' . $e->getMessage());
        sendJsonResponse(500, [
            'status'  => 'error',
            'message' => 'Failed to create game.'
        ]);
    }
} elseif ($action === 'toggle') {
    $gameId = (int) ($input['game_id'] ?? 0);
    if ($gameId <= 0) {
        sendJsonResponse(400, [
            'status'  => 'error',
            'message' => 'Valid game_id is required.'
        ]);
    }

    try {
        $stmt = $pdo->prepare("SELECT id, title, is_active FROM games WHERE id = :id");
        $stmt->execute([':id' => $gameId]);
        $game = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$game) {
            sendJsonResponse(404, [
                'status'  => 'error',
                'message' => 'Game not found.'
            ]);
        }

        $newActive = $game['is_active'] ? 0 : 1;
        $updateStmt = $pdo->prepare("UPDATE games SET is_active = :is_active WHERE id = :id");
        $updateStmt->execute([':is_active' => $newActive, ':id' => $gameId]);

        // Audit log
        $statusStr = $newActive ? 'active' : 'inactive';
        logAdminAction(
            $pdo,
            $admin,
            'toggle_game',
            $gameId,
            "Toggled status of '{$game['title']}' to {$statusStr}"
        );

        sendJsonResponse(200, [
            'status'    => 'success',
            'message'   => "Game status changed to {$statusStr}.",
            'game_id'   => $gameId,
            'is_active' => $newActive,
        ]);
    } catch (PDOException $e) {
        error_log('Database error in admin-manage-games.php (toggle): ' . $e->getMessage());
        sendJsonResponse(500, [
            'status'  => 'error',
            'message' => 'Failed to update game status.'
        ]);
    }
} else {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => "Invalid action. Supported actions: 'create', 'toggle'."
    ]);
}

