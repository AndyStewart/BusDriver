# Plan: global-layer-source-restructure

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Completed

## Goal
Restructure source layout to top-level `ports`, `adapters`, and `features` while preserving runtime behavior.

## Background and Context
The repository currently uses feature-local `application`, `ports`, and `adapters` folders under `src/features/*` plus `src/shared/*` for cross-feature types and adapters. The requested target structure centralizes ports and adapters at top-level and keeps feature internals focused on application logic.

## Scope
- In scope:
- Move feature and shared port files into `src/ports/{primary,secondary}`.
- Move feature and shared adapter files into `src/adapters/{primary,secondary}`.
- Keep feature core logic in `src/features/*/application`.
- Move shared application types to `src/features/common/application`.
- Rewire imports, lint rules, and test globs/paths.
- Update docs and ADR to reflect architecture change.
- Out of scope:
- Functional behavior changes.
- New dependencies.

## Design Summary
Adopt a layer-first top-level organization while preserving ports-and-adapters dependency direction. Primary and secondary roles are used consistently for both ports and adapters. Feature folders keep only application types/use-cases/services. Shared application-level types move to `src/features/common/application`.

## Vertical Slices (Top-Down)
### Slice 1: Governance and skeleton
- Objective:
- Establish plan + ADR + destination folder skeleton.
- Changes:
- Create and maintain this plan file.
- Add/update ADR to capture decision shift from feature-first to top-level layer-first.
- Independent deployability:
- Yes.
- Independent testability:
- Yes (docs-only review).
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- ADR clearly states supersession of prior feature-oriented organization decision.

### Slice 2: Ports and shared-type migration
- Objective:
- Centralize all contracts in top-level ports and remove shared ports.
- Changes:
- Move contracts to `src/ports/primary` and `src/ports/secondary`.
- Move `src/shared/application/*` to `src/features/common/application/*`.
- Update imports in source and tests.
- Independent deployability:
- Yes.
- Independent testability:
- Yes (`npm run compile`).
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- No feature-local/shared ports folders remain.

### Slice 3: Adapter migration and composition rewiring
- Objective:
- Centralize adapters into top-level primary/secondary folders.
- Changes:
- Move adapters from `src/features/**/adapters` and `src/shared/adapters/**` into `src/adapters/{primary,secondary}`.
- Rewire `src/extension.ts` and adapter/app imports.
- Independent deployability:
- Yes.
- Independent testability:
- Yes (`npm run compile`, `npm run compile-tests`).
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- No feature-local/shared adapter folders remain.

### Slice 4: Lint/test/docs alignment and validation
- Objective:
- Align quality gates and docs with new paths and finalize.
- Changes:
- Update ESLint override globs/messages and custom rule applicability.
- Move test folders to mirror structure and update `package.json` unit/coverage globs.
- Run required validation commands.
- Update architecture/contributing/AGENTS docs and finalize/archive plan.
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
- 2026-03-01 19:07 - Created plan and started implementation.
- 2026-03-01 19:14 - Completed Slice 1 by adding ADR-0005 and superseding ADR-0004.
- 2026-03-01 19:26 - Completed Slice 2 by moving ports to `src/ports/*` and shared application types to `src/features/common/application`.
- 2026-03-01 19:39 - Completed Slice 3 by moving adapters to `src/adapters/{primary,secondary}` and rewiring composition/imports.
- 2026-03-01 19:54 - Completed Slice 4 by aligning ESLint rules, test paths/scripts, docs, and full validation suite.

## Decisions and Notes
- Adapter role folders use `primary` and `secondary` (not inbound/outbound).
- Ports/adapters are fully flat within their role folders.
- Shared application types move to `src/features/common/application`.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Bulk file moves are safe when done in two phases: first deterministic relocation, then compile-driven import rewiring.
- Path-sensitive tests (template/file fixtures) should be revalidated immediately after test-folder restructuring.
- ESLint boundary rules should be updated in the same change as structure moves to avoid stale enforcement gaps.

## Outcome
Completed top-level layer-first restructuring with no behavioral regressions:
- Source now uses `src/ports/{primary,secondary}`, `src/adapters/{primary,secondary}`, and feature application folders under `src/features/**/application`.
- Shared application contracts moved to `src/features/common/application` and `src/shared/**` was removed.
- Test layout now mirrors production structure with adapter tests under `src/test/adapters/**` and application/common tests under `src/test/features/**`.
- Validation passed: `npm run lint`, `npm run compile`, `npm run compile-tests`, `npm run test:unit`, `npm run test:acceptance`, `npm run test:integration`.
