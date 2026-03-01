# Plan: custom-eslint-boundary-rules

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Completed

## Goal
Add custom ESLint enforcement for coding conventions and architecture boundaries while preserving current delivery velocity with a staged rollout.

## Background and Context
BusDriver follows a ports-and-adapters architecture with feature-local `application`, `ports`, and `adapters` folders plus shared cross-feature layers under `src/shared/**`. Existing linting is strict but mostly generic and does not yet codify architectural boundaries such as no feature-to-feature coupling and purity rules for `application` and `ports` layers.

## Scope
- In scope:
  - Add ESLint boundary rules for application, ports, and adapter layers.
  - Add migration carve-outs for current cross-feature adapter coupling.
  - Refactor current application-layer cross-feature dependencies to shared contracts.
  - Add initial safety linting for console usage and inline script serialization hygiene.
  - Update docs describing the new lint policy.
- Out of scope:
  - Full elimination of existing adapter-level cross-feature coupling.
  - Broad feature decomposition or command runtime redesign.

## Design Summary
Use config-only ESLint restrictions via targeted `overrides` and `no-restricted-imports`/`no-restricted-syntax`, then refactor the highest-impact current violations by moving shared connection contracts into `src/shared/ports/**` and depending on shared lookup ports. Keep rules actionable immediately with a two-phase migration approach: strict in core layers now, warn with explicit carve-outs where legacy adapter coupling still exists.

## Vertical Slices (Top-Down)
### Slice 1: Shared Connection Contracts + Application Decoupling
- Objective:
  - Remove application-layer feature-to-feature imports by introducing shared contracts.
- Changes:
  - Add `src/shared/ports/Connection.ts` and `ConnectionLookup.ts`.
  - Update queue/queueMessages application services to depend on shared contracts.
  - Keep connection feature compatibility through re-export and repository extension.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run compile`, `npm run test:unit`).
- Documentation updates required? (Yes/No):
  - Yes (`docs/architecture.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - No application-layer cross-feature imports remain in queue/queueMessages.

### Slice 2: ESLint Boundary Rule Enforcement
- Objective:
  - Enforce architecture direction in lint config.
- Changes:
  - Add overrides for application/ports purity.
  - Add no-cross-feature import restrictions by feature.
  - Add adapter-level warning rule with targeted carve-outs for known legacy files.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`).
- Documentation updates required? (Yes/No):
  - Yes (`docs/contributing.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Lint catches restricted import patterns and passes on current codebase.

### Slice 3: Safety Rule Tranche
- Objective:
  - Encode baseline logging and webview safety conventions.
- Changes:
  - Restrict console usage to explicit boundary files.
  - Add targeted webview inline-script guardrail rule.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`, `npm run test:unit`).
- Documentation updates required? (Yes/No):
  - Yes (`docs/contributing.md`, `docs/architecture.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - New safety rules are active without introducing lint regressions.

## Progress Log
- 2026-03-01 17:14 - Created plan and started implementation.
- 2026-03-01 17:20 - Completed Slice 1 code refactor for shared connection contracts and application-layer decoupling.
- 2026-03-01 17:24 - Completed Slice 2 ESLint boundary enforcement with adapter migration carve-outs.
- 2026-03-01 17:25 - Completed Slice 3 safety-rule tranche (console restrictions and webview inline-script guardrail).
- 2026-03-01 17:27 - Validation run complete: `npm run lint`, `npm run compile`, `npm run compile-tests`, `npm run test:unit`, `npm run test:integration`, and `npm run test:acceptance` passed.

## Decisions and Notes
- Enforce strict boundaries immediately in `application` and `ports`; use staged carve-outs for legacy adapter coupling.
- Prefer shared contracts over feature port sharing when cross-feature access is required.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Promoting boundaries at `application`/`ports` first provides immediate architectural value while allowing staged adapter migration.
- Shared contract extraction (`src/shared/ports/**`) removes cross-feature pressure without requiring broad runtime rewiring.
- Safety lint guardrails are practical when they are path-scoped and explicit about allowed boundary exceptions.

## Outcome
Implemented shared connection contracts, removed current application-layer cross-feature dependency points, added custom ESLint boundary/safety rules with migration carve-outs, and validated with full required quality gates.
