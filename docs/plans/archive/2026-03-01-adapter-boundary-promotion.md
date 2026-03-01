# Plan: adapter-boundary-promotion

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Completed

## Goal
Remove temporary adapter cross-feature carve-outs and promote adapter cross-feature lint enforcement from warning to error.

## Background and Context
The initial ESLint boundary rollout enforced strict rules in application/ports and introduced warning-level adapter rules with temporary carve-outs. Remaining violations are primarily in the connections adapter and queue-message webview queue typing dependencies.

## Scope
- In scope:
  - Refactor remaining adapter cross-feature dependencies to same-feature or shared contracts.
  - Remove adapter carve-outs from ESLint config.
  - Promote adapter cross-feature lint enforcement to error.
  - Update docs and validate all quality gates.
- Out of scope:
  - New product behavior changes.
  - Broad re-architecture outside dependency-boundary cleanup.

## Design Summary
Use shared queue contracts and shared tree item adapter types for queue UI shape. Replace direct queueMessages adapter imports from `TreeConnectionsAdapter` with feature-local helper logic and an injected bridge for queue-messages panel state/notifications. Then remove ESLint carve-outs and enforce adapter cross-feature imports as errors.

## Vertical Slices (Top-Down)
### Slice 1: Shared Queue Contracts
- Objective:
  - Eliminate adapter cross-feature queue type imports.
- Changes:
  - Add shared queue contracts and shared queue tree item adapter.
  - Re-export from queue feature adapter file for compatibility.
  - Update queue-messages adapters to use shared queue types.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run compile`, `npm run test:unit`).
- Documentation updates required? (Yes/No):
  - Yes (`docs/architecture.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - No queueMessages adapter imports from `features/queues/**` remain.

### Slice 2: Connections Adapter Decoupling
- Objective:
  - Remove remaining connections adapter imports from queueMessages/queues features.
- Changes:
  - Add feature-local drop/move summary helpers.
  - Replace concrete dependencies with local/shared interfaces.
  - Inject queue-messages panel bridge from composition root.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run test:unit`, `npm run test:integration`).
- Documentation updates required? (Yes/No):
  - Yes (`docs/architecture.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - `TreeConnectionsAdapter` has no cross-feature imports.

### Slice 3: Rule Promotion + Validation
- Objective:
  - Remove carve-outs and enforce adapter cross-feature imports as errors.
- Changes:
  - Update `.eslintrc.cjs` adapter override severity/patterns.
  - Run lint/build/tests and update contributing guidance.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (full gates).
- Documentation updates required? (Yes/No):
  - Yes (`docs/contributing.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Adapter cross-feature rule is error-level with no carve-outs.

## Progress Log
- 2026-03-01 17:04 - Created plan and started implementation.
- 2026-03-01 17:18 - Completed Slice 1 shared queue contracts and shared queue tree item adapter extraction.
- 2026-03-01 17:24 - Completed Slice 2 connections adapter decoupling using feature-local message move helpers and injected queue-messages bridge.
- 2026-03-01 17:31 - Completed Slice 3: removed adapter carve-outs and promoted adapter cross-feature lint enforcement to `error`.
- 2026-03-01 17:31 - Validation run complete: `npm run lint`, `npm run compile`, `npm run compile-tests`, `npm run test:unit`, `npm run test:integration`, and `npm run test:acceptance` passed.

## Decisions and Notes
- Keep runtime behavior stable by using structural typing and composition-root injected bridges rather than changing user-facing command flows.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Adapter decoupling is easier when cross-feature UI runtime interactions are expressed as explicit injected bridges from the composition root.
- Shared UI contracts (`Queue`, `QueueTreeItem`) remove repeated cross-feature adapter coupling and keep feature boundaries clear.

## Outcome
Adapter-level cross-feature carve-outs were removed, adapter cross-feature restrictions are now error-level, and all required quality gates remain green.
