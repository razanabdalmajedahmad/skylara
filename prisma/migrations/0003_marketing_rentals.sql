-- ============================================================================
-- Migration: Marketing & Engagement + Property Rentals Module
-- Per SkyLara_Marketing_Engagement_Module_Master_Spec.md
-- Per SkyLara_Property_Rentals_Accommodation_Marketplace_Master_Spec.md
-- ============================================================================

-- ── MARKETING CAMPAIGNS ──────────────────────────────────

CREATE TABLE IF NOT EXISTS `marketing_audiences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `filters` JSON NOT NULL,
    `estimatedSize` INTEGER NOT NULL DEFAULT 0,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `marketing_audiences_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `marketing_templates_v2` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `channel` VARCHAR(50) NOT NULL,
    `subject` VARCHAR(500) NULL,
    `body` TEXT NOT NULL,
    `variables` JSON NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `marketing_templates_v2_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `marketing_campaigns_v2` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `channel` VARCHAR(50) NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `audienceId` INTEGER NULL,
    `templateId` INTEGER NULL,
    `scheduledAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `pausedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `sendCount` INTEGER NOT NULL DEFAULT 0,
    `openCount` INTEGER NOT NULL DEFAULT 0,
    `clickCount` INTEGER NOT NULL DEFAULT 0,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `marketing_campaigns_v2_dropzoneId_status_idx`(`dropzoneId`, `status`),
    INDEX `marketing_campaigns_v2_scheduledAt_idx`(`scheduledAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_mc_audience` FOREIGN KEY (`audienceId`) REFERENCES `marketing_audiences`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_mc_template` FOREIGN KEY (`templateId`) REFERENCES `marketing_templates_v2`(`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `marketing_sends` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaignId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `channel` VARCHAR(50) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `clickedAt` DATETIME(3) NULL,
    `failReason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `marketing_sends_campaignId_status_idx`(`campaignId`, `status`),
    INDEX `marketing_sends_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_ms_campaign` FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns_v2`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── MARKETING JOURNEYS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS `marketing_journeys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `triggerEvent` VARCHAR(100) NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `steps` JSON NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `marketing_journeys_dropzoneId_status_idx`(`dropzoneId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `journey_enrollments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `journeyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `currentStep` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `lastStepAt` DATETIME(3) NULL,
    UNIQUE INDEX `journey_enrollments_journeyId_userId_key`(`journeyId`, `userId`),
    INDEX `journey_enrollments_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_je_journey` FOREIGN KEY (`journeyId`) REFERENCES `marketing_journeys`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── SURVEYS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `surveys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `surveyType` VARCHAR(50) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `triggerEvent` VARCHAR(100) NULL,
    `questions` JSON NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `surveys_dropzoneId_status_idx`(`dropzoneId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `survey_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `surveyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `answers` JSON NOT NULL,
    `npsScore` INTEGER NULL,
    `csatScore` INTEGER NULL,
    `comment` TEXT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `survey_responses_surveyId_userId_key`(`surveyId`, `userId`),
    INDEX `survey_responses_surveyId_idx`(`surveyId`),
    INDEX `survey_responses_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_sr_survey` FOREIGN KEY (`surveyId`) REFERENCES `surveys`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── REFERRALS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `referral_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrerId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NULL,
    `code` VARCHAR(50) NOT NULL,
    `url` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CLAIMED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `clickCount` INTEGER NOT NULL DEFAULT 0,
    `conversionCount` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `referral_links_code_key`(`code`),
    INDEX `referral_links_referrerId_idx`(`referrerId`),
    INDEX `referral_links_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referral_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `linkId` INTEGER NOT NULL,
    `referredUserId` INTEGER NULL,
    `eventType` VARCHAR(50) NOT NULL,
    `metadata` JSON NULL,
    `rewardIssued` BOOLEAN NOT NULL DEFAULT FALSE,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `referral_events_linkId_idx`(`linkId`),
    INDEX `referral_events_referredUserId_idx`(`referredUserId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_re_link` FOREIGN KEY (`linkId`) REFERENCES `referral_links`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── GAMIFICATION ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `gamification_badges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `category` VARCHAR(50) NOT NULL,
    `criteria` JSON NOT NULL,
    `pointsValue` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `gamification_badges_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_user_badges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `badgeId` INTEGER NOT NULL,
    `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notified` BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE INDEX `gamification_user_badges_userId_badgeId_key`(`userId`, `badgeId`),
    INDEX `gamification_user_badges_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_gub_badge` FOREIGN KEY (`badgeId`) REFERENCES `gamification_badges`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_point_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NULL,
    `points` INTEGER NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `gamification_point_events_userId_idx`(`userId`),
    INDEX `gamification_point_events_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_streaks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `streakType` VARCHAR(50) NOT NULL,
    `currentCount` INTEGER NOT NULL DEFAULT 0,
    `longestCount` INTEGER NOT NULL DEFAULT 0,
    `lastEventAt` DATETIME(3) NULL,
    `resetAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `gamification_streaks_userId_streakType_key`(`userId`, `streakType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_leaderboards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `metric` VARCHAR(100) NOT NULL,
    `window` ENUM('ALL_TIME', 'WEEKLY', 'MONTHLY', 'SEASONAL') NOT NULL DEFAULT 'ALL_TIME',
    `discipline` VARCHAR(50) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `gamification_leaderboards_dropzoneId_idx`(`dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_leaderboard_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `leaderboardId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `rank` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `gamification_leaderboard_entries_lbId_userId_periodStart_key`(`leaderboardId`, `userId`, `periodStart`),
    INDEX `gamification_leaderboard_entries_leaderboardId_rank_idx`(`leaderboardId`, `rank`),
    INDEX `gamification_leaderboard_entries_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_gle_lb` FOREIGN KEY (`leaderboardId`) REFERENCES `gamification_leaderboards`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_reward_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `pointsCost` INTEGER NOT NULL,
    `rewardType` VARCHAR(50) NOT NULL,
    `rewardValue` VARCHAR(255) NULL,
    `maxClaims` INTEGER NULL,
    `claimCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `gamification_reward_rules_dropzoneId_isActive_idx`(`dropzoneId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_reward_claims` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ruleId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `pointsSpent` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `fulfilledAt` DATETIME(3) NULL,
    `fulfilledById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `gamification_reward_claims_userId_idx`(`userId`),
    INDEX `gamification_reward_claims_ruleId_status_idx`(`ruleId`, `status`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_grc_rule` FOREIGN KEY (`ruleId`) REFERENCES `gamification_reward_rules`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_spin_campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    `prizes` JSON NOT NULL,
    `maxSpinsPerUser` INTEGER NOT NULL DEFAULT 1,
    `legalNote` TEXT NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `gamification_spin_campaigns_dropzoneId_status_idx`(`dropzoneId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gamification_spin_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaignId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `prizeName` VARCHAR(255) NOT NULL,
    `prizeValue` VARCHAR(255) NULL,
    `claimed` BOOLEAN NOT NULL DEFAULT FALSE,
    `claimedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `gamification_spin_results_campaignId_idx`(`campaignId`),
    INDEX `gamification_spin_results_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_gsr_campaign` FOREIGN KEY (`campaignId`) REFERENCES `gamification_spin_campaigns`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── LOCAL NEWS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `local_news_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `imageUrl` VARCHAR(500) NULL,
    `linkUrl` VARCHAR(500) NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT FALSE,
    `publishedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `local_news_items_dropzoneId_publishedAt_idx`(`dropzoneId`, `publishedAt`),
    INDEX `local_news_items_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── MARKETING PREFERENCES & COMPLIANCE ───────────────────

CREATE TABLE IF NOT EXISTS `user_marketing_preferences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NULL,
    `emailOptIn` BOOLEAN NOT NULL DEFAULT TRUE,
    `smsOptIn` BOOLEAN NOT NULL DEFAULT FALSE,
    `pushOptIn` BOOLEAN NOT NULL DEFAULT TRUE,
    `whatsappOptIn` BOOLEAN NOT NULL DEFAULT FALSE,
    `cadenceLimit` VARCHAR(50) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `user_marketing_preferences_userId_dropzoneId_key`(`userId`, `dropzoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `marketing_compliance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `reason` TEXT NULL,
    `actorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `marketing_compliance_records_dropzoneId_entityType_idx`(`dropzoneId`, `entityType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════
-- PROPERTY RENTALS & ACCOMMODATION
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `rental_hosts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `displayName` VARCHAR(255) NOT NULL,
    `bio` TEXT NULL,
    `phoneNumber` VARCHAR(30) NULL,
    `hostType` ENUM('INDIVIDUAL', 'BUSINESS', 'DROPZONE', 'PARTNER') NOT NULL DEFAULT 'INDIVIDUAL',
    `stripeConnectId` VARCHAR(255) NULL,
    `payoutEnabled` BOOLEAN NOT NULL DEFAULT FALSE,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `rental_hosts_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rental_listings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dropzoneId` INTEGER NOT NULL,
    `hostId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `listingType` ENUM('HOTEL_ROOM', 'APARTMENT', 'VILLA', 'ROOM_SHARE', 'BUNKHOUSE', 'HOSTEL_BED', 'RV_HOOKUP', 'CAMPSITE', 'MONTHLY_FURNISHED', 'EVENT_PACKAGE', 'DZ_MANAGED') NOT NULL,
    `hostType` ENUM('INDIVIDUAL', 'BUSINESS', 'DROPZONE', 'PARTNER') NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `city` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `distanceToDropzone` DOUBLE NOT NULL,
    `sleepingCapacity` INTEGER NOT NULL DEFAULT 1,
    `bathrooms` INTEGER NOT NULL DEFAULT 1,
    `petPolicy` ENUM('ALLOWED', 'NOT_ALLOWED', 'BY_REQUEST') NOT NULL DEFAULT 'NOT_ALLOWED',
    `cancellationPolicy` ENUM('FLEXIBLE', 'MODERATE', 'STRICT') NOT NULL DEFAULT 'MODERATE',
    `visibility` ENUM('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `complianceStatus` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'DRAFT',
    `bookingMode` ENUM('INSTANT_BOOK', 'REQUEST_TO_BOOK', 'HOLD_THEN_CONFIRM', 'EXTERNAL_REDIRECT', 'PARTNER_BOOKING') NOT NULL DEFAULT 'REQUEST_TO_BOOK',
    `basePrice` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `weeklyDiscount` DOUBLE NULL,
    `monthlyDiscount` DOUBLE NULL,
    `amenities` JSON NULL,
    `skydiverAmenities` JSON NULL,
    `heroImageUrl` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `rental_listings_slug_key`(`slug`),
    INDEX `rental_listings_dropzoneId_visibility_idx`(`dropzoneId`, `visibility`),
    INDEX `rental_listings_city_idx`(`city`),
    INDEX `rental_listings_latitude_longitude_idx`(`latitude`, `longitude`),
    INDEX `rental_listings_listingType_idx`(`listingType`),
    INDEX `rental_listings_basePrice_idx`(`basePrice`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rl_host` FOREIGN KEY (`hostId`) REFERENCES `rental_hosts`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rental_photos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `caption` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `rental_photos_listingId_idx`(`listingId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rp_listing` FOREIGN KEY (`listingId`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rental_availability_blocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` INTEGER NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    `priceOverride` DECIMAL(10, 2) NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `rental_availability_blocks_listingId_startDate_endDate_idx`(`listingId`, `startDate`, `endDate`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rab_listing` FOREIGN KEY (`listingId`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rental_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `listingId` INTEGER NOT NULL,
    `guestId` INTEGER NOT NULL,
    `checkInDate` DATE NOT NULL,
    `checkOutDate` DATE NOT NULL,
    `numberOfGuests` INTEGER NOT NULL DEFAULT 1,
    `numberOfNights` INTEGER NOT NULL,
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `bookingFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'HELD', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `bookingMode` ENUM('INSTANT_BOOK', 'REQUEST_TO_BOOK', 'HOLD_THEN_CONFIRM', 'EXTERNAL_REDIRECT', 'PARTNER_BOOKING') NOT NULL,
    `paymentStatus` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `paymentIntentId` VARCHAR(255) NULL,
    `hostPayoutStatus` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `cancellationReason` TEXT NULL,
    `cancellationBy` VARCHAR(30) NULL,
    `specialRequests` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `rental_bookings_uuid_key`(`uuid`),
    INDEX `rental_bookings_listingId_status_idx`(`listingId`, `status`),
    INDEX `rental_bookings_guestId_idx`(`guestId`),
    INDEX `rental_bookings_checkInDate_idx`(`checkInDate`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rb_listing` FOREIGN KEY (`listingId`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rental_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `bookingId` INTEGER NULL,
    `rating` INTEGER NOT NULL,
    `title` VARCHAR(255) NULL,
    `body` TEXT NULL,
    `hostResponse` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `rental_reviews_listingId_idx`(`listingId`),
    INDEX `rental_reviews_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rr_listing` FOREIGN KEY (`listingId`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rental_saved_properties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `listingId` INTEGER NOT NULL,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `rental_saved_properties_userId_listingId_key`(`userId`, `listingId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rsp_listing` FOREIGN KEY (`listingId`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rental_compliance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` INTEGER NOT NULL,
    `dropzoneId` INTEGER NOT NULL,
    `approvalState` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'DRAFT',
    `permitMetadata` JSON NULL,
    `complianceNotes` TEXT NULL,
    `documentUrls` JSON NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `rental_compliance_records_listingId_idx`(`listingId`),
    INDEX `rental_compliance_records_dropzoneId_approvalState_idx`(`dropzoneId`, `approvalState`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rcr_listing` FOREIGN KEY (`listingId`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
