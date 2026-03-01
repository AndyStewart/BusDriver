# Plan: Group Queue Message Code by Feature Capability

- Date: 2026-03-01
- Owner: Codex
- Status: Completed

## Goal
Split the oversized `src/features/queueMessages` folder into smaller, capability-focused feature folders while preserving behavior and architecture boundaries.

## Background and Context
`queueMessages` currently contains list/load, move, delete, purge, open, grid, and shared type contracts in one location. This increases navigation overhead and broadens edit surface for focused changes.

The repository now uses top-level layer folders (`src/features`, `src/ports`, `src/adapters`) and expects core feature logic to stay in feature modules free of VS Code/Azure SDK coupling.

## Scope
- In scope:
  - Move queue-message feature files into capability-focused sibling folders.
  - Update all imports in features, ports, adapters, extension wiring, and tests.
  - Reorganize feature tests to mirror the new feature folders.
  - Update architecture/contributing docs if paths/examples require changes.
- Out of scope:
  - Behavior changes or API redesign.
  - Port/adapter folder restructuring.
  - Webview/media asset restructuring.

## Design Summary
Create sibling feature folders by capability:
- `listMessages`
- `moveMessages`
- `purgeMessages`
- `deleteMessages`
- `openQueueMessages`
- `messageGrid`
- `queueMessageContracts` for shared types

This keeps folders flat (no nested internals), improves discoverability, and minimizes churn by preserving file names and exported types/classes.

## Vertical Slices (Top-Down)

### Slice 1: Shared Contract Relocation
- Objective:
  - Move shared queue-message type contracts first so downstream imports have stable targets.
- Changes:
  - Move `MessageOperationTypes.ts`, `MessageOperationsTypes.ts`, and `MessageTypes.ts` into `src/features/queueMessageContracts/`.
  - Update all direct imports of these files.
- Independent deployability:
  - Yes; no runtime behavior changes.
- Independent testability:
  - Yes; compile and unit tests validate import integrity.
- Documentation updates required? (Yes/No):
  - No.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - `npm run compile`
  - `npm run test:unit`

### Slice 2: Read Path Grouping
- Objective:
  - Group list/load/open/grid flow into dedicated feature folders.
- Changes:
  - Move list/load files to `src/features/listMessages/`.
  - Move open files to `src/features/openQueueMessages/`.
  - Move grid files to `src/features/messageGrid/`.
  - Update imports and mirror related tests under matching feature test folders.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes; list/open/grid unit tests run independently.
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - `npm run compile`
  - `npm run test:unit`

### Slice 3: Mutation Path Grouping and Cleanup
- Objective:
  - Group move/delete/purge flow and remove old `queueMessages` folder.
- Changes:
  - Move move files to `src/features/moveMessages/`.
  - Move delete files to `src/features/deleteMessages/`.
  - Move purge files to `src/features/purgeMessages/`.
  - Update remaining imports across extension/ports/adapters/tests.
  - Remove empty `src/features/queueMessages`.
  - Run full required checks.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes; behavior preserved and validated through existing suites.
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - `npm run lint`
  - `npm run compile`
  - `npm run compile-tests`
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:acceptance`

## Progress Log
- 2026-03-01 19:20 - Created plan and started implementation.
- 2026-03-01 19:24 - Completed Slice 1 by moving shared contracts to `src/features/queueMessageContracts` and updating references.
- 2026-03-01 19:27 - Completed Slice 2 by moving list/open/grid files and matching tests into capability folders.
- 2026-03-01 19:31 - Completed Slice 3 by moving move/delete/purge files, updating imports, and finishing test migration.
- 2026-03-01 19:35 - Updated architecture documentation to reflect capability-based feature modules.
- 2026-03-01 19:36 - Validation complete: lint, compile, compile-tests, unit, integration, and acceptance tests passed.

## Decisions and Notes
- Keep folder layout flat by capability with explicit import paths.
- Avoid barrel files for this refactor to reduce indirection.
- Preserve file/class/type names to keep behavior and API shape unchanged.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Outcome
Queue-message feature code is now grouped into flat, capability-focused sibling feature folders:
- `src/features/listMessages`
- `src/features/openQueueMessages`
- `src/features/messageGrid`
- `src/features/moveMessages`
- `src/features/deleteMessages`
- `src/features/purgeMessages`
- `src/features/queueMessageContracts`

All affected imports in features, ports, adapters, extension wiring, and tests were updated. Tests were moved out of `src/test/features/queueMessages/application` into matching capability test folders.

## Lessons Learned
- Flat capability grouping improves discoverability, but shared contracts must be called out explicitly to keep import intent clear.
- Running compile immediately after bulk moves catches relative-import drift early before test execution.
