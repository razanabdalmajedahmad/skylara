# 98_Document_Cleanup_Decisions

This file records what was removed from the clean docs pack and why.

## Removed as duplicates or superseded
- `SkyLara_DMS_SystemDesign.md`
  - Duplicate of `03_DMS_System_Design.md`
- `sky_lara_mobile_master_build_process.md`
  - Duplicate or alternate filename of `SkyLara_Mobile_Master_Build_Process.md`
- `Building_SkyLara_AI_Agents_for_Manifest,_Weather,_and_Aircraft_Planning.md`
  - Superseded by `Building_SkyLara_AI_Agents_Master_Implementation.md`
- `Rig_Maintenance_Tracking_Master_Spec.md`
  - Superseded by `SkyLara_Rig_Maintenance_Complete_Master_File.md`
- `SkyLara_Learning_Subscriptions_Module_Master_Spec_FINAL.md`
  - Renamed into canonical `SkyLara_Learning_Subscriptions_Module_Master_Spec.md`

## Removed as obsolete prompt-pack or helper files
- `CLAUDE_updated_for_32_docs.md`
- `CLAUDE_updated_for_SkyLara.md`
- `CLAUDE_FINAL_SkyLara.md`
  - Replaced by root `CLAUDE.md`
- `00_Master_Index_FINAL.md`
  - Replaced by canonical `docs/00_Master_Index.md`
- `SkyLara_Claude_Code_Command_And_Prompt_Pack.md`
- `SkyLara_Claude_Code_Command_And_Prompt_Pack_32.md`
- `SkyLara_Final_Command_And_Prompt_Pack.md`
  - Replaced by `99_Claude_Runbook.md` and root `CLAUDE.md`
- `SkyLara_All_32_MD_Files_List.md`
- `SkyLara_MD_Files_List.txt`
  - Inventory helpers only, not source-of-truth docs

## Removed as implementation artifact, not source doc
- `PRISMA_SCHEMA_ADDITIONS_PHASE3.ts`
  - Engineering artifact, not a canonical architecture or product spec
- `.DS_Store`
- `.claude/settings.local.json`
- `__MACOSX/*`
  - Local or packaging artifacts only

## Canonical rule
For each domain, keep one canonical module spec and archive or delete older duplicates.
