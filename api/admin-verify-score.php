<?php
/**
 * Endpoint: POST /api/admin-verify-score.php
 * 
 * Admin only: Approves or rejects submitted scores individually or in bulk.
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

// Enforce admin privileges
$admin = requireAdmin();

$input = getRequestData();
$action = strtolower(trim((string) ($input['action'] ?? '')));

$allowedActions = ['approve', 'reject', 'approve_all_pending', 'reject_all_pending'];
if (!in_array($action, $allowedActions, true)) {
    sendJsonResponse(400, [
        'status'  => 'error',
        'message' => 'Invalid action specified. Allowed: approve, reject, approve_all_pending, reject_all_pending.'
    ]);
}

try {
    if ($action === 'approve' || $action === 'reject') {
        $scoreId = filter_var($input['score_id'] ?? null, FILTER_VALIDATE_INT);
        if ($scoreId === false || $scoreId <= 0) {
            sendJsonResponse(400, [
                'status'  => 'error',
                'message' => 'A valid score_id is required.'
            ]);
        }

        $newStatus = ($action === 'approve') ? 'approved' : 'rejected';

        $stmt = $pdo->prepare(
            'UPDATE scores 
             SET status = :status, reviewed_by = :reviewed_by, reviewed_at = NOW() 
             WHERE id = :id'
        );
        $stmt->execute([
            ':status'      => $newStatus,
            ':reviewed_by' => $admin['id'],
            ':id'          => $scoreId,
        ]);

        if ($stmt->rowCount() === 0) {
            sendJsonResponse(404, [
                'status'  => 'error',
                'message' => 'Score not found or status unchanged.'
            ]);
        }

        sendJsonResponse(200, [
            'status'        => 'success',
            'message'       => "Score #{$scoreId} was successfully marked as {$newStatus}.",
            'action'        => $action,
            'score_id'      => $scoreId,
            'new_status'    => $newStatus,
            'affected_rows' => $stmt->rowCount(),
        ]);
    } else {
        // Bulk Action: approve_all_pending or reject_all_pending
        $newStatus = ($action === 'approve_all_pending') ? 'approved' : 'rejected';

        $stmt = $pdo->prepare(
            "UPDATE scores 
             SET status = :status, reviewed_by = :reviewed_by, reviewed_at = NOW() 
             WHERE status = 'pending'"
        );
        $stmt->execute([
            ':status'      => $newStatus,
            ':reviewed_by' => $admin['id'],
        ]);

        $affectedCount = $stmt->rowCount();

        sendJsonResponse(200, [
            'status'        => 'success',
            'message'       => "All pending scores ({$affectedCount}) were successfully marked as {$newStatus}.",
            'action'        => $action,
            'new_status'    => $newStatus,
            'affected_rows' => $affectedCount,
        ]);
    }
} catch (PDOException $e) {
    error_log('Database Error in admin-verify-score.php: ' . $e->getMessage());
    sendJsonResponse(500, [
        'status'  => 'error',
        'message' => 'Failed to update score verification status.'
    ]);
}

