# Plan: Explicit Primary and Secondary Ports

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Make Cockburn primary ports explicit as inbound use-case interfaces while keeping all ports under `src/ports/` and separating primary (`src/ports/primary`) and secondary (`src/ports/secondary`) concerns.

## Background and Context
The repository currently uses `src/ports/*` for outbound dependency interfaces only (repositories, operations, telemetry). Inbound use-case interfaces are not explicit, and orchestration remains concentrated in `src/providers/**` and `src/extension.ts`. This obscures primary/secondary port boundaries in a ports-and-adapters architecture.

## Scope
- In scope:
  - Split `src/ports/` into `primary` and `secondary` subfolders.
  - Introduce explicit primary interfaces named for service capabilities (no `Port` suffix).
  - Implement use-case classes for message move/delete/purge/open flows and route extension/provider orchestration through them.
  - Update imports, tests, and docs/ADR as needed.
- Out of scope:
  - Intentional user-visible behavior changes.
  - Unrelated refactors outside boundary/orchestration concerns.

## Design Summary
Introduce inbound capability interfaces in `src/ports/primary/**` and implement them in `src/application/useCases/**`. Keep outbound dependency interfaces in `src/ports/secondary/**`. Compose use-cases in `src/extension.ts` and delegate provider/command orchestration to these use-cases. Preserve existing command IDs and user flows.

## Vertical Slices (Top-Down)

### Slice 1: Ports Taxonomy Split
- Objective:
  - Separate primary vs secondary ports explicitly under `src/ports/`.
- Changes:
  - Move existing outbound interfaces to `src/ports/secondary/**`.
  - Add primary capability interfaces in `src/ports/primary/**`.
  - Update imports across domain/adapters/providers/tests.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Yes (`docs/architecture.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Compile succeeds with updated imports and explicit primary/secondary folders.

### Slice 2: Use-Case Services and Orchestration Delegation
- Objective:
  - Move command/provider orchestration into use-case implementations behind primary interfaces.
- Changes:
  - Add `src/application/useCases/**` implementations.
  - Rewire `src/extension.ts` and `src/providers/ConnectionsProvider.ts` to call primary services.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Yes (`docs/architecture.md`; ADR if major boundary decision is formalized).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Behavior remains equivalent for move/delete/purge/open flows.

### Slice 3: Validation and Documentation Closeout
- Objective:
  - Validate quality gates and finalize architecture/docs updates.
- Changes:
  - Run lint/compile/tests.
  - Update architecture docs and ADR; close out plan with lessons learned.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Validation checklist completed and plan closed.

## Progress Log
- 2026-02-16 20:35 - Created plan.
- 2026-02-16 20:39 - Completed Slice 1: moved existing outbound interfaces to `src/ports/secondary/**`, introduced inbound capability interfaces in `src/ports/primary/**`, and migrated imports across source/tests.
- 2026-02-16 20:45 - Completed Slice 2: added application use-case implementations and rewired `src/extension.ts` and `src/providers/ConnectionsProvider.ts` to delegate move/delete/purge/open orchestration through primary interfaces.
- 2026-02-16 20:50 - Completed Slice 3: updated architecture/contribution docs and ADR; ran lint, compile, compile-tests, unit tests, and integration tests successfully.

## Decisions and Notes
- Primary interfaces are capability named with no suffix (for example: `MoveMessages`, `DeleteMessages`).
- All ports remain in `src/ports/**` with `primary` and `secondary` subfolders.
- Existing command IDs and user-facing flows were preserved while shifting orchestration boundaries.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Introducing explicit primary ports is easiest when done as a taxonomy migration first (`ports/primary` and `ports/secondary`) before moving orchestration call sites.
- Use-case wrappers provide a low-risk path to rebalance orchestration out of providers and `extension.ts` without immediate UX changes.
- Keeping existing integration tests intact while changing composition boundaries gives strong confidence in behavior parity.

## Outcome
Completed. BusDriver now has explicit Cockburn-style primary ports under `src/ports/primary/**`, secondary ports under `src/ports/secondary/**`, and application use-cases in `src/application/useCases/**` with extension/provider orchestration delegated through primary interfaces.
