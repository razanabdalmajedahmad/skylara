import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    // Each test file seeds its own data with unique suffixes and cleans up in afterAll.
    // No globalSetup needed — files are self-contained.
    // Retry once for transient Prisma P2034 (write conflict) during cleanup overlap.
    retry: 1,
  },
});
