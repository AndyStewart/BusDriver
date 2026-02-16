# Plan: Queue Panel Application Extraction

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Push queue message panel loading/pagination orchestration from `src/providers/QueueMessagesPanel.ts` into the application layer while preserving existing user-visible behavior.

## Background and Context
`QueueMessagesPanel` remains the largest provider file and still performs significant orchestration (message fetch, pagination sequencing, grid shaping, and webview append payload construction). The architecture now has explicit primary/secondary ports and use-cases, so this logic can move behind a primary capability interface.

## Scope
- In scope:
  - Add a primary capability interface and use-case for queue panel message loading.
  - Delegate initial/load-more message orchestration from `QueueMessagesPanel` to the new use-case.
  - Add unit tests for the new use-case.
  - Update docs/plan if architecture flow language needs adjustment.
- Out of scope:
  - Large webview template split (HTML/CSS/JS extraction).
  - Intentional behavior changes.

## Design Summary
Introduce `LoadQueueMessages` (primary) and `LoadQueueMessagesUseCase` (application) to own queue peek, pagination progression, grid-view shaping, and display/raw-body formatting. Keep `QueueMessagesPanel` as lifecycle + webview transport + command forwarding.

## Vertical Slices (Top-Down)

### Slice 1: Add Queue Message Loading Primary Capability
- Objective:
  - Create explicit inbound interface and use-case for queue panel data loading.
- Changes:
  - Add `src/ports/primary/LoadQueueMessages.ts`.
  - Add `src/application/useCases/LoadQueueMessagesUseCase.ts`.
  - Add unit tests for load/next-page behavior.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Possibly (`docs/architecture.md` wording only).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Use-case tests cover first page, next page, and invalid pagination token.

### Slice 2: Rewire QueueMessagesPanel to Delegate
- Objective:
  - Remove panel-side orchestration for load/load-more.
- Changes:
  - Replace `_peekMessages`/view-model assembly in `QueueMessagesPanel` with calls to `LoadQueueMessages`.
  - Keep existing webview command protocol unchanged.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Possibly.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Queue panel integration tests continue to pass.

### Slice 3: Validation and Closeout
- Objective:
  - Validate quality gates and close plan.
- Changes:
  - Run lint, compile, compile-tests, unit tests, integration tests.
  - Update plan with lessons learned.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Yes (if architecture wording changed).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Validation checklist complete and plan marked completed.

## Progress Log
- 2026-02-16 20:52 - Created plan.
- 2026-02-16 20:55 - Completed Slice 1: added `LoadQueueMessages` primary capability and `LoadQueueMessagesUseCase` with unit coverage for initial-load, next-page, and invalid-sequence behavior.
- 2026-02-16 20:57 - Completed Slice 2: rewired `QueueMessagesPanel` to delegate initial/load-more orchestration to `LoadQueueMessages`; updated panel gateway and queue panel integration fixtures.
- 2026-02-16 20:58 - Completed Slice 3: validated lint/compile/unit/integration checks and closed out plan.

## Decisions and Notes
- Keep command names and payload shapes stable.
- Keep queue panel transport semantics unchanged.
- Preserve `appendMessages` webview contract while moving sequence progression and message/grid shaping into application use-case code.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Queue panel pagination and grid shaping can be moved cleanly behind a primary capability without changing the webview command protocol.
- Delegating loading to an application service significantly reduces provider-owned responsibility while preserving existing integration tests.
- Focused use-case unit tests make refactoring transport-heavy providers safer and faster.

## Outcome
Completed. Queue panel message loading, pagination sequencing, and message/grid shaping now live in `LoadQueueMessagesUseCase` (`src/application/useCases/LoadQueueMessagesUseCase.ts`), with `QueueMessagesPanel` delegating through the new primary interface `LoadQueueMessages` (`src/ports/primary/LoadQueueMessages.ts`).
