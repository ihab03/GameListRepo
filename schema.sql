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

-- Studio Game Registry table
CREATE TABLE IF NOT EXISTS `games` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `title` VARCHAR(100) NOT NULL UNIQUE,
    `genre` VARCHAR(50) NOT NULL DEFAULT 'Arcade',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Studio Admin Moderation & Action Audit Log table
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `admin_id` INT NOT NULL,
    `admin_username` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `target_id` INT NULL,
    `details` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clear tables before re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `scores`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `rate_limits`;
TRUNCATE TABLE `games`;
TRUNCATE TABLE `audit_logs`;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed Default Studio Games:
INSERT INTO `games` (`id`, `slug`, `title`, `genre`, `is_active`) VALUES
(1, 'tetris-effect', 'Tetris Effect', 'Puzzle', 1),
(2, 'pac-man', 'Pac-Man', 'Arcade', 1),
(3, 'subway-surfers', 'Subway Surfers', 'Endless Runner', 1),
(4, 'vampire-survivors', 'Vampire Survivors', 'Roguelike', 1),
(5, 'trackmania', 'Trackmania', 'Racing', 1);

-- Seed Initial Moderation Audit Trail:
INSERT INTO `audit_logs` (`admin_id`, `admin_username`, `action`, `target_id`, `details`, `created_at`) VALUES
(1, 'admin', 'system_init', NULL, 'Initialized Hyper Arena game registry and system configuration', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, 'admin', 'add_game', 4, 'Registered new title: Vampire Survivors (Roguelike)', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'admin', 'approve_score', 1, 'Approved score submission 985000 for player AcePilot in Tetris Effect', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Seed Default Accounts:
-- Admin: username 'admin', password 'Admin123!'
-- Player: username 'player1', password 'Player123!'
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`) VALUES
(1, 'admin', '$2y$12$ILbm674kghjDmpv.2y.BL.a/Fb.dCL8fay4PjvavnLYIokc7TS.Cq', 'admin'),
(2, 'player1', '$2y$12$Q1DUeJOQtY5SaaoJhwje1OTp7.A0xHeDKJ3x3rozMisVbWXLsv68m', 'player');

-- Seed Approved Scores across real iconic games
-- Pre-approved so the public leaderboard is immediately active and testable
INSERT INTO `scores` (`user_id`, `game`, `player_name`, `score`, `status`, `reviewed_by`, `reviewed_at`, `created_at`) VALUES
-- Tetris Effect: Older than 1 week (All-Time)
(2, 'Tetris Effect', 'AcePilot', 985000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 15 DAY)),
(2, 'Tetris Effect', 'NovaStar', 942000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 20 DAY)),
(2, 'Tetris Effect', 'StarGazer', 540000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 22 DAY)),
(2, 'Tetris Effect', 'NebulaKid', 495000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 25 DAY)),
(2, 'Tetris Effect', 'RetroRacer', 410000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 28 DAY)),

-- Tetris Effect: Past 7 days (This Week & All-Time)
(2, 'Tetris Effect', 'CyberKnight', 891000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'Tetris Effect', 'AstroBoy', 835000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 'Tetris Effect', 'CometChaser', 620000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Tetris Effect', 'OrbitMaster', 590000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 5 DAY)),

-- Tetris Effect: Today (Today, This Week & All-Time)
(2, 'Tetris Effect', 'VoidWalker', 798000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 'Tetris Effect', 'SolarFlare', 754000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 'Tetris Effect', 'PixelPulse', 689000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 5 HOUR)),

-- Pac-Man: Distributed across periods (Classic arcade high scores)
(2, 'Pac-Man', 'ArcadeGod', 3333360, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 15 DAY)),
(2, 'Pac-Man', 'GhostHunter', 2450800, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 'Pac-Man', 'WakaMaster', 1890200, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Pac-Man', 'BlinkyBane', 1245600, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 3 HOUR)),

-- Subway Surfers: Distributed across periods (Endless runner millions)
(2, 'Subway Surfers', 'RailRunner', 12850000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 18 DAY)),
(2, 'Subway Surfers', 'HoverSurfer', 9620000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'Subway Surfers', 'CoinMagnet', 7410000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Subway Surfers', 'JetpackPro', 5180000, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 HOUR)),

-- Vampire Survivors: Distributed across periods
(2, 'Vampire Survivors', 'GarlicKing', 154200, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 12 DAY)),
(2, 'Vampire Survivors', 'HolyWater', 128900, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'Vampire Survivors', 'DeathDefier', 98400, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 'Vampire Survivors', 'BiteBack', 76500, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 4 HOUR)),

-- Trackmania: Distributed across periods
(2, 'Trackmania', 'ApexDrifter', 88400, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 20 DAY)),
(2, 'Trackmania', 'TurboBoost', 82100, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 'Trackmania', 'RedlineRush', 76900, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Trackmania', 'TimeAttacker', 71300, 'approved', 1, NOW(), DATE_SUB(NOW(), INTERVAL 4 HOUR)),

-- 4 Seeded Pending Scores for immediate Admin Verification Queue testing
(2, 'Tetris Effect', 'SpeedyNova', 915000, 'pending', NULL, NULL, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(2, 'Pac-Man', 'PelletEater', 1520000, 'pending', NULL, NULL, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(2, 'Subway Surfers', 'TrackDodger', 8240000, 'pending', NULL, NULL, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(2, 'Trackmania', 'SpeedDemon', 85000, 'pending', NULL, NULL, DATE_SUB(NOW(), INTERVAL 40 MINUTE));
