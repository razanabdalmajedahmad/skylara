-- Optional maintenance scripts for coach_applications.dropzone_id (MySQL).
-- Review and run in a transaction during a maintenance window.
-- Prisma schema already includes dropzoneId; use `prisma db push` or migrations to apply DDL.

-- 1) Example: attach a known dropzone to a single application by id
-- UPDATE coach_applications SET dropzone_id = ? WHERE id = ?;

-- 2) Example: backfill from applicant's user role at a dropzone (may need deduplication if users have multiple DZ roles)
-- UPDATE coach_applications ca
-- INNER JOIN (
--   SELECT user_id, MIN(dropzone_id) AS dz_id
--   FROM user_roles
--   WHERE dropzone_id IS NOT NULL
--   GROUP BY user_id
-- ) ur ON ur.user_id = ca.user_id
-- SET ca.dropzone_id = ur.dz_id
-- WHERE ca.dropzone_id IS NULL AND ca.user_id IS NOT NULL;

-- 3) Verify unscoped rows (platform review)
-- SELECT id, email, application_type, user_id, dropzone_id, status FROM coach_applications WHERE dropzone_id IS NULL;
