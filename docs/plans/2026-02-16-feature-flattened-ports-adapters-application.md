# Plan: feature-flattened-ports-adapters-application

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Flatten each feature to three folders (`application`, `ports`, `adapters`) and apply concrete adapter prefixes so feature code remains localized but less nested.

## Background and Context
The repository was recently moved to feature-first organization. Current feature internals still include additional nested technical folders (`domain`, `ui`, `ports/primary`, `ports/secondary`, `adapters/{azure,vscode}`), which increases navigation depth.

## Scope
- In scope:
- Flatten `src/features/{connections,queues,queueMessages}` to `application`, `ports`, and `adapters`.
- Move and rename adapter-related files with concrete prefixes (`VsCode*Adapter`, `Azure*Adapter`, `Webview*Adapter`, `Tree*Adapter`, `Command*Adapter`).
- Flatten and rename port files into single `ports` folders.
- Rewire all source/test imports and update docs.
- Out of scope:
- Functional behavior changes.
- New dependencies.

## Design Summary
Use feature folders as the top-level context and use three internal folders only. Keep architecture boundaries by naming and contracts: ports remain explicit in `ports/*.ts`, use cases/services remain in `application/`, and all boundary/integration code (including UI tree/webview) is in `adapters/`.

## Vertical Slices (Top-Down)
### Slice 1: Structural flattening and adapter-prefix renames
- Objective:
- Convert feature internals to `application`, `ports`, `adapters` and apply adapter prefix naming.
- Changes:
- Move files and rename adapters.
- Independent deployability:
- Yes.
- Independent testability:
- Yes.
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- No old nested directories remain under feature internals.

### Slice 2: Import rewiring and build/test stabilization
- Objective:
- Update imports across source and tests for new paths and names.
- Changes:
- Patch source and test imports and type references.
- Independent deployability:
- Yes.
- Independent testability:
- Yes.
- Documentation updates required? (Yes/No):
- No.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- `npm run lint`, `npm run compile`, `npm run compile-tests`, `npm run test:unit`, `npm run test:integration` pass.

### Slice 3: Docs and closeout
- Objective:
- Align architecture and contributor guidance with flattened feature structure.
- Changes:
- Update `docs/architecture.md`, `docs/contributing.md`, and `AGENTS.md`; close plan with validation and lessons learned.
- Independent deployability:
- Yes.
- Independent testability:
- Yes.
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- Docs reflect final directory and naming conventions.

## Progress Log
- 2026-02-16 22:04 - Created plan and began flattening implementation.
- 2026-02-16 22:07 - Completed Slice 1 by flattening features to `application`, `ports`, and `adapters` and applying concrete adapter prefixes.
- 2026-02-16 22:11 - Completed Slice 2 by rewiring source and test imports and stabilizing build/test execution.
- 2026-02-16 22:17 - Completed Slice 3 by updating architecture/contributing/agent docs and ADR to final structure.

## Decisions and Notes
- Treat UI tree/webview code as primary adapters and place them in `adapters/`.
- Keep ports explicit in `ports/*.ts` without a `.port` filename suffix.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Flattening after a larger move is safest when done as staged slices: move first, then import rewiring, then test harness updates.
- Mirroring feature structure in tests is manageable when unit and integration globs are updated in the same change.

## Outcome
Completed a flattened feature architecture and mirrored test structure:
- `src/features/{connections,queues,queueMessages}` now use `application/`, `ports/`, and `adapters/` only.
- `src/test` now mirrors source organization with `src/test/features/**` and `src/test/shared/**`.
- Unit and integration commands were updated and all validation commands pass.
