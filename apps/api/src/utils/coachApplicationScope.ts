import type { Prisma, PrismaClient } from "@prisma/client";

/** User IDs that have any role scoped to this dropzone (used to surface legacy coach apps with null dropzoneId). */
export async function getUserIdsWithRoleAtDropzone(
  prisma: PrismaClient,
  dropzoneId: number
): Promise<number[]> {
  const rows = await prisma.userRole.findMany({
    where: { dropzoneId },
    select: { userId: true },
  });
  return [...new Set(rows.map((r) => r.userId))];
}

/**
 * Tenant filter: explicit dropzone on the application OR legacy null tied to a user who belongs to this DZ.
 */
export function coachApplicationWhereForTenant(
  dropzoneId: number,
  base: Prisma.CoachApplicationWhereInput,
  userIdsAtDropzone: number[]
): Prisma.CoachApplicationWhereInput {
  const or: Prisma.CoachApplicationWhereInput[] = [{ dropzoneId }];
  if (userIdsAtDropzone.length > 0) {
    or.push({
      AND: [{ dropzoneId: null }, { userId: { in: userIdsAtDropzone } }],
    });
  }
  return { AND: [base, { OR: or }] };
}

/** Whether a DZ manager may access this row (not platform admin). */
export async function coachApplicationAccessibleToDropzone(
  prisma: PrismaClient,
  app: { dropzoneId: number | null; userId: number | null },
  dropzoneId: number
): Promise<boolean> {
  if (app.dropzoneId === dropzoneId) return true;
  if (app.dropzoneId != null) return false;
  if (app.userId == null) return false;
  const role = await prisma.userRole.findFirst({
    where: { userId: app.userId, dropzoneId },
    select: { id: true },
  });
  return !!role;
}
