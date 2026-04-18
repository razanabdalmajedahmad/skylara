# 99_Claude_Runbook

## Command
```bash
cd /path/to/your/skylara-repo
claude
```

## Best main audit prompt
```text
Act as the owner-level CTO, CPO, Principal Systems Architect, Principal Aviation Operations Product Architect, Principal Full-Stack Engineer, Principal UX Architect, Principal QA Lead, Principal Data Architect, Principal DevOps Lead, Principal Security Architect, and Principal Rules Engine Architect for SkyLara.

Read:
- CLAUDE.md
- docs/00_Master_Index.md
- docs/SkyLara_Compiled_Modern_Implementation_Gap_Spec.md
- docs/SkyLara_Expert_Feedback_Integrated_Implementation_Update.md

Then identify the minimum relevant docs from /docs for this task before coding.

Mission:
Use the current SkyLara docs as source of truth and implement the missing or incomplete modules, features, dashboards, backend services, frontend routes, mobile/PWA flows, and user workflows required for a production-grade global SkyLara platform.

Non-negotiable rules:
1. Keep V1 as a modular monolith with strict service boundaries.
2. Build one backend truth for web, dashboard, PWA, and mobile.
3. Do not create duplicate backend logic or duplicate mobile/web truth.
4. Do not bypass deterministic safety, compliance, CG, payment, weather, qualification, or pilot-approval gates.
5. AI may recommend and prioritize, but cannot override pilot authority or hard safety/compliance rules.
6. Design for a real platform that can serve 1,000 dropzones and 1,000,000 users over time.
7. Never mark a feature complete unless backend persistence, real UI wiring, refresh-safe behavior, testing, and operational logic are working.
8. Remove, merge, or replace outdated, conflicting, duplicate, placeholder, or dead implementations if they exist.

Start with audit only, no coding.

Return:
1. selected docs for this task
2. reusable models, APIs, and event hooks already in the repo
3. missing or incomplete modules and features compared with the selected docs
4. outdated or conflicting implementations that should be removed or merged
5. exact files to create or edit
6. schema changes needed
7. API groups to add
8. dashboard routes and UI pieces to add
9. CI/CD and testing updates required
10. implementation risks
11. recommended Phase 1
```

## Best phase implementation prompt
```text
Implement recommended Phase 1 only.

Before coding:
- restate selected docs
- restate exact files you will edit
- restate reusable models, APIs, event hooks, and settings systems

After coding, return:
- scope implemented
- files created
- files edited
- schema changes
- APIs reused
- new APIs added
- event hooks reused or added
- QA steps
- blockers
- next recommended phase
```
