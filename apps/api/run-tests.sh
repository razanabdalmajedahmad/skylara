#!/bin/bash
# Run all test files in safe isolation to avoid Prisma DB contention.
# Usage: ./run-tests.sh

set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  SkyLara API Test Suite (147 tests)"
echo "============================================"
echo ""

TOTAL=0
FAILED=0

# Unit tests (no DB, run together)
echo "--- Unit Tests ---"
RESULT=$(npx vitest run \
  src/__tests__/cgCalculator.test.ts \
  src/__tests__/weatherThresholdEngine.test.ts \
  src/__tests__/policyEngine.test.ts \
  src/__tests__/circuitBreaker.test.ts \
  src/__tests__/rigMaintenanceEngine.test.ts \
  src/__tests__/verificationService.test.ts \
  2>&1)
COUNT=$(echo "$RESULT" | grep -oE '[0-9]+ passed' | tail -1 | grep -oE '[0-9]+')
TOTAL=$((TOTAL + COUNT))
echo "  $COUNT tests passed"

# Integration tests (one at a time for DB isolation)
echo ""
echo "--- Integration Tests ---"
for f in auth manifest payments waitlistService marketing rentals; do
  RESULT=$(npx vitest run "src/__tests__/${f}.test.ts" 2>&1)
  COUNT=$(echo "$RESULT" | grep -oE '[0-9]+ passed' | tail -1 | grep -oE '[0-9]+')
  FAIL=$(echo "$RESULT" | grep -oE '[0-9]+ failed' | head -1 | grep -oE '[0-9]+' || echo "0")
  TOTAL=$((TOTAL + COUNT))
  FAILED=$((FAILED + ${FAIL:-0}))
  if [ "${FAIL:-0}" = "0" ]; then
    echo "  $f: $COUNT passed"
  else
    echo "  $f: $COUNT passed, $FAIL FAILED"
  fi
done

echo ""
echo "============================================"
echo "  TOTAL: $TOTAL passed, $FAILED failed"
echo "============================================"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
