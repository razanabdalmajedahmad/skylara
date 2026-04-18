/**
 * SkyLara API Diagnostic Script
 * Run with: npx tsx diagnose.ts
 */

async function diagnose() {
  console.log("\n🔍 SkyLara API Diagnostics\n");
  console.log("=".repeat(50));

  // 1. Check env
  console.log("\n1️⃣  Environment Variables:");
  const required = ["DATABASE_URL", "JWT_SECRET", "PORT", "CORS_ORIGIN", "NODE_ENV"];
  for (const key of required) {
    const val = process.env[key];
    if (val) {
      const display = key === "JWT_SECRET" ? val.substring(0, 10) + "..." : val;
      console.log(`   ✅ ${key} = ${display}`);
    } else {
      console.log(`   ❌ ${key} is NOT SET`);
    }
  }

  // 2. Check database connection
  console.log("\n2️⃣  Database Connection:");
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log("   ✅ Database connected successfully");

    // 3. Check if tables exist
    console.log("\n3️⃣  Database Tables:");
    try {
      const userCount = await prisma.user.count();
      console.log(`   ✅ users table exists (${userCount} rows)`);
    } catch (e: any) {
      console.log(`   ❌ users table error: ${e.message.substring(0, 100)}`);
    }

    try {
      const dzCount = await prisma.dropzone.count();
      console.log(`   ✅ dropzones table exists (${dzCount} rows)`);
    } catch (e: any) {
      console.log(`   ❌ dropzones table error: ${e.message.substring(0, 100)}`);
    }

    await prisma.$disconnect();
  } catch (e: any) {
    console.log(`   ❌ Database connection FAILED: ${e.message}`);
    console.log("\n   💡 Fix: Run these commands:");
    console.log("      mysql -u root -e 'CREATE DATABASE IF NOT EXISTS skylara;'");
    console.log("      npm run db:push");
    console.log("      npm run db:seed:all");
  }

  // 4. Check key npm packages
  console.log("\n4️⃣  Key Dependencies:");
  const packages = [
    "fastify",
    "@fastify/cors",
    "@fastify/helmet",
    "@fastify/jwt",
    "@fastify/rate-limit",
    "@fastify/websocket",
    "@prisma/client",
    "@simplewebauthn/server",
    "otplib",
    "stripe",
    "zod",
    "@sinclair/typebox",
  ];
  for (const pkg of packages) {
    try {
      require.resolve(pkg);
      console.log(`   ✅ ${pkg}`);
    } catch {
      console.log(`   ❌ ${pkg} — MISSING`);
    }
  }

  // 5. Try loading each route file
  console.log("\n5️⃣  Route Files (import check):");
  const routes = [
    "./apps/api/src/routes/auth",
    "./apps/api/src/routes/identity",
    "./apps/api/src/routes/manifest",
    "./apps/api/src/routes/payments",
    "./apps/api/src/routes/gear",
    "./apps/api/src/routes/safety",
    "./apps/api/src/routes/notifications",
    "./apps/api/src/routes/admin",
    "./apps/api/src/routes/sync",
    "./apps/api/src/routes/supportIndex",
    "./apps/api/src/routes/weather",
    "./apps/api/src/routes/reports",
    "./apps/api/src/routes/authAdvanced",
    "./apps/api/src/routes/onboarding",
    "./apps/api/src/routes/notificationsAdvanced",
    "./apps/api/src/routes/paymentsAdvanced",
    "./apps/api/src/routes/assistantAdvanced",
    "./apps/api/src/routes/reportBuilder",
  ];
  for (const route of routes) {
    try {
      require(route);
      console.log(`   ✅ ${route.split("/").pop()}`);
    } catch (e: any) {
      console.log(`   ❌ ${route.split("/").pop()} — ${e.message.substring(0, 80)}`);
    }
  }

  // 6. Try loading plugins
  console.log("\n6️⃣  Plugin Files:");
  const plugins = [
    "./apps/api/src/plugins/prisma",
    "./apps/api/src/plugins/auth",
    "./apps/api/src/plugins/websocket",
    "./apps/api/src/plugins/notifications",
  ];
  for (const plugin of plugins) {
    try {
      require(plugin);
      console.log(`   ✅ ${plugin.split("/").pop()}`);
    } catch (e: any) {
      console.log(`   ❌ ${plugin.split("/").pop()} — ${e.message.substring(0, 80)}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Done.\n");
}

diagnose().catch((e) => {
  console.error("Diagnostic script failed:", e.message);
});
