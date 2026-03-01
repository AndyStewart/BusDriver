# Plan: remove-feature-application-folders

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Completed

## Goal
Remove `application` subfolders under `src/features/*` and place feature files directly under each feature folder while preserving behavior.

## Background and Context
The repository currently uses top-level `src/ports/*` and `src/adapters/*`, while feature core logic remains under `src/features/*/application`. The requested change is to flatten feature core files directly into each feature folder.

## Scope
- In scope:
- Move all files from `src/features/*/application/*` to `src/features/*/*`.
- Remove empty `application` directories.
- Rewire all source/test imports.
- Update lint configuration, docs, and ADR where path guidance changes.
- Validate with required quality gates.
- Out of scope:
- Functional behavior changes.
- Dependency changes.

## Design Summary
Keep architecture roles but flatten feature core location:
- `src/features/<feature>/*.ts`
- `src/ports/{primary,secondary}/*.ts`
- `src/adapters/{primary,secondary}/*.ts`

The conceptual application layer remains; only filesystem nesting changes.

## Vertical Slices (Top-Down)
### Slice 1: Feature file flattening
- Objective:
- Move feature files out of `application` folders.
- Changes:
- Relocate files in `src/features/common`, `src/features/connections`, `src/features/queues`, `src/features/queueMessages`.
- Independent deployability:
- Yes.
- Independent testability:
- Yes (`npm run compile`).
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- No `src/features/**/application` directories remain.

### Slice 2: Import and lint rewiring
- Objective:
- Align code references and lint boundary enforcement with flattened paths.
- Changes:
- Update source/test import paths.
- Update `.eslintrc.cjs` feature-layer globs and architecture rules.
- Update custom port rule messages/path assumptions where needed.
- Independent deployability:
- Yes.
- Independent testability:
- Yes (`npm run lint`, `npm run compile-tests`).
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- Lint and TypeScript compile succeed with no path errors.

### Slice 3: Docs and validation closeout
- Objective:
- Update docs and complete full quality-gate validation.
- Changes:
- Update `AGENTS.md`, `docs/architecture.md`, `docs/contributing.md`.
- Run required test suites and finalize/archive plan.
- Independent deployability:
- Yes.
- Independent testability:
- Yes.
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- `lint`, `compile`, `compile-tests`, `test:unit`, `test:acceptance`, `test:integration` pass.

## Progress Log
- 2026-03-01 19:00 - Created plan and started implementation.
- 2026-03-01 19:03 - Completed Slice 1 by moving all feature files out of `application/` into feature roots.
- 2026-03-01 19:07 - Completed Slice 2 by rewiring imports and updating lint rule/glob behavior for flattened feature paths.
- 2026-03-01 19:12 - Completed Slice 3 by updating docs and running full validation gates.

## Decisions and Notes
- Keep top-level `ports` and `adapters` structure unchanged.
- Flatten feature core files only; no behavioral redesign.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Bulk path rewrites are reliable when followed immediately by compile-tests to catch depth changes.
- Flattening feature source paths requires synchronized lint-glob updates or boundary enforcement silently stops applying.
- Keeping test folder layout unchanged can reduce migration risk while still satisfying source-structure simplification requests.

## Outcome
- Completed flattening of feature core files:
- `src/features/common/*`, `src/features/connections/*`, `src/features/queues/*`, and `src/features/queueMessages/*` now hold files directly.
- `src/features/**/application` directories were removed.
- Source imports, adapter/port references, lint rules, and documentation were updated to the flattened feature paths.
- Validation passed: `npm run lint`, `npm run compile`, `npm run compile-tests`, `npm run test:unit`, `npm run test:acceptance`, `npm run test:integration`.
