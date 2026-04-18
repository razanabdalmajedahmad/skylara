-- Phase 25: durable org-scoped audit for assistant prompt template pins (no prompt bodies).
CREATE TABLE `organization_assistant_prompt_template_changes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `organizationId` INT NOT NULL,
  `previousTemplateId` VARCHAR(120) NULL,
  `newTemplateId` VARCHAR(120) NULL,
  `actorUserId` INT NULL,
  `actorRoleSummary` VARCHAR(256) NULL,
  `changeSource` VARCHAR(64) NOT NULL DEFAULT 'dashboard_put',
  `effectiveSelectionSource` VARCHAR(40) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `organization_assistant_prompt_template_changes_organizationId_createdAt_idx` (`organizationId`, `createdAt`),
  CONSTRAINT `organization_assistant_prompt_template_changes_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `organization_assistant_prompt_template_changes_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
