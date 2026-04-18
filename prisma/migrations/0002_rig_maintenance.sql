-- ============================================================================
-- Migration: Rig Maintenance Module (Phase 1)
-- Per SkyLara_Rig_Maintenance_Complete_Master_File.md
-- ============================================================================

-- 1. New enums
-- Note: MySQL ENUM is inline per column, so no separate CREATE TYPE needed.
-- Prisma handles enum mapping via @@map. The enum values are used directly.

-- 2. Create rig_containers table
CREATE TABLE IF NOT EXISTS `rig_containers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rigId` INTEGER NOT NULL,
    `manufacturer` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `serialNumber` VARCHAR(100) NULL,
    `manufactureDate` DATETIME(3) NULL,
    `size` VARCHAR(50) NULL,
    `serviceNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rig_containers_rigId_key`(`rigId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Create rig_main_canopies table
CREATE TABLE IF NOT EXISTS `rig_main_canopies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rigId` INTEGER NOT NULL,
    `manufacturer` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `size` VARCHAR(50) NULL,
    `serialNumber` VARCHAR(100) NULL,
    `fabricType` VARCHAR(50) NULL,
    `lineType` VARCHAR(50) NULL,
    `installDate` DATETIME(3) NULL,
    `totalJumps` INTEGER NOT NULL DEFAULT 0,
    `jumpsSinceInspection` INTEGER NOT NULL DEFAULT 0,
    `jumpsSinceReline` INTEGER NOT NULL DEFAULT 0,
    `lastInspectionDate` DATETIME(3) NULL,
    `lastRelineDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rig_main_canopies_rigId_key`(`rigId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Create rig_reserves table
CREATE TABLE IF NOT EXISTS `rig_reserves` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rigId` INTEGER NOT NULL,
    `manufacturer` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `serialNumber` VARCHAR(100) NULL,
    `size` VARCHAR(50) NULL,
    `installDate` DATETIME(3) NULL,
    `repackDate` DATETIME(3) NULL,
    `repackDueDate` DATETIME(3) NULL,
    `rides` INTEGER NOT NULL DEFAULT 0,
    `inspectionNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rig_reserves_rigId_key`(`rigId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Create rig_aads table
CREATE TABLE IF NOT EXISTS `rig_aads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rigId` INTEGER NOT NULL,
    `manufacturer` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `serialNumber` VARCHAR(100) NULL,
    `installDate` DATETIME(3) NULL,
    `lastServiceDate` DATETIME(3) NULL,
    `nextServiceDueDate` DATETIME(3) NULL,
    `batteryDueDate` DATETIME(3) NULL,
    `endOfLifeDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rig_aads_rigId_key`(`rigId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. Create rigs table (depends on users, dropzones)
CREATE TABLE IF NOT EXISTS `rigs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ownerUserId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NULL,
    `rigName` VARCHAR(255) NOT NULL,
    `serialNumber` VARCHAR(100) NULL,
    `rigType` ENUM('SPORT', 'TANDEM', 'STUDENT', 'RENTAL', 'OTHER') NOT NULL DEFAULT 'SPORT',
    `activeStatus` ENUM('ACTIVE', 'INACTIVE', 'RETIRED') NOT NULL DEFAULT 'ACTIVE',
    `maintenanceStatus` ENUM('OK', 'DUE_SOON', 'DUE_NOW', 'OVERDUE', 'GROUNDED_STATUS') NOT NULL DEFAULT 'OK',
    `totalJumps` INTEGER NOT NULL DEFAULT 0,
    `isSharedRig` BOOLEAN NOT NULL DEFAULT false,
    `defaultManifestSelectable` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rigs_ownerUserId_idx`(`ownerUserId`),
    INDEX `rigs_dropzoneId_idx`(`dropzoneId`),
    INDEX `rigs_activeStatus_idx`(`activeStatus`),
    INDEX `rigs_maintenanceStatus_idx`(`maintenanceStatus`),
    INDEX `rigs_serialNumber_idx`(`serialNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 7. Create maintenance_rules table
CREATE TABLE IF NOT EXISTS `maintenance_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rigId` INTEGER NULL,
    `dropzoneId` INTEGER NULL,
    `componentType` ENUM('RIG', 'CONTAINER', 'MAIN', 'LINESET', 'RESERVE', 'AAD', 'BRAKE_LINES', 'RISERS', 'CUSTOM') NOT NULL,
    `ruleType` ENUM('INSPECTION', 'REPLACEMENT_REMINDER', 'SERVICE', 'COMPLIANCE', 'GROUNDING_POLICY') NOT NULL,
    `triggerByJumps` INTEGER NULL,
    `triggerByDays` INTEGER NULL,
    `dueSoonPercent` INTEGER NOT NULL DEFAULT 80,
    `overduePercent` INTEGER NULL,
    `hardStop` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sourceType` ENUM('DZ_DEFAULT', 'MANUFACTURER', 'RIGGER', 'OWNER', 'ADMIN') NOT NULL DEFAULT 'DZ_DEFAULT',
    `appliesToRigType` ENUM('SPORT', 'TANDEM', 'STUDENT', 'RENTAL', 'OTHER') NULL,
    `label` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `createdByUserId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `maintenance_rules_rigId_idx`(`rigId`),
    INDEX `maintenance_rules_dropzoneId_idx`(`dropzoneId`),
    INDEX `maintenance_rules_componentType_idx`(`componentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 8. Create maintenance_events table
CREATE TABLE IF NOT EXISTS `maintenance_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rigId` INTEGER NOT NULL,
    `componentType` ENUM('RIG', 'CONTAINER', 'MAIN', 'LINESET', 'RESERVE', 'AAD', 'BRAKE_LINES', 'RISERS', 'CUSTOM') NOT NULL,
    `maintenanceType` VARCHAR(100) NOT NULL,
    `eventDate` DATETIME(3) NOT NULL,
    `result` ENUM('PASSED', 'MONITOR', 'SERVICE_REQUIRED', 'DUE_SOON', 'DUE_NOW', 'OVERDUE', 'GROUNDED', 'COMPLETED') NOT NULL,
    `findings` TEXT NULL,
    `actionTaken` TEXT NULL,
    `performedByUserId` INTEGER NULL,
    `performedByName` VARCHAR(255) NULL,
    `signatureUrl` VARCHAR(500) NULL,
    `attachmentUrls` JSON NULL,
    `resetCounterTypes` JSON NULL,
    `countersBefore` JSON NULL,
    `countersAfter` JSON NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `maintenance_events_rigId_idx`(`rigId`),
    INDEX `maintenance_events_eventDate_idx`(`eventDate`),
    INDEX `maintenance_events_componentType_idx`(`componentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 9. Create rig_jump_usage_events table
CREATE TABLE IF NOT EXISTS `rig_jump_usage_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rigId` INTEGER NOT NULL,
    `jumpId` INTEGER NOT NULL,
    `loadId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NOT NULL,
    `rigTotalAfter` INTEGER NOT NULL,
    `mainTotalAfter` INTEGER NULL,
    `lineSetAfter` INTEGER NULL,
    `linkedMaintenanceStatusSnapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `rig_jump_usage_events_rigId_jumpId_key`(`rigId`, `jumpId`),
    INDEX `rig_jump_usage_events_rigId_idx`(`rigId`),
    INDEX `rig_jump_usage_events_userId_idx`(`userId`),
    INDEX `rig_jump_usage_events_completedAt_idx`(`completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 10. Create rig_grounding_records table
CREATE TABLE IF NOT EXISTS `rig_grounding_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rigId` INTEGER NOT NULL,
    `componentType` ENUM('RIG', 'CONTAINER', 'MAIN', 'LINESET', 'RESERVE', 'AAD', 'BRAKE_LINES', 'RISERS', 'CUSTOM') NOT NULL,
    `reason` TEXT NOT NULL,
    `policySource` VARCHAR(255) NULL,
    `groundedByUserId` INTEGER NOT NULL,
    `groundedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clearedAt` DATETIME(3) NULL,
    `clearedByUserId` INTEGER NULL,
    `clearanceNotes` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rig_grounding_records_rigId_idx`(`rigId`),
    INDEX `rig_grounding_records_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 11. Add rigId FK to slots table (if column doesn't exist)
-- Note: Use a conditional approach for MySQL
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'slots' AND COLUMN_NAME = 'rigId');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `slots` ADD COLUMN `rigId` INTEGER NULL, ADD INDEX `slots_rigId_idx`(`rigId`)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 12. Add foreign key constraints
ALTER TABLE `rig_containers` ADD CONSTRAINT `rig_containers_rigId_fkey`
    FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `rig_main_canopies` ADD CONSTRAINT `rig_main_canopies_rigId_fkey`
    FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `rig_reserves` ADD CONSTRAINT `rig_reserves_rigId_fkey`
    FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `rig_aads` ADD CONSTRAINT `rig_aads_rigId_fkey`
    FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `rigs` ADD CONSTRAINT `rigs_ownerUserId_fkey`
    FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `rigs` ADD CONSTRAINT `rigs_dropzoneId_fkey`
    FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `maintenance_rules` ADD CONSTRAINT `maintenance_rules_rigId_fkey`
    FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `maintenance_rules` ADD CONSTRAINT `maintenance_rules_dropzoneId_fkey`
    FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `maintenance_rules` ADD CONSTRAINT `maintenance_rules_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `maintenance_events` ADD CONSTRAINT `maintenance_events_rigId_fkey`
    FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `maintenance_events` ADD CONSTRAINT `maintenance_events_performedByUserId_fkey`
    FOREIGN KEY (`performedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `rig_jump_usage_events` ADD CONSTRAINT `rig_jump_usage_events_rigId_fkey`
    FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `rig_grounding_records` ADD CONSTRAINT `rig_grounding_records_rigId_fkey`
    FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `rig_grounding_records` ADD CONSTRAINT `rig_grounding_records_groundedByUserId_fkey`
    FOREIGN KEY (`groundedByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `rig_grounding_records` ADD CONSTRAINT `rig_grounding_records_clearedByUserId_fkey`
    FOREIGN KEY (`clearedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Slot → Rig FK (conditional — may already exist)
-- ALTER TABLE `slots` ADD CONSTRAINT `slots_rigId_fkey`
--     FOREIGN KEY (`rigId`) REFERENCES `rigs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
