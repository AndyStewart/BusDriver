# Performance Improvements Plan

## Goals
- Reduce latency for delete and move operations on small queues and small selections.
- Minimize per-message overhead by reusing clients/senders/receivers.
- Improve throughput with batching and bounded concurrency.
- Preserve correctness and surface partial failures clearly.

## Non-Goals
- Major refactors unrelated to performance (e.g., UI redesigns).
- Changing the external behavior of commands beyond clearer error reporting.

## Summary of Hot Spots (from perf_research.md)
- Per-message ServiceBus client and sender/receiver creation/teardown.
- Delete loop waits up to ~25s per message (5 * 5s maxWaitTimeInMs).
- Serial processing of move/delete batches.
- Move does send + delete serially per message.

## Work Plan (Phased)

### Phase 1: Connection/Sender/Receiver Reuse (core performance win)
Goal: remove per-message setup overhead.

Approach:
- Introduce a reusable `ServiceBusClient` per connection or per batch operation.
- Reuse sender/receiver for the duration of a batch operation.
- Dispose resources once the batch completes or on extension deactivation.

Checklist:
- [x] Design a small pool/factory in `src/adapters/azure` (e.g., `AzureClientFactory`).
- [x] Update `AzureMessageOperations` to accept or retrieve a shared client/sender/receiver.
- [x] Ensure sender/receiver are lazily created and reused per queue.
- [x] Confirm correct disposal in batch completion and extension shutdown.
- [x] Add guards to prevent reuse after disposal.
- [x] Add or update tests that cover client reuse and disposal behavior.
- [x] Run focused tests for this phase before moving on.
- [x] Re-run baseline and compare timings.

### Phase 2: Delete Strategy Improvements
Goal: reduce wait time and unnecessary receive/abandon calls.

Approach:
- Replace the 5x loop with a total time budget per batch (e.g., 1-3 seconds).
- Receive in batches and match against a set of target IDs.
- Avoid repeated `abandonMessage` calls for non-target messages where possible.

Checklist:
- [ ] Define a total time budget and per-iteration wait time.
- [ ] Implement batch receive + in-memory ID matching.
- [ ] Track found vs not-found messages.
- [ ] Surface partial failures with a clear summary (counts + reason).
- [ ] Add or update tests that cover delete matching and partial failures.
- [ ] Run focused tests for this phase before moving on.
- [ ] Re-run baseline and compare timings.

### Phase 3: UX and Error Reporting
Goal: inform users without blocking on failures.

Approach:
- Provide user-facing summary for partial success (e.g., moved N of M).
- Keep full details in logs; do not expose secrets.

Checklist:
- [ ] Add user-facing summary messages for move/delete.
- [ ] Ensure logs include enough details for troubleshooting.
- [ ] Verify no secrets are logged.
- [ ] Add or update tests for user-facing summaries, if applicable.
- [ ] Run focused tests for this phase before moving on.

## Testing Plan (Continuous)
- Add or update tests alongside each phase, not after all phases are complete.
- Run focused mocha tests after each phase change.
- Run `npm test` for VS Code harness when changes stabilize.

Checklist:
- [ ] Run lint: `npm run lint`.
- [ ] Compile: `npm run compile` and `npm run compile-tests`.
- [ ] Run focused mocha tests.
- [ ] Run `npm test` before release or PR.

## Rollout Notes
- Implement in phases to measure improvements and reduce risk.
- If performance regresses or errors increase, roll back to prior phase.

## Open Questions
- Preferred maximum concurrency for send/delete?
- Acceptable total time budget for delete before reporting partial failure?
- Should move be best-effort (send succeeds even if delete fails) or all-or-nothing?

## Decisions (User Input)
- Concurrency: start with 8 as a default and tune after initial results.
- Delete time budget: 10 seconds total per batch before reporting partial failure.
- Move semantics: aim for all-or-nothing; document limitations and use best-effort with clear partial-failure reporting if true atomicity is not feasible.
