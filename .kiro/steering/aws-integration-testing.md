---
inclusion: conditional
fileMatchPattern: "**/*.test.js"
---

# AWS Integration Testing Guidelines

**ONLY load when working with test files**

## Cost Limits

- Daily < $1, Monthly < $20, Single test < $0.10
- Max 10 API calls per test, 30s Lambda timeout

## Rules

- Clean up test data immediately
- Test in dev only, never prod
- No infinite loops or auto-scaling without limits

## When to Test

- After Lambda/API/DB/auth changes, before task completion

## When NOT to Test

- Unit tests, property tests, rapid iteration, destructive ops

## AWS Profile

Use `hitechparadigm` for all AWS CLI/CDK commands
