# Plan: eslint-config-hardening

- Date: 2026-03-01
- Owner: Codex (GPT-5)
- Status: Completed

## Goal
Harden ESLint configuration by improving TypeScript project resolution reliability, enforcing remaining warning-level rules as errors, and narrowing broad test overrides.

## Background and Context
BusDriver now has zero ESLint warnings and strict type-aware rules enabled. Remaining config quality work is to avoid cwd-dependent type-aware resolution (`tsconfigRootDir`), align warning-level rules with strict CI enforcement, and reduce override blast radius in tests.

## Scope
- In scope:
  - Configure `tsconfigRootDir` reliably for type-aware linting.
  - Promote remaining warning-level rules to errors.
  - Narrow `@typescript-eslint/require-await` test override scope.
  - Re-run lint/compile/tests and adjust with minimal safe fixes if needed.
- Out of scope:
  - Unrelated refactors.
  - Broad test architecture rewrites.

## Design Summary
Move from `.eslintrc.json` to `.eslintrc.cjs` so `tsconfigRootDir: __dirname` can be applied correctly. Keep existing rules intact, promote current warn-only rules to error, and reduce `require-await` override from all test files to targeted test support paths where Promise-shaped stubs are expected.

## Vertical Slices (Top-Down)
### Slice 1: Config Runtime Hardening
- Objective:
  - Ensure type-aware lint config is stable across cwd/editor/CI contexts.
- Changes:
  - Replace `.eslintrc.json` with `.eslintrc.cjs`.
  - Add `tsconfigRootDir: __dirname`.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`).
- Documentation updates required? (Yes/No):
  - No.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Lint loads config successfully and resolves project correctly.

### Slice 2: Rule Severity Alignment
- Objective:
  - Remove remaining warning-only enforcement.
- Changes:
  - Promote `@typescript-eslint/naming-convention`, `@typescript-eslint/semi`, `curly`, `eqeqeq`, `no-throw-literal` to `error`.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`, `npm run compile`).
- Documentation updates required? (Yes/No):
  - Maybe (`docs/contributing.md` if policy wording needs tightening).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - No warn-level rules remain in config.
  - Lint remains clean.

### Slice 3: Test Override Narrowing
- Objective:
  - Keep `require-await` override targeted to test scaffolding only.
- Changes:
  - Replace broad `src/test/**/*.ts` override with narrow patterns.
  - Fix any surfaced violations needed to preserve lint pass.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes (`npm run lint`, `npm run compile-tests`, `npm run test:unit`, `npm run test:integration`).
- Documentation updates required? (Yes/No):
  - No.
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Override no longer applies to all tests.
  - Lint and required tests pass.

## Progress Log
- 2026-03-01 16:36 - Created plan and started execution.
- 2026-03-01 16:37 - Completed Slice 1: migrated ESLint config to `.eslintrc.cjs` and added `tsconfigRootDir: __dirname`.
- 2026-03-01 16:37 - Completed Slice 2: promoted remaining warn-level rules to `error`.
- 2026-03-01 16:37 - Completed Slice 3: narrowed `require-await` test override to targeted support and test paths.
- 2026-03-01 16:38 - Validation run complete: `npm run lint`, `npm run compile`, `npm run compile-tests`, `npm run test:unit`, and `npm run test:integration` passed.

## Decisions and Notes
- Prefer config migration to CJS over string-based `tsconfigRootDir` in JSON for deterministic path resolution.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Converting to `.eslintrc.cjs` is the safest way to ensure stable `tsconfigRootDir` behavior across editor and CLI contexts.
- Narrow overrides should target specific test scaffolding locations, not entire test trees.

## Outcome
Completed: ESLint config is now cwd-stable for type-aware linting, warning-level rule severities are aligned to errors, test override scope is narrowed, and all validation gates pass.
