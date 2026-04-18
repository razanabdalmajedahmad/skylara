-- Phase 23: optional per-organization portal assistant prompt template pin (registry id).
ALTER TABLE `organizations` ADD COLUMN `assistantPromptTemplateId` VARCHAR(120) NULL;
