# Plan: port-interface-application-types-rule

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Completed

## Goal
Add ESLint enforcement ensuring feature port contracts are interfaces whose method custom types come from feature `application` folders.

## Background and Context
Current port files contain both port interfaces and DTO type declarations directly in `ports` folders. The requested convention is that a port should be interface-based and method custom types should be sourced from `application`.

## Scope
- In scope:
  - Add a custom ESLint rule enforcing port-interface type-source constraints.
  - Wire rule into lint execution.
  - Move feature-port DTO types from `ports` files into `application` contract files.
  - Keep compatibility with existing imports via type re-exports where needed.
  - Update docs and validate all quality gates.
- Out of scope:
  - Runtime behavior changes.
  - Shared-port (`src/shared/ports/**`) constraints under this new rule.

## Design Summary
Implement a custom rule loaded via `--rulesdir` that inspects exported interfaces in `src/features/**/ports/**/*.ts` and validates referenced custom types in method signatures resolve to imports from `application` paths. Move currently in-file port DTO types to new `application/*Types.ts` files and re-export from ports to minimize churn.

## Vertical Slices (Top-Down)
### Slice 1: Rule Infrastructure
- Objective:
  - Add and wire custom lint rule.
- Changes:
  - Add `eslint-rules/port-interface-application-types.js`.
  - Update lint script to load local rules.
  - Apply rule to feature ports override.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`).
- Documentation updates required? (Yes/No):
  - Yes (`docs/contributing.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Lint reports violations for non-application custom type references in feature port interfaces.

### Slice 2: Port DTO Relocation
- Objective:
  - Make existing ports compliant without API behavior changes.
- Changes:
  - Create application contract type files and update ports to import/re-export types.
  - Keep use-case/adapter imports working.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run compile`, `npm run test:unit`).
- Documentation updates required? (Yes/No):
  - Yes (`docs/architecture.md`).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - `src/features/**/ports/**/*.ts` passes new rule with no exceptions.

### Slice 3: Validation and Closeout
- Objective:
  - Confirm no regressions and close plan.
- Changes:
  - Run lint/build/tests and archive plan.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (full quality gates).
- Documentation updates required? (Yes/No):
  - Maybe.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Required quality gates all pass.

## Progress Log
- 2026-03-01 17:40 - Created plan and started implementation.
- 2026-03-01 17:41 - Completed Slice 1: added custom ESLint rule and wired local rule loading via `--rulesdir`.
- 2026-03-01 17:43 - Completed Slice 2: moved feature-port DTO contracts into application type files and updated port imports/re-exports.
- 2026-03-01 17:45 - Completed Slice 3 validation: `npm run lint`, `npm run compile`, `npm run compile-tests`, `npm run test:unit`, and `npm run test:acceptance` passed.

## Decisions and Notes
- Rule focuses on feature ports only (`src/features/**/ports/**`) because shared ports intentionally sit outside feature application layers.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Existing lint restrictions can conflict with new architectural conventions; separating feature-port and shared-port overrides keeps intent explicit.
- Cycle-safe AST traversal is required for local ESLint rules because ESTree nodes include parent references.

## Outcome
Implemented a custom lint rule that enforces feature-port interface custom method-signature types originate from feature application folders, relocated port DTOs into application contract files, and validated all required gates.
