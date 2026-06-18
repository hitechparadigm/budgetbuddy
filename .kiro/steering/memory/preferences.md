---
inclusion: auto
---

# User Preferences

## Communication Style
- Direct and concise responses — no unnecessary preamble or summaries
- Skip filler phrases like "Great choice!" or "You're absolutely right"
- Short answers for simple questions; thorough for complex ones
- Prose for explanations, bullets only for sequences or enumerations
- No end-of-task recap unless explicitly asked

## Autonomy & Workflow
- Autopilot by default — work continuously until all tasks in scope are complete
- After completing a task, immediately start the next one without check-ins
- Only stop for true blockers: ambiguous breaking changes, validation failures after 3 attempts, CI/CD failures after 2 attempts
- Always check CI/CD status before pushing: `node scripts/check-cicd-status.js`
- Always commit via `node scripts/safe-commit-push.js "type: description"` — never raw git push

## Code Style
- ESLint 9+ flat config
- 2-space indent, single quotes, 100 char lines
- Files: kebab-case | Functions: camelCase | Classes: PascalCase | Constants: UPPER_SNAKE_CASE
- Small composable functions, single responsibility, clear interfaces
- JSDoc on public APIs and complex functions; inline comments only for non-obvious logic

## Forbidden Libraries
- Moment.js → use native Date
- Lodash → use ES6+
- jQuery
- axios → use fetch

## Testing Philosophy
- Tests before marking any task complete
- Coverage target: >80%
- Unit tests co-located with Lambda functions (`*.test.js`)
- AWS integration tests: dev only (`hitechparadigm` AWS profile), <$1/day, clean up all test data
- Run integration tests after Lambda/API/DB/auth changes

## Documentation (Every Commit)
- Update CHANGELOG.md with version and categorized changes
- Update DEVELOPMENT_LOG.md with session work summary
- Update README.md and docs/development-status.md on major changes

## AWS Profile
- Dev/test work uses AWS profile `hitechparadigm`

## Dependency Management
- Check if existing lib works before adding anything new
- Evaluate bundle size, maintenance status, security before adding
- Use exact/pinned versions only — no open ranges
- npm only (no yarn, no pnpm)
