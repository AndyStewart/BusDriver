# Plan: feature-oriented-structure

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Restructure the source layout from layer-first organization to feature-first organization so related code can be found and changed in localized areas without changing runtime behavior.

## Background and Context
BusDriver currently uses explicit hexagonal architecture boundaries (domain/application/ports/adapters) but files are grouped globally by technical layer. This makes feature work span many top-level folders.

## Scope
- In scope:
- Move source files into `src/features/*` and a minimal `src/shared/*`.
- Preserve existing primary/secondary port boundaries and dependency direction.
- Update imports and composition wiring.
- Update docs to reflect the new structure.
- Validate with lint, compile, compile-tests, and unit tests.
- Out of scope:
- Functional behavior changes.
- New dependencies.
- Test architecture redesign beyond required import/path alignment.

## Design Summary
Use feature folders as primary navigation and keep hexagonal sub-structure inside each feature. Introduce `src/shared` only for cross-feature concerns (logger, telemetry, Azure client factory). Keep `src/extension.ts` as composition root.

## Vertical Slices (Top-Down)
### Slice 1: Create feature shells and relocate files
- Objective:
- Establish `connections`, `queues`, and `queueMessages` feature directories with minimal `shared` support.
- Changes:
- Move files into feature folders and preserve existing names/logic.
- Independent deployability:
- Yes. Pure file organization with import rewiring.
- Independent testability:
- Yes. Compile and unit tests validate no behavior regression.
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- TypeScript compile succeeds after import updates.

### Slice 2: Rewire composition and remaining references
- Objective:
- Update `src/extension.ts` and all call sites to the new paths.
- Changes:
- Fix imports in source and tests; remove old path usage.
- Independent deployability:
- Yes.
- Independent testability:
- Yes. Compile + unit tests cover this slice.
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- `npm run lint`, `npm run compile`, `npm run compile-tests`, `npm run test:unit` pass.

### Slice 3: Documentation and closeout
- Objective:
- Align architecture/contributing guidance with new source layout.
- Changes:
- Update `docs/architecture.md` and `AGENTS.md` repository pointers where needed.
- Independent deployability:
- Yes.
- Independent testability:
- Yes. Documentation review + validation checklist.
- Documentation updates required? (Yes/No):
- Yes.
- Plan update required for this slice? (Yes/No):
- Yes.
- Acceptance checks:
- Docs accurately reference new paths and plan is completed.

## Progress Log
- 2026-02-16 21:53 - Created plan and started implementation.
- 2026-02-16 21:55 - Completed Slice 1 by moving source files into `src/features/{connections,queues,queueMessages}` and `src/shared`.
- 2026-02-16 21:57 - Completed Slice 2 by rewiring imports in source, composition root, and tests.
- 2026-02-16 22:00 - Completed Slice 3 by updating architecture/contributing/agent docs and adding ADR-0004.

## Decisions and Notes
- Keep hexagonal boundaries inside each feature to preserve ADR-0001 and ADR-0003.
- Limit `src/shared` to true cross-feature concerns only.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Large structure moves are safer when done in two explicit passes: file relocation first, then import rewiring driven by compiler errors.
- Bulk test import updates are practical when path conventions are consistent and followed by strict compile/test validation.

## Outcome
Completed a feature-first source organization while preserving hexagonal boundaries:
- Source now groups by feature in `src/features/{connections,queues,queueMessages}`.
- Shared cross-feature code is in `src/shared`.
- Composition remains in `src/extension.ts`.
- Source/test imports were migrated and all validation checks passed.
