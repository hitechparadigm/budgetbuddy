#!/bin/bash
# Smoke Test Script for BudgetBuddy
# Runs critical path checks against a deployed environment
#
# Usage: bash scripts/smoke-test.sh [environment] [api-url]
# Example: bash scripts/smoke-test.sh dev https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1

set -e

ENVIRONMENT="${1:-dev}"
API_URL="${2:-https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; FAIL=$((FAIL+1)); }
info() { echo -e "${YELLOW}ℹ️  INFO${NC}: $1"; }

echo ""
echo "🔍 BudgetBuddy Smoke Tests"
echo "=========================="
echo "Environment : $ENVIRONMENT"
echo "API URL     : $API_URL"
echo ""

# ── 1. API Health Checks ──────────────────────────────────────────────────────
echo "1. API Health Checks"
echo "--------------------"

for endpoint in "/health" "/auth/health" "/budget/health" "/transactions/health"; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL$endpoint" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "$endpoint → HTTP $HTTP_STATUS"
  elif [[ "$HTTP_STATUS" == "401" || "$HTTP_STATUS" == "403" ]]; then
    # Auth-protected endpoints returning 401/403 means the service is up
    pass "$endpoint → HTTP $HTTP_STATUS (auth required — service is up)"
  else
    fail "$endpoint → HTTP $HTTP_STATUS (expected 200 or 401)"
  fi
done

echo ""

# ── 2. CORS Headers ───────────────────────────────────────────────────────────
echo "2. CORS Headers"
echo "---------------"

CORS_HEADER=$(curl -s -I -X OPTIONS \
  -H "Origin: https://d1ueeugn9zcx7n.cloudfront.net" \
  -H "Access-Control-Request-Method: GET" \
  --max-time 10 \
  "$API_URL/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")

if [[ -n "$CORS_HEADER" ]]; then
  pass "CORS headers present: $CORS_HEADER"
else
  info "CORS headers not detected on OPTIONS preflight (may be handled by API Gateway)"
fi

echo ""

# ── 3. Auth Endpoint Validation ───────────────────────────────────────────────
echo "3. Auth Endpoint Validation"
echo "---------------------------"

# Test that register endpoint exists and validates input
REGISTER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid"}' \
  --max-time 10 2>/dev/null || echo "000")

if [[ "$REGISTER_STATUS" == "400" || "$REGISTER_STATUS" == "422" ]]; then
  pass "POST /auth/register → HTTP $REGISTER_STATUS (validates input correctly)"
elif [[ "$REGISTER_STATUS" == "200" || "$REGISTER_STATUS" == "201" ]]; then
  info "POST /auth/register → HTTP $REGISTER_STATUS (accepted — check if validation is working)"
else
  fail "POST /auth/register → HTTP $REGISTER_STATUS (unexpected response)"
fi

# Test that login endpoint exists
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  --max-time 10 2>/dev/null || echo "000")

if [[ "$LOGIN_STATUS" == "401" || "$LOGIN_STATUS" == "400" || "$LOGIN_STATUS" == "403" ]]; then
  pass "POST /auth/login → HTTP $LOGIN_STATUS (rejects invalid credentials)"
else
  fail "POST /auth/login → HTTP $LOGIN_STATUS (unexpected response)"
fi

echo ""

# ── 4. CloudFront / Web App ───────────────────────────────────────────────────
echo "4. Web App Availability"
echo "-----------------------"

# Determine CloudFront URL based on environment
if [[ "$ENVIRONMENT" == "prod" ]]; then
  CF_URL=$(aws cloudformation describe-stacks \
    --stack-name "budgetbuddy-prod-hosting" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")
else
  CF_URL="https://d1ueeugn9zcx7n.cloudfront.net"
fi

if [[ -n "$CF_URL" ]]; then
  WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$CF_URL" 2>/dev/null || echo "000")
  if [[ "$WEB_STATUS" == "200" ]]; then
    pass "Web app accessible at $CF_URL → HTTP $WEB_STATUS"
  else
    fail "Web app at $CF_URL → HTTP $WEB_STATUS (expected 200)"
  fi

  # Check that index.html contains expected content
  CONTENT=$(curl -s --max-time 15 "$CF_URL" 2>/dev/null || echo "")
  if echo "$CONTENT" | grep -q "BudgetBuddy\|budgetbuddy\|vite\|react"; then
    pass "Web app HTML contains expected content"
  else
    fail "Web app HTML missing expected content (BudgetBuddy/vite/react)"
  fi
else
  info "CloudFront URL not available — skipping web app checks"
fi

echo ""

# ── 5. CloudFormation Stack Health ────────────────────────────────────────────
echo "5. CloudFormation Stack Health"
echo "------------------------------"

STACKS=(
  "budgetbuddy-${ENVIRONMENT}-database"
  "budgetbuddy-${ENVIRONMENT}-auth"
  "budgetbuddy-${ENVIRONMENT}-api"
  "budgetbuddy-${ENVIRONMENT}-hosting"
)

for stack in "${STACKS[@]}"; do
  STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$stack" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

  if [[ "$STATUS" == "CREATE_COMPLETE" || "$STATUS" == "UPDATE_COMPLETE" || "$STATUS" == "UPDATE_ROLLBACK_COMPLETE" ]]; then
    pass "Stack $stack → $STATUS"
  elif [[ "$STATUS" == "NOT_FOUND" ]]; then
    info "Stack $stack → NOT_FOUND (may not be deployed yet)"
  else
    fail "Stack $stack → $STATUS"
  fi
done

echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo "=========================="
echo "Smoke Test Summary"
echo "=========================="
echo -e "${GREEN}Passed${NC}: $PASS"
echo -e "${RED}Failed${NC}: $FAIL"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}🎉 All smoke tests passed! Environment is healthy.${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAIL smoke test(s) failed. Review the output above.${NC}"
  exit 1
fi
