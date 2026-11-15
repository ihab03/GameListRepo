<?php
/**
 * Audit Logger Core
 * 
 * Records administrative events and state modifications to the audit_logs table.
 */

declare(strict_types=1);

/**
 * Records an administrative event into the audit_logs table.
 *
 * @param PDO $pdo
 * @param array{id: int, username: string} $admin
 * @param string $action
 * @param int|null $targetId
 * @param string $details
 * @return void
 */
function logAdminAction(PDO $pdo, array $admin, string $action, ?int $targetId, string $details): void {
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO audit_logs (admin_id, admin_username, action, target_id, details) 
             VALUES (:admin_id, :admin_username, :action, :target_id, :details)'
        );
        $stmt->execute([
            ':admin_id'       => (int) $admin['id'],
            ':admin_username' => (string) $admin['username'],
            ':action'         => $action,
            ':target_id'      => $targetId,
            ':details'        => $details,
        ]);
    } catch (\Throwable $e) {
        error_log('Audit log insertion failure: ' . $e->getMessage());
    }
}

