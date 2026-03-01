# Plan: acceptance-user-facing-focus

- Date: 2026-03-01
- Owner: Codex
- Status: Completed

## Goal
Keep acceptance tests centered on user-visible behavior and move implementation-detail assertions into lower-level tests.

## Background and Context
The acceptance suite currently includes a queue panel HTML structure/safety assertion. That check validates implementation details rather than a user outcome. The repository strategy is to keep user-facing flows in acceptance and technical contracts at unit/integration levels.

## Scope
- In scope:
- Remove technical HTML-structure assertions from acceptance.
- Remove acceptance-only test plumbing that exists only for those assertions.
- Add unit-level tests that verify the queue panel HTML/asset safety contract.
- Update docs to reflect the adjusted test boundary.
- Out of scope:
- Reworking user-facing acceptance flows for connection/message operations.
- Broad test architecture changes outside this specific boundary correction.

## Design Summary
Shift technical checks down:
1. Delete acceptance scenario that inspects raw webview HTML and remove DSL/probe helpers.
2. Add a unit test reading `media/queueMessagesPanel.html` and asserting contract markers and disallowed inline patterns.
3. Keep acceptance scenarios that validate visible user outcomes only.

## Vertical Slices (Top-Down)

### Slice 1: Remove Technical Acceptance Assertions
- Objective:
- Ensure acceptance suite no longer contains implementation-detail HTML assertions.
- Changes:
- Remove "safe page structure" acceptance scenario.
- Remove unused DSL helpers related to HTML snippet assertions.
- Remove acceptance-only command used to fetch panel HTML.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- Yes
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- Acceptance suite still validates user-facing flows.

### Slice 2: Add Unit Contract Test for Queue Panel HTML Assets
- Objective:
- Preserve technical coverage at unit level.
- Changes:
- Add unit test under `src/test/features/queueMessages/adapters/**` that reads `media/queueMessagesPanel.html` and verifies:
- required structural markers
- disallowed inline-handler/script patterns
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- Potentially Yes
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- Technical contract no longer depends on acceptance runtime.

### Slice 3: Docs + Validation + Plan Closeout
- Objective:
- Align docs with refined boundaries and complete validation.
- Changes:
- Update testing guidance in docs as needed.
- Run lint/compile/unit/integration/acceptance checks.
- Complete and archive this plan.
- Independent deployability:
- Yes
- Independent testability:
- Yes
- Documentation updates required? (Yes/No):
- Yes
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- Acceptance remains user-focused; technical checks pass at unit level.

## Progress Log
- 2026-03-01 16:55 - Created plan and started implementation.
- 2026-03-01 17:00 - Slice 1 complete: removed technical acceptance HTML scenario, DSL HTML assertion helpers, and acceptance HTML probe command.
- 2026-03-01 17:02 - Slice 2 complete: added `WebviewQueueMessagesTemplateContract.test.ts` unit test for queue panel HTML structure/safety contract.
- 2026-03-01 17:16 - Slice 3 complete: updated docs and ran lint/compile/unit/integration/acceptance checks.

## Decisions and Notes
- Technical checks on rendered HTML are classified as implementation-detail coverage and moved out of acceptance.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Outcome
- Acceptance suite now contains user-facing scenarios only.
- Technical queue-panel HTML contract coverage moved to unit tests in `src/test/features/queueMessages/adapters/WebviewQueueMessagesTemplateContract.test.ts`.
- Acceptance-only HTML probe command and DSL helpers were removed.
- `docs/contributing.md` and `docs/architecture.md` updated to describe the refined boundary.

## Lessons Learned
- Keeping acceptance scenarios focused on user outcomes reduces brittleness and clarifies intent.
- Technical template/safety assertions are simpler and faster at unit level than acceptance runtime checks.
