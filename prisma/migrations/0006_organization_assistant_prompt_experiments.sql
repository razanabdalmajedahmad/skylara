-- Phase 26: org-scoped assistant prompt template experiments (registry ids only).
CREATE TABLE `organization_assistant_prompt_experiments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `organizationId` INT NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `experimentTemplateId` VARCHAR(120) NOT NULL,
  `cohortTiers` JSON NULL,
  `rolloutPercent` INT NOT NULL DEFAULT 100,
  `experimentKey` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `organization_assistant_prompt_experiments_organizationId_key` (`organizationId`),
  CONSTRAINT `organization_assistant_prompt_experiments_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
