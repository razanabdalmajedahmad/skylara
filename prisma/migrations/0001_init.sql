-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `emailVerifiedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `preferredLanguage` VARCHAR(10) NOT NULL DEFAULT 'en',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_uuid_key`(`uuid`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `avatar` TEXT NULL,
    `bio` TEXT NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `gender` VARCHAR(50) NULL,
    `nationality` VARCHAR(100) NULL,
    `emergencyContactName` VARCHAR(100) NULL,
    `emergencyContactPhone` VARCHAR(20) NULL,
    `emergencyContactRelation` VARCHAR(50) NULL,
    `notificationPreferences` JSON NOT NULL,
    `visibilityPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `organizationId` INTEGER NULL,
    `dropzoneId` INTEGER NULL,
    `grantedBy` INTEGER NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_roles_userId_idx`(`userId`),
    INDEX `user_roles_roleId_idx`(`roleId`),
    INDEX `user_roles_dropzoneId_idx`(`dropzoneId`),
    UNIQUE INDEX `user_roles_userId_roleId_organizationId_dropzoneId_key`(`userId`, `roleId`, `organizationId`, `dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(512) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_key`(`token`),
    INDEX `refresh_tokens_userId_idx`(`userId`),
    INDEX `refresh_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(255) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_token_key`(`token`),
    INDEX `password_reset_tokens_userId_idx`(`userId`),
    INDEX `password_reset_tokens_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `subscriptionTier` VARCHAR(50) NOT NULL DEFAULT 'starter',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_uuid_key`(`uuid`),
    UNIQUE INDEX `organizations_slug_key`(`slug`),
    UNIQUE INDEX `organizations_ownerId_key`(`ownerId`),
    INDEX `organizations_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dropzones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `organizationId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `icaoCode` VARCHAR(10) NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'UTC',
    `windLimitKnots` INTEGER NOT NULL DEFAULT 15,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dropzones_uuid_key`(`uuid`),
    INDEX `dropzones_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `dropzones_organizationId_slug_key`(`organizationId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dz_branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dz_branches_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aircrafts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `registration` VARCHAR(20) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `maxCapacity` INTEGER NOT NULL,
    `maxWeight` INTEGER NOT NULL,
    `emptyWeight` INTEGER NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `aircrafts_dropzoneId_idx`(`dropzoneId`),
    UNIQUE INDEX `aircrafts_dropzoneId_registration_key`(`dropzoneId`, `registration`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `dropzoneId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `aircraftId` INTEGER NOT NULL,
    `pilotId` INTEGER NOT NULL,
    `loadNumber` VARCHAR(50) NOT NULL,
    `status` ENUM('OPEN', 'FILLING', 'LOCKED', 'BOARDING', 'AIRBORNE', 'LANDED', 'COMPLETE', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `scheduledAt` DATETIME(3) NOT NULL,
    `actualDepartureAt` DATETIME(3) NULL,
    `slotCount` INTEGER NOT NULL DEFAULT 0,
    `currentWeight` INTEGER NOT NULL DEFAULT 0,
    `cgPosition` DECIMAL(5, 3) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loads_uuid_key`(`uuid`),
    INDEX `loads_dropzoneId_status_idx`(`dropzoneId`, `status`),
    INDEX `loads_branchId_idx`(`branchId`),
    INDEX `loads_aircraftId_idx`(`aircraftId`),
    INDEX `loads_status_idx`(`status`),
    INDEX `loads_scheduledAt_idx`(`scheduledAt`),
    UNIQUE INDEX `loads_dropzoneId_loadNumber_key`(`dropzoneId`, `loadNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loadId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `instructorId` INTEGER NULL,
    `cameraId` INTEGER NULL,
    `position` INTEGER NOT NULL,
    `slotType` ENUM('FUN', 'TANDEM_PASSENGER', 'TANDEM_INSTRUCTOR', 'AFF_STUDENT', 'AFF_INSTRUCTOR', 'COACH', 'CAMERA', 'WINGSUIT', 'HOP_N_POP') NOT NULL,
    `weight` INTEGER NOT NULL,
    `exitOrder` INTEGER NULL,
    `checkedIn` BOOLEAN NOT NULL DEFAULT false,
    `checkedInAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `slots_loadId_idx`(`loadId`),
    INDEX `slots_userId_idx`(`userId`),
    INDEX `slots_instructorId_idx`(`instructorId`),
    UNIQUE INDEX `slots_loadId_position_key`(`loadId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `captainId` INTEGER NOT NULL,
    `groupType` ENUM('RW', 'FREEFLY', 'ANGLE', 'WINGSUIT', 'COACHING', 'TANDEM_CAMERA', 'AFF', 'CRW') NOT NULL,
    `isTemplate` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `groups_dropzoneId_idx`(`dropzoneId`),
    INDEX `groups_captainId_idx`(`captainId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `role` ENUM('CAPTAIN', 'MEMBER') NOT NULL,
    `status` ENUM('INVITED', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'INVITED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `group_members_groupId_idx`(`groupId`),
    INDEX `group_members_userId_idx`(`userId`),
    UNIQUE INDEX `group_members_groupId_userId_key`(`groupId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NOT NULL,
    `tokenType` ENUM('PERMANENT', 'DAILY', 'BOOKING') NOT NULL,
    `payload` JSON NOT NULL,
    `hmacSignature` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `qr_tokens_userId_idx`(`userId`),
    INDEX `qr_tokens_dropzoneId_idx`(`dropzoneId`),
    INDEX `qr_tokens_tokenType_idx`(`tokenType`),
    INDEX `qr_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `waivers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `waiverType` ENUM('TANDEM', 'AFF', 'EXPERIENCED', 'MINOR', 'SPECTATOR', 'MEDIA') NOT NULL,
    `content` LONGTEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `waivers_dropzoneId_idx`(`dropzoneId`),
    INDEX `waivers_waiverType_idx`(`waiverType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `waiver_signatures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `waiverId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `signedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `signatureData` LONGTEXT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `deviceInfo` VARCHAR(255) NULL,
    `geoLat` DECIMAL(10, 8) NULL,
    `geoLng` DECIMAL(11, 8) NULL,
    `guardianName` VARCHAR(100) NULL,
    `guardianRelation` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `waiver_signatures_userId_idx`(`userId`),
    INDEX `waiver_signatures_signedAt_idx`(`signedAt`),
    UNIQUE INDEX `waiver_signatures_waiverId_userId_key`(`waiverId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emergency_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bloodType` VARCHAR(10) NULL,
    `allergies` TEXT NULL,
    `medications` TEXT NULL,
    `medicalConditions` TEXT NULL,
    `insuranceProvider` VARCHAR(100) NULL,
    `insuranceNumber` VARCHAR(100) NULL,
    `primaryContactName` VARCHAR(100) NOT NULL,
    `primaryContactPhone` VARCHAR(20) NOT NULL,
    `primaryContactRelation` VARCHAR(50) NOT NULL,
    `hospitalPreference` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emergency_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gear_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `serialNumber` VARCHAR(100) NOT NULL,
    `gearType` ENUM('MAIN', 'RESERVE', 'AAD', 'CONTAINER', 'HELMET', 'ALTIMETER', 'JUMPSUIT') NOT NULL,
    `manufacturer` VARCHAR(100) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `dom` DATETIME(3) NOT NULL,
    `lastRepackAt` DATETIME(3) NULL,
    `nextRepackDue` DATETIME(3) NULL,
    `aadFiresRemaining` INTEGER NULL,
    `status` ENUM('ACTIVE', 'GROUNDED', 'RETIRED', 'IN_REPAIR') NOT NULL DEFAULT 'ACTIVE',
    `ownerId` INTEGER NULL,
    `isRental` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gear_items_dropzoneId_idx`(`dropzoneId`),
    INDEX `gear_items_gearType_idx`(`gearType`),
    INDEX `gear_items_status_idx`(`status`),
    INDEX `gear_items_nextRepackDue_idx`(`nextRepackDue`),
    UNIQUE INDEX `gear_items_dropzoneId_serialNumber_key`(`dropzoneId`, `serialNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gear_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gearItemId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `checkedById` INTEGER NOT NULL,
    `loadId` INTEGER NULL,
    `result` ENUM('PASS', 'FAIL', 'CONDITIONAL') NOT NULL,
    `notes` TEXT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `gear_checks_gearItemId_idx`(`gearItemId`),
    INDEX `gear_checks_checkedById_idx`(`checkedById`),
    INDEX `gear_checks_checkedAt_idx`(`checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `wallets_userId_idx`(`userId`),
    INDEX `wallets_dropzoneId_idx`(`dropzoneId`),
    UNIQUE INDEX `wallets_userId_dropzoneId_key`(`userId`, `dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jump_tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NOT NULL,
    `ticketType` VARCHAR(50) NOT NULL,
    `remainingJumps` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `jump_tickets_userId_idx`(`userId`),
    INDEX `jump_tickets_dropzoneId_idx`(`dropzoneId`),
    INDEX `jump_tickets_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `walletId` INTEGER NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT', 'REFUND', 'PAYOUT', 'FEE') NOT NULL,
    `amount` INTEGER NOT NULL,
    `balanceAfter` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` INTEGER NULL,
    `stripePaymentId` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transactions_uuid_key`(`uuid`),
    INDEX `transactions_walletId_idx`(`walletId`),
    INDEX `transactions_type_idx`(`type`),
    INDEX `transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incidents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `dropzoneId` INTEGER NOT NULL,
    `reportedById` INTEGER NOT NULL,
    `severity` ENUM('NEAR_MISS', 'MINOR', 'MODERATE', 'SERIOUS', 'FATAL') NOT NULL,
    `status` ENUM('REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'REPORTED',
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `involvedUserIds` JSON NOT NULL,
    `loadId` INTEGER NULL,
    `gearItemId` INTEGER NULL,
    `location` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `incidents_uuid_key`(`uuid`),
    INDEX `incidents_dropzoneId_idx`(`dropzoneId`),
    INDEX `incidents_severity_idx`(`severity`),
    INDEX `incidents_status_idx`(`status`),
    INDEX `incidents_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NULL,
    `type` ENUM('LOAD_READY', 'LOAD_BOARDING', 'LOAD_DEPARTURE', 'SLOT_ASSIGNMENT', 'SLOT_CONFIRMATION', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INSTRUCTOR_ASSIGNMENT', 'WEATHER_WARNING', 'EMERGENCY_ALERT', 'BOOKING_CONFIRMATION', 'BOOKING_CANCELLED', 'WAIVER_REQUIRED', 'GEAR_CHECK_FAILED', 'INCIDENT_REPORTED', 'PROFILE_UPDATE', 'ANNOUNCEMENT') NOT NULL,
    `channel` ENUM('PUSH', 'SMS', 'EMAIL', 'IN_APP') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `data` JSON NULL,
    `status` ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ') NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_dropzoneId_idx`(`dropzoneId`),
    INDEX `notifications_status_idx`(`status`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `dropzoneId` INTEGER NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PAYMENT', 'REFUND', 'ROLE_GRANT', 'ROLE_REVOKE', 'INCIDENT_REPORT', 'GEAR_CHECK', 'WAIVER_SIGN', 'LOAD_CREATE', 'LOAD_CANCEL', 'LOAD_DEPART', 'SLOT_ASSIGN', 'SLOT_CANCEL', 'EMERGENCY_ACTIVATE', 'EMERGENCY_DEACTIVATE', 'LOAD_UPDATE', 'LOAD_DELETE', 'LOAD_LOCK', 'SLOT_CREATE', 'SLOT_DELETE', 'MANIFEST_GROUP', 'PROFILE_UPDATE') NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `beforeState` JSON NULL,
    `afterState` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_dropzoneId_idx`(`dropzoneId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_entityType_idx`(`entityType`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_outbox` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceId` VARCHAR(100) NOT NULL,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'SYNCED', 'CONFLICT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `idempotencyKey` VARCHAR(255) NOT NULL,
    `conflictData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `syncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `sync_outbox_idempotencyKey_key`(`idempotencyKey`),
    INDEX `sync_outbox_userId_idx`(`userId`),
    INDEX `sync_outbox_dropzoneId_idx`(`dropzoneId`),
    INDEX `sync_outbox_status_idx`(`status`),
    INDEX `sync_outbox_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `help_articles` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `shortAnswer` TEXT NOT NULL,
    `detailedSteps` JSON NOT NULL,
    `rolesAllowed` JSON NOT NULL,
    `routeReference` VARCHAR(191) NOT NULL,
    `relatedActions` JSON NOT NULL,
    `keywords` JSON NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `help_articles_slug_key`(`slug`),
    INDEX `help_articles_category_idx`(`category`),
    INDEX `help_articles_module_idx`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_registry` (
    `id` VARCHAR(191) NOT NULL,
    `feature_name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `route` VARCHAR(191) NOT NULL,
    `roles_required` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'available',
    `help_article_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `feature_registry_module_idx`(`module`),
    INDEX `feature_registry_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idea_notes` (
    `id` VARCHAR(191) NOT NULL,
    `dropzone_id` INTEGER NULL,
    `submitted_by_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'new',
    `affected_module` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `admin_notes` TEXT NULL,
    `reviewed_by_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idea_notes_dropzone_id_status_idx`(`dropzone_id`, `status`),
    INDEX `idea_notes_category_idx`(`category`),
    INDEX `idea_notes_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guided_tours` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `guided_tours_slug_key`(`slug`),
    INDEX `guided_tours_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guided_tour_steps` (
    `id` VARCHAR(191) NOT NULL,
    `tour_id` VARCHAR(191) NOT NULL,
    `step_number` INTEGER NOT NULL,
    `target_selector` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `position` VARCHAR(191) NOT NULL DEFAULT 'bottom',
    `route` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NULL,
    `help_article_slug` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `guided_tour_steps_tour_id_idx`(`tour_id`),
    UNIQUE INDEX `guided_tour_steps_tour_id_step_number_key`(`tour_id`, `step_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_tour_progress` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `tour_id` VARCHAR(191) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `last_step_id` VARCHAR(191) NULL,
    `completed_at` DATETIME(3) NULL,
    `dismissed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_tour_progress_user_id_tour_id_key`(`user_id`, `tour_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistant_queries` (
    `id` VARCHAR(191) NOT NULL,
    `query` TEXT NOT NULL,
    `intent` VARCHAR(50) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `currentRoute` VARCHAR(255) NULL,
    `resultType` VARCHAR(50) NOT NULL,
    `matched_feature_id` VARCHAR(191) NULL,
    `matched_article_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `assistant_queries_role_idx`(`role`),
    INDEX `assistant_queries_intent_idx`(`intent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistant_suggestions` (
    `id` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `applicableRoles` JSON NOT NULL,
    `suggested_route` VARCHAR(255) NULL,
    `applied_route` VARCHAR(255) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `assistant_suggestions_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistant_feedback` (
    `id` VARCHAR(191) NOT NULL,
    `query_id` VARCHAR(191) NOT NULL,
    `helpful` BOOLEAN NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `assistant_feedback_query_id_idx`(`query_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passkeys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `credentialId` VARCHAR(512) NOT NULL,
    `publicKey` LONGBLOB NOT NULL,
    `counter` INTEGER NOT NULL DEFAULT 0,
    `transports` JSON NOT NULL,
    `aaguid` VARCHAR(36) NULL,
    `deviceName` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,

    UNIQUE INDEX `passkeys_credentialId_key`(`credentialId`),
    INDEX `passkeys_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `provider` ENUM('GOOGLE', 'APPLE', 'GITHUB') NOT NULL,
    `providerAccountId` VARCHAR(255) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `profileData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `oauth_accounts_userId_idx`(`userId`),
    UNIQUE INDEX `oauth_accounts_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mfa_devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('TOTP', 'WEBAUTHN', 'SMS') NOT NULL,
    `secret` VARCHAR(255) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `backupCodes` JSON NULL,
    `phone` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,

    INDEX `mfa_devices_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `ipAddress` VARCHAR(45) NOT NULL,
    `userAgent` TEXT NULL,
    `success` BOOLEAN NOT NULL,
    `failureReason` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_attempts_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `login_attempts_ipAddress_createdAt_idx`(`ipAddress`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `role` ENUM('TANDEM_STUDENT', 'FUN_JUMPER', 'COACH', 'DZ_MANAGER') NOT NULL,
    `currentStep` INTEGER NOT NULL DEFAULT 1,
    `totalSteps` INTEGER NOT NULL,
    `data` JSON NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `abandonedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `onboarding_sessions_userId_idx`(`userId`),
    INDEX `onboarding_sessions_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventType` VARCHAR(100) NOT NULL,
    `channel` ENUM('PUSH', 'SMS', 'EMAIL', 'IN_APP') NOT NULL,
    `locale` VARCHAR(10) NOT NULL DEFAULT 'en',
    `subject` VARCHAR(255) NULL,
    `body` TEXT NOT NULL,
    `variables` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notification_templates_eventType_idx`(`eventType`),
    UNIQUE INDEX `notification_templates_eventType_channel_locale_key`(`eventType`, `channel`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `notificationId` INTEGER NOT NULL,
    `channel` ENUM('PUSH', 'SMS', 'EMAIL', 'IN_APP') NOT NULL,
    `providerMessageId` VARCHAR(255) NULL,
    `status` ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastAttemptAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notification_deliveries_notificationId_idx`(`notificationId`),
    INDEX `notification_deliveries_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhooks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `events` JSON NOT NULL,
    `secret` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastTriggeredAt` DATETIME(3) NULL,
    `failCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `webhooks_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stripe_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `dropzoneId` INTEGER NULL,
    `stripeAccountId` VARCHAR(255) NOT NULL,
    `accountType` VARCHAR(20) NOT NULL,
    `chargesEnabled` BOOLEAN NOT NULL DEFAULT false,
    `payoutsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `onboardingComplete` BOOLEAN NOT NULL DEFAULT false,
    `detailsSubmitted` BOOLEAN NOT NULL DEFAULT false,
    `defaultCurrency` VARCHAR(10) NOT NULL DEFAULT 'usd',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stripe_accounts_stripeAccountId_key`(`stripeAccountId`),
    INDEX `stripe_accounts_userId_idx`(`userId`),
    INDEX `stripe_accounts_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_intents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'usd',
    `stripePaymentIntentId` VARCHAR(255) NULL,
    `status` ENUM('CREATED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'CREATED',
    `description` VARCHAR(255) NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` INTEGER NULL,
    `metadata` JSON NULL,
    `refundedAmount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_intents_uuid_key`(`uuid`),
    UNIQUE INDEX `payment_intents_stripePaymentIntentId_key`(`stripePaymentIntentId`),
    INDEX `payment_intents_userId_idx`(`userId`),
    INDEX `payment_intents_dropzoneId_idx`(`dropzoneId`),
    INDEX `payment_intents_status_idx`(`status`),
    INDEX `payment_intents_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_splits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentIntentId` INTEGER NOT NULL,
    `recipientType` ENUM('DROPZONE', 'COACH', 'PLATFORM') NOT NULL,
    `recipientId` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `platformFee` INTEGER NOT NULL DEFAULT 0,
    `stripeTransferId` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payment_splits_paymentIntentId_idx`(`paymentIntentId`),
    INDEX `payment_splits_recipientType_recipientId_idx`(`recipientType`, `recipientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stripeAccountId` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'usd',
    `stripePayoutId` VARCHAR(255) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'IN_TRANSIT', 'PAID', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `scheduledAt` DATETIME(3) NULL,
    `initiatedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payouts_stripePayoutId_key`(`stripePayoutId`),
    INDEX `payouts_stripeAccountId_idx`(`stripeAccountId`),
    INDEX `payouts_status_idx`(`status`),
    INDEX `payouts_scheduledAt_idx`(`scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentIntentId` INTEGER NULL,
    `transactionId` INTEGER NULL,
    `accountType` VARCHAR(50) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `entryType` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'usd',
    `balanceAfter` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ledger_entries_accountType_accountId_idx`(`accountType`, `accountId`),
    INDEX `ledger_entries_paymentIntentId_idx`(`paymentIntentId`),
    INDEX `ledger_entries_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistant_conversations` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(255) NULL,
    `messages` JSON NOT NULL,
    `context` JSON NULL,
    `messageCount` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `assistant_conversations_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_dashboards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `layout` JSON NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isShared` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `report_dashboards_userId_idx`(`userId`),
    INDEX `report_dashboards_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_blocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dashboardId` INTEGER NOT NULL,
    `blockType` ENUM('KPI_CARD', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'DATA_TABLE', 'HEATMAP', 'FUNNEL') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `dataSource` VARCHAR(100) NOT NULL,
    `query` JSON NOT NULL,
    `position` JSON NOT NULL,
    `size` JSON NOT NULL,
    `config` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `report_blocks_dashboardId_idx`(`dashboardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dropzones` ADD CONSTRAINT `dropzones_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dz_branches` ADD CONSTRAINT `dz_branches_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aircrafts` ADD CONSTRAINT `aircrafts_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loads` ADD CONSTRAINT `loads_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loads` ADD CONSTRAINT `loads_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `dz_branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loads` ADD CONSTRAINT `loads_aircraftId_fkey` FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loads` ADD CONSTRAINT `loads_pilotId_fkey` FOREIGN KEY (`pilotId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slots` ADD CONSTRAINT `slots_loadId_fkey` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slots` ADD CONSTRAINT `slots_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slots` ADD CONSTRAINT `slots_instructorId_fkey` FOREIGN KEY (`instructorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slots` ADD CONSTRAINT `slots_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_captainId_fkey` FOREIGN KEY (`captainId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_tokens` ADD CONSTRAINT `qr_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_tokens` ADD CONSTRAINT `qr_tokens_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waivers` ADD CONSTRAINT `waivers_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waiver_signatures` ADD CONSTRAINT `waiver_signatures_waiverId_fkey` FOREIGN KEY (`waiverId`) REFERENCES `waivers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waiver_signatures` ADD CONSTRAINT `waiver_signatures_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emergency_profiles` ADD CONSTRAINT `emergency_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gear_items` ADD CONSTRAINT `gear_items_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gear_items` ADD CONSTRAINT `gear_items_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gear_checks` ADD CONSTRAINT `gear_checks_gearItemId_fkey` FOREIGN KEY (`gearItemId`) REFERENCES `gear_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gear_checks` ADD CONSTRAINT `gear_checks_checkedById_fkey` FOREIGN KEY (`checkedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gear_checks` ADD CONSTRAINT `gear_checks_loadId_fkey` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_loadId_fkey` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_gearItemId_fkey` FOREIGN KEY (`gearItemId`) REFERENCES `gear_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_outbox` ADD CONSTRAINT `sync_outbox_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_outbox` ADD CONSTRAINT `sync_outbox_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `idea_notes` ADD CONSTRAINT `idea_notes_dropzone_id_fkey` FOREIGN KEY (`dropzone_id`) REFERENCES `dropzones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `idea_notes` ADD CONSTRAINT `idea_notes_submitted_by_id_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `idea_notes` ADD CONSTRAINT `idea_notes_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guided_tour_steps` ADD CONSTRAINT `guided_tour_steps_tour_id_fkey` FOREIGN KEY (`tour_id`) REFERENCES `guided_tours`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_tour_progress` ADD CONSTRAINT `user_tour_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assistant_feedback` ADD CONSTRAINT `assistant_feedback_query_id_fkey` FOREIGN KEY (`query_id`) REFERENCES `assistant_queries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passkeys` ADD CONSTRAINT `passkeys_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mfa_devices` ADD CONSTRAINT `mfa_devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_sessions` ADD CONSTRAINT `onboarding_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_deliveries` ADD CONSTRAINT `notification_deliveries_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stripe_accounts` ADD CONSTRAINT `stripe_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stripe_accounts` ADD CONSTRAINT `stripe_accounts_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_intents` ADD CONSTRAINT `payment_intents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_intents` ADD CONSTRAINT `payment_intents_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_splits` ADD CONSTRAINT `payment_splits_paymentIntentId_fkey` FOREIGN KEY (`paymentIntentId`) REFERENCES `payment_intents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payouts` ADD CONSTRAINT `payouts_stripeAccountId_fkey` FOREIGN KEY (`stripeAccountId`) REFERENCES `stripe_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_paymentIntentId_fkey` FOREIGN KEY (`paymentIntentId`) REFERENCES `payment_intents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assistant_conversations` ADD CONSTRAINT `assistant_conversations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_dashboards` ADD CONSTRAINT `report_dashboards_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_dashboards` ADD CONSTRAINT `report_dashboards_dropzoneId_fkey` FOREIGN KEY (`dropzoneId`) REFERENCES `dropzones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_blocks` ADD CONSTRAINT `report_blocks_dashboardId_fkey` FOREIGN KEY (`dashboardId`) REFERENCES `report_dashboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

