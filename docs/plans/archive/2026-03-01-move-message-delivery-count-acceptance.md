# Plan: move-message-delivery-count-acceptance

- Date: 2026-03-01
- Owner: Codex
- Status: Completed

## Goal
Extend acceptance coverage for move-message flows so tests verify moved messages have delivery count incremented by exactly one for both single-message and multi-message moves.

## Background and Context
BusDriver acceptance specs currently verify source/target queue membership after move operations, but do not assert delivery count behavior on moved messages. Delivery count semantics are user-visible in message metadata and should remain stable for single and batch move commands.

## Scope
- In scope:
- Add acceptance assertions for delivery count after single-message moves.
- Add acceptance assertions for delivery count after multi-message moves.
- Extend acceptance DSL with a reusable queue delivery-count assertion helper.
- Out of scope:
- Large move-message architecture refactors.
- Non-move acceptance scenarios.

## Design Summary
Add a DSL assertion that validates expected delivery counts by message ID and use it in user-facing move scenarios (single and multiple). Acceptance failures then drive the smallest runtime fix needed to ensure move metadata reflects exactly one delivery-count increment.

## Vertical Slices (Top-Down)

### Slice 1: Single-message move delivery count assertion
- Objective:
- Verify moved single message ends in target queue with delivery count exactly `1`.
- Changes:
- Update move acceptance scenario to include expected target delivery count assertion.
- Status: Completed
- Independent deployability:
- Yes; test-only change.
- Independent testability:
- Yes; can run acceptance spec filtered to single move scenario.
- Documentation updates required? (Yes/No):
- No
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- `user can move message between queues` asserts target message delivery count is `1`.

### Slice 2: Multi-message move delivery count assertion
- Objective:
- Verify each moved message in a batch has delivery count exactly `1`.
- Changes:
- Add user-facing acceptance scenario for moving multiple messages and asserting target counts.
- Status: Completed
- Independent deployability:
- Yes; test-only change.
- Independent testability:
- Yes; can run acceptance spec filtered to multi move scenario.
- Documentation updates required? (Yes/No):
- No
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- Multi-message move scenario asserts each target message has delivery count `1`.

### Slice 3: DSL helper support
- Objective:
- Provide reusable acceptance DSL step for validating queue message delivery counts by message ID.
- Changes:
- Add `thenQueueMessagesHaveDeliveryCount(...)` and queue message peek helper in DSL.
- Status: Completed
- Independent deployability:
- Yes; test-only helper.
- Independent testability:
- Yes; validated by scenarios in slices 1 and 2.
- Documentation updates required? (Yes/No):
- No
- Plan update required for this slice? (Yes/No):
- Yes
- Acceptance checks:
- Compile/tests pass with new DSL assertion usage.

## Progress Log
- 2026-03-01 19:24 - Created plan.
- 2026-03-01 19:25 - Added acceptance assertions for single and multiple move delivery counts and added DSL assertion helper.
- 2026-03-01 19:25 - Acceptance failures exposed move metadata gap; updated move send metadata to increment delivery count by one.
- 2026-03-01 19:25 - Validation complete (`lint`, `compile`, `test:unit`, `test:integration`, `test:acceptance`).

## Decisions and Notes
- Keep assertion at acceptance DSL layer to avoid test duplication and keep specs readable.
- Treat `applicationProperties.originalDeliveryCount` as effective delivery-count signal for moved messages because broker `deliveryCount` resets for new target-queue messages.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Outcome
Added acceptance coverage for delivery-count behavior in move flows, introduced a reusable DSL delivery-count assertion, and fixed move-send metadata so moved messages record an incremented effective delivery count (`originalDeliveryCount = previous + 1`). Updated files:
- `src/test/acceptance/userFacing.acceptance.integration.test.ts`
- `src/test/acceptance/dsl/AcceptanceSpecDsl.ts`
- `src/adapters/secondary/AzureMessageOperationsAdapter.ts`
- `src/test/adapters/secondary/AzureMessageOperations.test.ts`

## Lessons Learned
- Acceptance tests exposed a semantic mismatch between broker-level and product-level delivery count behavior; move metadata now encodes the user-expected increment explicitly.
