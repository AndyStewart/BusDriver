# Plan: remove-shared-ports

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Blocked

## Goal
Remove `src/shared/ports/**` and replace it with concrete application-level types.

## Background and Context
The repository introduced shared cross-feature ports for connection, queue, logger, and telemetry contracts. The requested direction is to stop using shared ports and instead rely on actual application types.

## Scope
- In scope:
  - Replace `src/shared/ports/**` imports with application-level type sources.
  - Define concrete interfaces/types in feature/shared application folders as needed.
  - Remove `src/shared/ports/**` files.
  - Update lint/docs and validate required gates.
- Out of scope:
  - Behavior changes in command flows.
  - Major architecture redesign beyond type-location migration.

## Design Summary
Promote alias types to real application types in feature folders (`connections/application`, `queueMessages/application`) and move logger/telemetry contracts to `src/shared/application/**`. Update all imports and rules/docs to remove references to `src/shared/ports/**`, then delete the folder.

## Vertical Slices (Top-Down)
### Slice 1: Type Source Migration
- Objective:
  - Replace all shared-port imports with application type imports.
- Changes:
  - Define concrete `Connection`, `ConnectionLookup`, and `Queue` application types.
  - Move logger/telemetry contracts to shared application path.
  - Update feature code/tests/adapters.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run compile`, `npm run test:unit`).
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - No `shared/ports` imports remain.

### Slice 2: Rule + Docs Alignment
- Objective:
  - Align lint rules and architecture docs with new type locations.
- Changes:
  - Remove shared-port-specific override and update messages.
  - Update architecture/contributing docs.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`).
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Lint reflects new conventions without regressions.

### Slice 3: Remove Shared Ports + Validate
- Objective:
  - Delete `src/shared/ports/**` and verify full gates.
- Changes:
  - Remove files and run validation.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (full required gates).
- Documentation updates required? (Yes/No):
  - Maybe.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - `src/shared/ports` no longer exists and required checks pass.

## Progress Log
- 2026-03-01 17:49 - Created plan and started implementation.
- 2026-03-01 17:50 - Superseded by updated request to enforce interface-only feature ports.

## Decisions and Notes
- Use structural typing to keep behavior stable while relocating type declarations.

## Validation
- [ ] Lint passes
- [ ] Build/compile passes
- [ ] Tests pass
- [ ] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [ ] Each completed slice is independently deployable and testable
- [ ] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Pending implementation.

## Outcome
Superseded by `ports-interfaces-only` work; no implementation executed from this plan.
