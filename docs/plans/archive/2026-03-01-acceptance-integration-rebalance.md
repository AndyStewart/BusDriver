# Plan: acceptance-integration-rebalance

- Date: 2026-03-01
- Owner: Codex
- Status: Completed

## Goal
Rebalance test strategy by moving user-facing integration coverage into acceptance tests where practical, while keeping a minimal integration suite for coverage acceptance cannot reliably provide.

## Background and Context
Current integration coverage includes:
- Extension activation/command-registration and defensive command paths.
- Queue messages panel lifecycle and HTML contract checks.
- Connections provider drag/drop behavior.

Current acceptance coverage validates user-facing command flows against a real Azure Service Bus namespace, but uses `BUSDRIVER_ACCEPTANCE_MODE=1` and hidden `busdriver.__test.*` commands for deterministic setup and command overrides. That means some production-mode/runtime and internal adapter-path assertions are not currently exercised by acceptance.

## Scope
- In scope:
- Add acceptance scenarios for user-facing coverage currently in integration tests where automation is feasible.
- Keep and slim integration tests to paths acceptance cannot reliably or cleanly cover.
- Update CI/test scripts if test responsibilities shift.
- Update docs to reflect final test boundaries and responsibilities.
- Out of scope:
- Full replacement of test hooks with real UI automation for every VS Code prompt/modality.
- Redesigning extension architecture unrelated to test scope rebalance.

## Design Summary
Use a layered approach:
1. Expand acceptance scenarios for user-visible behavior and command-path smoke checks.
2. Retain a thin integration layer for production-mode wiring and adapter-internal drag/drop behavior.
3. Remove only redundant integration tests once equivalent acceptance coverage exists and is stable.

This preserves confidence while reducing overlap and avoiding a brittle push toward difficult UI-level automation in `vscode-test`.

## Vertical Slices (Top-Down)

### Slice 1: Move `showQueueMessages` Missing-Connection Guard Test
- Objective:
- Move integration assertion from `extension.integration.test.ts` that queue panel is not opened when the connection string is missing.
- Changes:
- Add one acceptance scenario that executes `busdriver.showQueueMessages` with a queue bound to a missing connection ID and asserts no panel opens.
- Keep existing integration test until new acceptance test is green.
- Then remove only the matching integration test.
- Independent deployability:
- Yes
- Independent testability:
- Yes. Acceptance test and integration suite remain green.
- Documentation updates required? (Yes/No):
- No
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- New acceptance test fails first, then passes.

### Slice 2: Move `moveMessageToQueue` No-Target-Queues Guard Test
- Objective:
- Move integration assertion from `extension.integration.test.ts` that command exits safely when no target queues are available.
- Changes:
- Add one acceptance scenario that invokes `busdriver.moveMessageToQueue` with no queue catalog and verifies operation exits without mutation.
- Keep existing integration test until new acceptance test is green.
- Then remove only the matching integration test.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- No
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- New acceptance test fails first, then passes.

### Slice 3: Move Queue Panel `createOrShow` Creation Test
- Objective:
- Move integration assertion from `WebviewQueueMessagesPanel.integration.test.ts` that `createOrShow` creates and stores current panel.
- Changes:
- Add one acceptance scenario that opens queue messages and verifies open-panel state.
- Keep existing integration test until acceptance equivalent is green.
- Then remove only the matching integration test.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- No
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- New acceptance test fails first, then passes.

### Slice 4: Move Queue Panel Reuse/Context-Switch Test
- Objective:
- Move integration assertion from `WebviewQueueMessagesPanel.integration.test.ts` that opening a second queue reuses the panel and updates queue context.
- Changes:
- Add one acceptance scenario that opens queue A then queue B and verifies current panel queue is B without requiring manual close.
- Keep existing integration test until acceptance equivalent is green.
- Then remove only the matching integration test.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- No
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- New acceptance test fails first, then passes.

### Slice 5: Move Queue Panel Dispose/Clear Test
- Objective:
- Move integration assertion from `WebviewQueueMessagesPanel.integration.test.ts` that disposing the panel clears current panel state.
- Changes:
- Add one acceptance scenario that opens a panel, calls test close command, verifies no open panel.
- Keep existing integration test until acceptance equivalent is green.
- Then remove only the matching integration test.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- No
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- New acceptance test fails first, then passes.

### Slice 6: Move Queue Panel HTML Contract Test
- Objective:
- Move integration HTML assertions from `WebviewQueueMessagesPanel.integration.test.ts` into acceptance.
- Changes:
- Add one acceptance-only test probe (test command) to fetch rendered webview HTML safely.
- Add one acceptance scenario asserting key HTML contract markers and forbidden inline script patterns.
- Keep integration HTML test until acceptance equivalent is green.
- Then remove only the matching integration test.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- Potentially Yes (if test-only probe contract is documented)
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- New acceptance test fails first, then passes.

