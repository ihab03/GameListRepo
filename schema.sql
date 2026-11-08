-- Option A: Game Leaderboard Service Database Schema
-- Step 1: Database creation, table definitions, performance indexing, and seed data

CREATE DATABASE IF NOT EXISTS `game_leaderboard`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `game_leaderboard`;

-- Leaderboard scores table
CREATE TABLE IF NOT EXISTS `scores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game` VARCHAR(100) NOT NULL,
    `player_name` VARCHAR(100) NOT NULL,
    `score` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_game_score` (`game`, `score` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample seed data across 3 games
-- Includes 12 scores for 'Space Blaster' to verify the Top 10 cutoff logic in Step 2
INSERT INTO `scores` (`game`, `player_name`, `score`, `created_at`) VALUES
('Space Blaster', 'AcePilot', 9850, '2026-11-01 10:15:00'),
('Space Blaster', 'NovaStar', 9420, '2026-11-01 11:30:00'),
('Space Blaster', 'CyberKnight', 8910, '2026-11-02 09:20:00'),
('Space Blaster', 'AstroBoy', 8350, '2026-11-02 14:45:00'),
('Space Blaster', 'VoidWalker', 7980, '2026-11-03 16:10:00'),
('Space Blaster', 'SolarFlare', 7540, '2026-11-03 18:25:00'),
('Space Blaster', 'PixelPulse', 6890, '2026-11-04 12:00:00'),
('Space Blaster', 'CometChaser', 6200, '2026-11-04 15:40:00'),
('Space Blaster', 'OrbitMaster', 5900, '2026-11-05 08:30:00'),
('Space Blaster', 'StarGazer', 5400, '2026-11-05 19:15:00'),
('Space Blaster', 'NebulaKid', 4950, '2026-11-06 13:05:00'),
('Space Blaster', 'RetroRacer', 4100, '2026-11-06 17:50:00'),
('Dungeon Runner', 'ShadowRogue', 15200, '2026-11-02 20:00:00'),
('Dungeon Runner', 'MysticMage', 12850, '2026-11-03 21:15:00'),
('Dungeon Runner', 'IronWarrior', 11400, '2026-11-04 19:45:00'),
('Dungeon Runner', 'CryptKeeper', 9650, '2026-11-05 22:30:00'),
('Drift King', 'ApexDrifter', 88400, '2026-11-01 22:10:00'),
('Drift King', 'TurboBoost', 82100, '2026-11-02 23:00:00'),
('Drift King', 'RedlineRush', 76900, '2026-11-03 17:20:00'),
('Drift King', 'NitroGhost', 71300, '2026-11-04 18:05:00');

