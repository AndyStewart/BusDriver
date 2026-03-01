# ADR-0004: Feature-Oriented Source Organization

- Date: 2026-02-16
- Status: Superseded

## Context
BusDriver used a global layer-first structure (`src/domain`, `src/application`, `src/ports`, `src/adapters`, `src/providers`) that preserved hexagonal boundaries but spread feature changes across many top-level folders.

This increased navigation overhead for common work where related connection, queue, and queue-message behavior needs to be changed together.

## Decision
Adopt a feature-first source layout under `src/features/*`, while keeping ports-and-adapters boundaries inside each feature.

- Each feature owns local `application`, `ports`, and `adapters` folders.
- Keep true cross-feature infrastructure in `src/shared/*`.
- Keep `src/extension.ts` as the composition root for wiring features and shared adapters.
- Mirror source feature structure in tests under `src/test/features/*`, with cross-feature test utilities in `src/test/shared/*`.

## Consequences
Positive:
- Related code is localized by feature.
- Hexagonal dependency direction is preserved.
- Composition and integration behavior remain centralized.

Tradeoffs:
- Cross-feature imports require explicit boundaries.
- Existing docs/tests/import paths must be updated during migration.

## Related Changes
- `src/features/**`
- `src/shared/**`
- `src/extension.ts`
- `docs/architecture.md`
- `docs/contributing.md`
- `AGENTS.md`
- Superseded by `docs/adr/0005-top-level-layer-source-organization.md`
