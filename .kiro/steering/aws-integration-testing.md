---
inclusion: conditional
fileMatchPattern: "**/*.test.js"
---

# AWS Integration Testing

## Cost Limits

- Daily <$1, Monthly <$20, Single test <$0.10
- Max 10 API calls per test, 30s Lambda timeout

## Rules

- Clean up test data immediately after test
- Test in dev only, never prod
- No infinite loops or auto-scaling without limits
- AWS Profile: `hitechparadigm`

## When to Run

After Lambda/API/DB/auth changes, before marking task complete

## When NOT to Run

Unit tests, property tests, rapid iteration, destructive operations
