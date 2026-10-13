# Module Scaffold Guide

`scripts/scaffold-feature.js` generates the starter files for a new feature module - a backend
Lambda function and its matching frontend API service + page - so a new feature starts from real,
working boilerplate instead of a blank file.

## Usage

```bash
node scripts/scaffold-feature.js <name>
```

`<name>` must be kebab-case (lowercase letters, digits, hyphens only), e.g. `net-worth-trends`.

The script checks every target path listed below before writing anything. If any single file
already exists, it aborts and writes nothing - there is no partial scaffold left on disk.

## Generated files

**Backend** (`backend/functions/<name>/`):

| File | Purpose |
|---|---|
| `index.js` | Lambda handler with the real CORS/health/`getUserFromEvent`/`BudgetAccessResolver` boilerplate used by every existing Lambda, plus `GET`/`POST` stubs for `/<name>` |
| `service.js` | Empty module for business logic, to be filled in as the feature grows |
| `repository.js` | Empty module for DynamoDB access, scoped to `BUDGET#<budgetId>` partition keys |
| `<name>.test.js` | Jest stub asserting the health route returns `healthy` |
| `package.json` | Matches the shape of existing Lambda `package.json` files (`main`, `scripts.test`, `jest` devDependency) |
| `TODO-<name>.md` | Checklist of manual steps still required (see below) - delete it once addressed |

**Frontend**:

| File | Purpose |
|---|---|
| `packages/web-app/src/services/<name>Api.ts` | API client importing `config.extendedFeaturesApiUrl` by default, with `authHeaders()` and CRUD function stubs |
| `packages/web-app/src/pages/<Name>Page.tsx` | Minimal page component stub with a `TODO` for the real UI |

## After generating: the manual checklist

The generated `TODO-<name>.md` lists the steps the generator intentionally does **not** automate,
because they require a human decision or touch files this guardrail spec deliberately keeps
read-only (CDK stacks, API Gateway routes, DynamoDB):

1. Choose the target API Gateway using [`docs/gateway-routing-map.md`](./gateway-routing-map.md)
   and add a row for your new route prefix(es) there.
2. Wire the Lambda into the chosen CDK stack, following the `setup<Name>Routes()` pattern used by
   existing routes in that stack's file.
3. If the feature needs a brand-new CDK stack (not just a new Lambda in an existing stack), add it
   to `infrastructure/bin/app.ts` **and** to
   [`infrastructure/stack-manifest.json`](../infrastructure/stack-manifest.json) in the same
   commit.
4. Fill in `service.js`/`repository.js` business logic and the frontend page UI.
5. Run `node scripts/consistency-check.js` before committing.

## Related references

- [API Gateway Routing Map](./gateway-routing-map.md) - which of the four gateways should own
  your new routes.
- [`infrastructure/stack-manifest.json`](../infrastructure/stack-manifest.json) - the source of
  truth for currently-deployed CDK stacks.
- `scripts/consistency-check.js` - run before every commit; checks that the files above stay in
  sync with the CDK source they describe.