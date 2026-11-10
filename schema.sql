-- Option A: Game Leaderboard Service Database Schema
-- Step 6 Upgrade: Users table, role-based authentication, and admin score verification workflow

CREATE DATABASE IF NOT EXISTS `game_leaderboard`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `game_leaderboard`;

-- Users table for authentication and RBAC (Player / Admin)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('player', 'admin') NOT NULL DEFAULT 'player',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leaderboard scores table with moderation status
CREATE TABLE IF NOT EXISTS `scores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `game` VARCHAR(100) NOT NULL,
    `player_name` VARCHAR(100) NOT NULL,
    `score` INT NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `reviewed_by` INT NULL,
    `reviewed_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_game_score` (`game`, `score` DESC),
    INDEX `idx_game_created_score` (`game`, `created_at`, `score` DESC),
    INDEX `idx_status_game_created_score` (`status`, `game`, `created_at`, `score` DESC),
    INDEX `idx_status_created_score` (`status`, `created_at`, `score` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate limiting table for IP/Session request tracking
CREATE TABLE IF NOT EXISTS `rate_limits` (
    `ip_address` VARCHAR(45) NOT NULL,
    `endpoint` VARCHAR(50) NOT NULL,
    `hit_count` INT NOT NULL DEFAULT 1,
    `window_start` INT NOT NULL,
    PRIMARY KEY (`ip_address`, `endpoint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clear tables before re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `scores`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `rate_limits`;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed Default Accounts:
-- Admin: username 'admin', password 'Admin123!'
-- Player: username 'player1', password 'Player123!'
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`) VALUES
(1, 'admin', '$2y$12$47H0cZP6BAWvgrx8pKaWEe4e9HMkTbgR1ceyIUpbt4wLRWFk5ZXEK', 'admin'),
(2, 'player1', '$2y$12$Ls65ZbhNCC4Ax0arQXdt2eU11IzstEVwQ9E0zWWPLoNwl6zghDH8u', 'player');

-- Seed Approved Scores across 3 games
-- Pre-approved so the public leaderboard is immediately active and testable
INSERT INTO `scores` (`user_id`, `game`, `player_name`, `score`, `status`, `reviewed_by`, `reviewed_at`, `created_at`) VALUES
-- Space Blaster: Older than 1 week (All-Time)
(2, 'Space Blaster', 'AcePilot', 9850, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 15 DAY)),
(2, 'Space Blaster', 'NovaStar', 9420, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 20 DAY)),
(2, 'Space Blaster', 'StarGazer', 5400, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 22 DAY)),
(2, 'Space Blaster', 'NebulaKid', 4950, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 25 DAY)),
(2, 'Space Blaster', 'RetroRacer', 4100, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 28 DAY)),

-- Space Blaster: Past 7 days (This Week & All-Time)
(2, 'Space Blaster', 'CyberKnight', 8910, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'Space Blaster', 'AstroBoy', 8350, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 'Space Blaster', 'CometChaser', 6200, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Space Blaster', 'OrbitMaster', 5900, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 5 DAY)),

-- Space Blaster: Today (Today, This Week & All-Time)
(2, 'Space Blaster', 'VoidWalker', 7980, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 'Space Blaster', 'SolarFlare', 7540, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 'Space Blaster', 'PixelPulse', 6890, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 5 HOUR)),

-- Dungeon Runner: Distributed across periods
(2, 'Dungeon Runner', 'ShadowRogue', 15200, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 15 DAY)),
(2, 'Dungeon Runner', 'MysticMage', 12850, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'Dungeon Runner', 'IronWarrior', 11400, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Dungeon Runner', 'CryptKeeper', 9650, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 HOUR)),

-- Drift King: Distributed across periods
(2, 'Drift King', 'ApexDrifter', 88400, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 20 DAY)),
(2, 'Drift King', 'TurboBoost', 82100, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 'Drift King', 'RedlineRush', 76900, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Drift King', 'NitroGhost', 71300, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 4 HOUR)),

-- 4 Seeded Pending Scores for immediate Admin Verification Queue testing
(2, 'Space Blaster', 'SpeedyNova', 9150, 'pending', NULL, NULL, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(2, 'Space Blaster', 'LaserFocus', 8400, 'pending', NULL, NULL, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(2, 'Dungeon Runner', 'DarkKnight', 13900, 'pending', NULL, NULL, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(2, 'Drift King', 'TokyoDrift', 85000, 'pending', NULL, NULL, DATE_SUB(NOW(), INTERVAL 40 MINUTE));
