# Multi-stage Dockerfile for SkyLara monorepo
# Stage 1: Base - install dependencies
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files for all workspaces
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/knowledge-base/package.json ./packages/knowledge-base/
COPY packages/portal-assistant/package.json ./packages/portal-assistant/
COPY packages/walkthroughs/package.json ./packages/walkthroughs/

# Stage 2: Builder - compile TypeScript and build Next.js
FROM base AS builder

WORKDIR /app

# Install all dependencies
RUN npm ci

# Copy source code
COPY tsconfig.base.json turbo.json ./
COPY prisma ./prisma
COPY apps ./apps
COPY packages ./packages

# Generate Prisma client
RUN npm run db:generate

# Build all packages
RUN npm run build

# Stage 3: Runner - minimal production image
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy package files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/knowledge-base/package.json ./packages/knowledge-base/
COPY packages/portal-assistant/package.json ./packages/portal-assistant/
COPY packages/walkthroughs/package.json ./packages/walkthroughs/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy built applications
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Next.js public files
COPY --chown=nextjs:nodejs apps/web/public ./apps/web/public

# Expose ports
EXPOSE 3000 3001

USER nextjs

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Default: start API (override per service in docker-compose)
CMD ["node", "apps/api/dist/index.js"]
