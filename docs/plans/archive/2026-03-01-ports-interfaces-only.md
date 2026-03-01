# Plan: ports-interfaces-only

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Completed

## Goal
Modify the custom ports lint rule so feature port files can contain interfaces only, with no `type` aliases or type re-exports.

## Background and Context
The previous custom rule focused on type origin constraints. The updated requirement is stricter and simpler: in feature `ports` files, only interface-based contracts are allowed.

## Scope
- In scope:
  - Update custom ESLint rule behavior.
  - Remove type alias/re-export usage from feature port files.
  - Update documentation to reflect the new rule semantics.
  - Validate lint/build/tests.
- Out of scope:
  - Runtime behavior changes.

## Design Summary
Keep the existing custom rule name but change enforcement logic to:
- disallow `TSTypeAliasDeclaration`
- disallow `export type { ... }` re-exports
- allow only exported interfaces as declarations in feature `ports` files

## Vertical Slices (Top-Down)
### Slice 1: Rule Update
- Objective:
  - Enforce interface-only rule in feature ports.
- Changes:
  - Rewrote `eslint-rules/port-interface-application-types.js`.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`).
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Lint flags type aliases/re-exports in feature `ports`.

### Slice 2: Port File Cleanup
- Objective:
  - Make existing feature ports compliant.
- Changes:
  - Removed type re-exports and restored interface declarations in affected port files.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run compile`, `npm run test:unit`).
- Documentation updates required? (Yes/No):
  - Maybe.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - No feature port file contains `type` alias declarations or type re-exports.

### Slice 3: Validation + Docs
- Objective:
  - Ensure no regressions and align docs.
- Changes:
  - Updated architecture/contributing wording.
  - Ran required checks.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Lint/build/tests pass.

## Progress Log
- 2026-03-01 17:50 - Created plan and started implementation.
- 2026-03-01 17:52 - Completed rule rewrite and port cleanup.
- 2026-03-01 17:54 - Validation complete: lint, compile, compile-tests, unit, acceptance all passed.

## Decisions and Notes
- Kept rule identifier stable to avoid config churn while changing enforcement semantics.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- A narrow syntactic rule is more robust than path/origin inference for this convention.

## Outcome
Implemented interface-only enforcement for feature ports and aligned existing port contracts/docs.
