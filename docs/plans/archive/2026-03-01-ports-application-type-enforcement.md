# Plan: ports-application-type-enforcement

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Completed

## Goal
Enforce and satisfy a strict port contract rule: feature port files are interface-only, and port interface method parameter/return custom types must come from feature application folders.

## Background and Context
Current custom linting enforces interface-only port files and method-only interface members. It does not currently enforce that method signature custom types originate from `application` folders, and compatibility wrappers in ports currently violate that intent.

## Scope
- In scope:
  - Update the custom ESLint rule to enforce both constraints together.
  - Refactor feature port files to remove compatibility wrapper types.
  - Update dependent imports in application/adapters/tests to use application type modules.
  - Update docs and validate required gates.
- Out of scope:
  - Runtime behavior changes.

## Design Summary
Enhance `port-interface-application-types` to inspect `TSMethodSignature` types in feature port interfaces and require custom type references to be imported from application paths. Allow built-in utility/global types. Keep interface-only and method-only checks active. Refactor ports to declare only method interfaces and import request/response DTO types from application modules.

## Vertical Slices (Top-Down)
### Slice 1: Rule Enhancement
- Objective:
  - Enforce application-type origin for port method signatures.
- Changes:
  - Update `eslint-rules/port-interface-application-types.js`.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`).
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Lint flags custom port method types not imported from application.

### Slice 2: Compliance Refactor
- Objective:
  - Make all feature ports pass the stricter rule.
- Changes:
  - Remove port-level compatibility wrapper interfaces.
  - Update imports/usages across code and tests to application type modules.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run compile`, `npm run test:unit`).
- Documentation updates required? (Yes/No):
  - Yes.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - All `src/features/**/ports/**/*.ts` pass rule without suppressions.

### Slice 3: Validation and Closeout
- Objective:
  - Confirm no regressions and archive plan.
- Changes:
  - Run lint/build/tests; close and archive plan.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Maybe.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Required quality gates pass.

## Progress Log
- 2026-03-01 18:03 - Created plan and started implementation.
- 2026-03-01 18:13 - Completed Slice 1: enhanced custom rule for method-only interfaces and application-sourced custom method types.
- 2026-03-01 18:20 - Completed Slice 2: removed port wrapper interfaces and updated consumers to application DTO/result type imports.
- 2026-03-01 18:24 - Completed Slice 3 validation: `npm run lint`, `npm run compile-tests`, `npm run test:unit`, and `npm run test:acceptance` passed.

## Decisions and Notes
- Prefer direct application type imports over port wrappers to preserve a single source of truth.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Allowing interface-wrapper compatibility types in ports defeats the architectural intent; direct application type imports keep contracts honest and simpler.
- Cycle-safe AST walking is required in custom rules that inspect TypeScript method signature types.

## Outcome
Custom linting now enforces both constraints together for feature ports, and the codebase was refactored so all feature ports comply without suppressions.
