# BusDriver Agent Guide

## Purpose
A concise contract for agents working in this repository. Use this file for execution rules and command truth; use `docs/*` for detailed context.

## Source of Truth
When guidance conflicts, use this order:
1. User request
2. This `AGENTS.md`
3. Repository configs/scripts (`package.json`, `.github/workflows/ci.yml`, `.eslintrc.json`, `tsconfig.json`)
4. Project docs (`docs/*`)

## Hard Constraints (Non-Negotiable)
- Never log secrets (connection strings, keys, tokens, raw sensitive payloads).
- Keep domain code isolated from VS Code/Azure SDK details.
  - No VS Code/Azure imports in `src/domain/**`.
  - Depend on ports in `src/ports/**`; implement in adapters under `src/adapters/**`.
- For defects or behavior changes, follow TDD-first:
  1. Write a failing test.
  2. Implement minimal code to pass.
  3. Refactor with tests green.
- Keep changes scoped and reviewable; avoid unrelated refactors.
- Throw `Error` objects, not literals.

## Fast Context Loading (Progressive)
Load only what is needed, in this order:
1. `docs/product.md`
2. `docs/architecture.md`
3. `docs/adr/README.md`
4. `docs/contributing.md`
5. Only then inspect relevant code.

## Mandatory Planning Rule
For non-trivial work, create and maintain a plan file in `docs/plans/`.
- Naming: `docs/plans/YYYY-MM-DD-short-title.md`
- Start from: `docs/plans/_template.md`
- Plans must:
  - use independently testable/deployable vertical slices
  - state whether docs updates are required per slice
  - state whether plan updates are required per slice
  - include a `Lessons Learned` section
  - be updated during execution and closed out before completion

## Documentation Update Rule
Documentation updates are part of implementation, not follow-up.
On non-trivial changes, verify and update as applicable:
- `docs/product.md` (purpose/scope/aim changes)
- `docs/architecture.md` (layer/dependency/runtime-flow changes)
- `docs/adr/*` (major architectural decisions)
- `docs/contributing.md` (process or quality-gate changes)

## Repository Pointers
- Runtime composition: `src/extension.ts`
- Domain: `src/domain/**`
- Ports: `src/ports/**`
- Adapters: `src/adapters/**`
- Providers/UI orchestration: `src/providers/**`
- Tests: `src/test/**` (compiled output in `out/test/**`)

## Commands (Authoritative)
Install:
- `npm ci` (CI/deterministic)
- `npm install` (local dev)

Build:
- `npm run compile`
- `npm run package`
- `npm run watch`

Tests:
- `npm run compile-tests`
- `npm run test:unit`
- `npm run test:integration`
- `npm test` (runs `test:unit` then `test:integration`)

Lint:
- `npm run lint`
- `npx eslint src --ext ts --fix`

Single-test fast loop:
1. `npm run compile-tests && npm run compile`
2. `npx mocha "out/test/**/*.js" --grep "pattern"`

## CI Reality (`.github/workflows/ci.yml`)
Current CI sequence:
1. `npm ci`
2. `npm run lint`
3. `npm run compile`
4. `npm run test:unit`
5. Run integration tests conditionally (path filter) via `xvfb-run -a npm run test:integration`
6. On `main`, package `.vsix`

## Coding Conventions
- TypeScript strict-first; explicit types on public APIs.
- Avoid `any`; prefer `unknown` + narrowing.
- Interface names should not use `I` prefix.
- Import order: external -> internal absolute -> `../` -> `./`.
- Prefer `const`; use `let` only when required.
- Keep code readable; comments should explain why, not what.

## Definition of Done (Agent Completion Checklist)
Before considering work complete:
- Relevant tests added/updated (TDD-first when required).
- `npm run lint` passes.
- `npm run compile` and `npm run compile-tests` pass.
- Required tests pass:
  - always: `npm run test:unit`
  - add `npm run test:integration` when integration-relevant code changed (`src/extension.ts`, `src/providers/**`, `src/adapters/**`, or build/test wiring).
- Documentation reviewed and updated in the same change set.
- Plan file updated with progress, validation, outcome, and lessons learned.

## When to Request Human Review
- UX or extension activation behavior changes.
- Secret storage/retrieval changes.
- Major architecture shifts (also add/update ADR).
- New dependency additions.

## Keep This File Healthy
If scripts/CI/architecture change, update this file in the same PR to prevent instruction drift.
