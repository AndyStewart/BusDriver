# Plan: Test Strategy Implementation

- Date: 2026-02-16
- Owner: Codex
- Status: In Progress

## Goal
Implement an updated test strategy that preserves developer speed while increasing confidence in user-facing behavior. The strategy should require integration tests for new or changed integration-relevant code, keep TDD-first for defects and behavior changes, and provide coverage visibility without merge gating.

## Background and Context
BusDriver is a VS Code extension with ports-and-adapters architecture. The repository already has meaningful domain and adapter tests plus a basic extension smoke suite. Current gaps are concentrated in orchestration-heavy areas (`src/providers/*`, `src/extension.ts`) and in process clarity around when integration tests are mandatory.

Current policy and tooling context:
- TDD-first is already required for defects and behavior changes (`docs/contributing.md`, ADR-0002).
- CI currently runs lint, compile, and `npm test` (VS Code harness) on PRs.
- Coverage is not currently surfaced as a trend metric in CI.

## Scope
- In scope:
  - Clarify and codify test policy in docs (including integration test trigger rules).
  - Restructure test scripts/CI for explicit unit-vs-integration execution paths.
  - Add targeted tests for high-risk, under-tested integration-relevant code paths.
  - Add coverage reporting as informational output only (no pass/fail gate).
- Out of scope:
  - Any production feature changes unrelated to testing.
  - Coverage threshold enforcement or touched-file coverage gating.
  - Large-scale architectural rewrites.

## Design Summary
Use an incremental, low-risk rollout in vertical slices:
1. Policy and CI/test command clarity first, so expectations are unambiguous.
2. Add tests for highest-risk orchestration and adapter gaps.
3. Add non-blocking coverage reporting and review guidance.

This approach is sound because each slice can ship independently, improves quality without destabilizing delivery, and aligns with existing TDD and hexagonal-architecture practices.

## Vertical Slices (Top-Down)

### Slice 1: Codify Policy and Test Execution Paths
- Objective:
  - Make team expectations explicit and executable in scripts/CI.
- Changes:
  - Update `docs/contributing.md` with explicit rule: integration tests are required for new or changed integration-relevant code.
  - Clarify what does and does not qualify as integration-relevant.
  - Update `package.json` scripts to separate unit and integration paths clearly.
  - Update `.github/workflows/ci.yml` to reflect explicit test job sequencing and naming.
- Independent deployability:
  - Yes. Improves process and CI clarity without requiring immediate test additions.
- Independent testability:
  - Yes. Validate script correctness and CI config integrity.
- Documentation updates required? (Yes/No):
  - Yes (`docs/contributing.md`; `docs/architecture.md` only if test approach wording needs alignment).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - CI runs with clear unit and integration stages.
  - Documentation states when integration tests are required.
  - No coverage gating introduced.

### Slice 2: Close High-Risk Test Coverage Gaps
- Objective:
  - Add test coverage for orchestration and integration-relevant behaviors most likely to regress.
- Changes:
  - Add/expand tests for:
    - `src/providers/ConnectionsProvider.ts`
    - `src/providers/QueueMessagesPanel.ts`
    - `src/extension.ts` activation/wiring/error/lifecycle paths
    - `src/adapters/azure/AzureClientFactory.ts`
    - `src/adapters/vscode/VsCodeMessageGridColumnsRepository.ts`
    - `src/domain/messageGrid/MessageGridColumnsService.ts`
  - Follow TDD-first for each behavior change or defect uncovered while writing tests.
- Independent deployability:
  - Yes. Tests can be merged incrementally by area.
- Independent testability:
  - Yes. Each added test file/spec is runnable and reviewable independently.
- Documentation updates required? (Yes/No):
  - Possibly. Update `docs/architecture.md` only if test-approach section becomes materially different.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - New tests cover identified high-risk paths.
  - All tests pass locally and in CI.
  - No unrelated production behavior changes.

### Slice 3: Add Coverage Visibility (Non-Blocking)
- Objective:
  - Surface coverage trends to aid review and prioritization without creating merge friction.
- Changes:
  - Add coverage tooling/report output to CI (informational only).
  - Publish coverage artifact/summary in CI logs or job summary.
  - Add contribution guidance on interpreting coverage deltas in PR review.
- Independent deployability:
  - Yes. Reporting-only change with no gate behavior.
- Independent testability:
  - Yes. Verify coverage report generation and artifact publication.
- Documentation updates required? (Yes/No):
  - Yes (`docs/contributing.md`; optionally `docs/architecture.md` testing section for alignment).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Coverage report is visible in CI output/artifacts.
  - CI does not fail due to coverage percentage.
  - Docs explicitly describe coverage as non-gating.

## Progress Log
- 2026-02-16 00:00 - Created plan.
- 2026-02-16 00:15 - Completed Slice 1: documented integration-test trigger policy, split test scripts into explicit unit/integration commands, and updated CI to run integration tests only when integration-relevant paths changed.
- 2026-02-16 20:20 - Slice 2 (partial): added targeted unit tests for provider-facing helpers (`parseDroppedMessages`, `serializeForInlineScript`) and integrated them into `ConnectionsProvider`/`QueueMessagesPanel` to reduce payload-parsing and inline-script risks.
- 2026-02-16 20:31 - Slice 2 (partial): fixed queue-panel reuse context bug by ensuring panel connection string updates alongside queue identity, with dedicated unit coverage for context updates.
- 2026-02-16 20:37 - Slice 2 (partial): refactored queue-panel context helper to a pure function (`resolveQueuePanelContext`) and kept side effects at the provider boundary.

## Decisions and Notes
- Integration tests are required when new/changed code affects integration-relevant behavior.
- Coverage is for visibility and discussion only; no merge gates are introduced.
- TDD-first policy remains mandatory for defects and behavior changes.
- If implementation reveals a major architecture decision, add/update ADR per `docs/adr/README.md`.
- For webview-bound message data, treat inline-script serialization as a dedicated concern with dedicated unit tests.
- For drag/drop payloads, parse through a validated helper and avoid logging raw transfer payloads.
- Reused UI panels that carry operational credentials must update all mutable execution context fields, not just visible identity fields.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [ ] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [ ] Each completed slice is independently deployable and testable
- [ ] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Provider-heavy code can still be tested quickly by extracting narrow, pure helper modules and placing tests under the unit test path.
- Security-sensitive transformations (inline webview data) should be explicit utilities with focused tests rather than incidental string handling in large UI templates.
- Logging discipline is easier to enforce when parsing/validation happens in a single helper that returns `undefined` for invalid payloads.
- Queue/connection context updates in reusable panels are a regression-prone area; small extracted helpers make these transitions explicit and testable.
- Pure helper functions reduce regression risk and make high-risk context transitions easier to test and reason about.

## Outcome
In progress. Slice 1 completed; Slices 2 and 3 pending.
