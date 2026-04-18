# Main-5

## Status
Drafted from exported design review.

## Critical Migration Rule
Do not delete or replace any existing production or legacy page until the new page is implemented, reviewed, QA checked, and migration sign-off is complete.

## Screen Purpose
Tunnel flyer profile

## Main UI Groups
- Flying hours
- Role type
- Preferred tunnels

## Expected Interactions
- Support loading, empty, validation, success, and error states.
- Keep navigation backward compatible during migration.
- Preserve old route behavior until redirect strategy is approved.

## Data Requirements
- Define typed request/response contracts before implementation.
- Do not hardcode enum values without central constants.
- Track completion state for onboarding-related screens.

## Implementation Notes
- Build mobile first.
- Extract reusable components where possible.
- Keep design tokens centralized.
- Add analytics events for primary CTAs.

## QA / Migration Checks
- Old page remains accessible until the new page is validated.
- New route can be feature-flagged if needed.
- Copy, spacing, and CTA hierarchy should match design intent.
