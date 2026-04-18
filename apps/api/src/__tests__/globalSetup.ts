import { PrismaClient } from "@prisma/client";

/**
 * Global test setup — cleans ALL test-tagged data from previous runs.
 * Test data is identified by emails containing "@skylara.test" and
 * slugs containing "test-".
 */
export async function setup() {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "error";

  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  try {
    // Use raw SQL with FK checks disabled — safest way to clean test data
    const tables = [
      "DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@skylara.test')",
      "DELETE FROM slots WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@skylara.test')",
      "DELETE FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@skylara.test'))",
      "DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@skylara.test')",
      "DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@skylara.test')",
      "DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@skylara.test')",
      "DELETE FROM slots WHERE load_id IN (SELECT id FROM loads WHERE dropzone_id IN (SELECT id FROM dropzones WHERE slug LIKE '%test-%'))",
      "DELETE FROM waitlist_entries WHERE dropzone_id IN (SELECT id FROM dropzones WHERE slug LIKE '%test-%')",
      "DELETE FROM loads WHERE dropzone_id IN (SELECT id FROM dropzones WHERE slug LIKE '%test-%')",
      "DELETE FROM aircrafts WHERE dropzone_id IN (SELECT id FROM dropzones WHERE slug LIKE '%test-%')",
      "DELETE FROM dz_branches WHERE dropzone_id IN (SELECT id FROM dropzones WHERE slug LIKE '%test-%')",
      "DELETE FROM dropzones WHERE slug LIKE '%test-%'",
      "DELETE FROM organizations WHERE slug LIKE '%test-org-%'",
      "DELETE FROM users WHERE email LIKE '%@skylara.test'",
    ];

    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const sql of tables) {
      await prisma.$executeRawUnsafe(sql).catch(() => {});
    }
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  } catch (e) {
    // Non-fatal — tests create their own data
  } finally {
    await prisma.$disconnect();
  }
}

export async function teardown() {
  // Each test file handles its own cleanup in afterAll
}