### Slice 7: Keep Integration-Only Coverage (No Move)
- Objective:
- Explicitly retain tests that should not migrate to acceptance.
- Changes:
- Keep integration tests for:
- Production-mode smoke in `extension.integration.test.ts`:
- extension presence/activation
- command registration
- `purgeQueue` missing payload guard
- `deactivate` idempotency
- Keep all `ConnectionsProvider.integration.test.ts` drag/drop tests.
- Remove any remaining migrated duplicates only.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- Yes (`docs/contributing.md` test-boundary clarification)
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- Integration suite still covers non-portable behaviors.

### Slice 8: CI and Docs Finalization
- Objective:
- Align CI/docs with final one-at-a-time migration outcomes.
- Changes:
- Update `docs/contributing.md` and `docs/architecture.md` testing sections to reflect exact ownership.
- Archive this plan after closeout.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- Yes
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- CI green with updated acceptance + slim integration suite.

## Progress Log
- 2026-03-01 00:00 - Created plan.
- 2026-03-01 16:10 - Slice 1 implemented: added acceptance test for missing-connection `showQueueMessages` guard and removed matching integration assertion.
- 2026-03-01 16:14 - Validation for Slice 1: `npm run compile-tests` and `npm run test:integration` passed.
- 2026-03-01 16:15 - Acceptance validation for Slice 1: `npm run test:acceptance` passed (7 tests).
- 2026-03-01 16:20 - Slice 2 implemented: added acceptance test for `moveMessageToQueue` with no available target queues and removed matching integration assertion.
- 2026-03-01 16:23 - Validation for Slice 2: `npm run compile-tests`, `npm run test:integration`, and `npm run test:acceptance` passed (8 acceptance tests).
- 2026-03-01 16:26 - Slice 3 implemented: removed integration panel creation assertion now covered by acceptance "open messages for a queue" scenario.
- 2026-03-01 16:28 - Validation for Slice 3: `npm run compile-tests`, `npm run test:integration`, and `npm run test:acceptance` passed.
- 2026-03-01 16:30 - Slice 4 implemented: added acceptance scenario for switching between queues and removed matching integration panel reuse/context assertion.
- 2026-03-01 16:33 - Validation for Slice 4: `npm run compile-tests`, `npm run test:integration`, and `npm run test:acceptance` passed (9 acceptance tests).
- 2026-03-01 16:35 - Slice 5 implemented: added acceptance scenario for closing queue messages view and removed matching integration dispose assertion.
- 2026-03-01 16:37 - Validation for Slice 5: `npm run compile-tests`, `npm run test:integration`, and `npm run test:acceptance` passed (10 acceptance tests).
- 2026-03-01 16:40 - Slice 6 implemented: added acceptance HTML contract scenario with a test-only panel HTML probe and removed matching integration HTML assertion.
- 2026-03-01 16:43 - Validation for Slice 6: `npm run test:integration` and `npm run test:acceptance` passed (11 acceptance tests).
- 2026-03-01 16:45 - Slice 7 complete: retained integration coverage for production-mode extension smoke and connections drag/drop adapter behavior.
- 2026-03-01 16:48 - Slice 8 complete: updated `docs/contributing.md` and `docs/architecture.md`; lint/build/unit/integration/acceptance checks passed.

## Decisions and Notes
- Initial decision: do not remove integration tests until acceptance parity is proven for each mapped assertion.
- Initial decision: keep a minimal integration layer for coverage that acceptance currently cannot exercise without brittle UI automation or internal test-only hooks.
- Migration rule: each slice must move exactly one assertion and remove at most one matching integration assertion in the same change.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Outcome
- Migrated user-facing integration assertions into acceptance one test at a time:
- `showQueueMessages` missing-connection guard
- `moveMessageToQueue` no-target-queues guard
- queue panel open/switch/close lifecycle
- queue panel HTML safety contract
- Retained integration coverage for:
- production-mode extension smoke checks in `src/test/integration/extension.integration.test.ts`
- connection-tree drag/drop integration checks in `src/test/features/connections/integration/ConnectionsProvider.integration.test.ts`
- Updated docs to reflect final boundaries.

## Lessons Learned
- One-test-at-a-time migration kept risk low and made regressions easy to isolate.
- Acceptance HTML contract checks needed a render wait to avoid transient false negatives.
- Keeping a slim integration suite for production-mode smoke and drag/drop internals avoids acceptance harness blind spots.
