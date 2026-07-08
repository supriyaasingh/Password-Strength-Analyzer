-- Database initialization script for SentryVault / Password Strength Analyzer
CREATE DATABASE IF NOT EXISTS `password_analyzer`;
USE `password_analyzer`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `Users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PasswordHistory Table
CREATE TABLE IF NOT EXISTS `PasswordHistory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `password_strength` VARCHAR(50) DEFAULT NULL,
  `entropy` DECIMAL(8, 2) DEFAULT NULL,
  `crack_time` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. SecurityReports Table
CREATE TABLE IF NOT EXISTS `SecurityReports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `score` INT DEFAULT NULL,
  `entropy` DECIMAL(8, 2) DEFAULT NULL,
  `feedback` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed an initial default/anonymous user for general session tracking
INSERT INTO `Users` (`id`, `username`, `email`)
VALUES (1, 'anonymous_vault_user', 'anonymous@sentryvault.local')
ON DUPLICATE KEY UPDATE `username` = `username`;
