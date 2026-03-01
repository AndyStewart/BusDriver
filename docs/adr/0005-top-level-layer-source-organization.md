# ADR-0005: Top-Level Layer Source Organization

- Date: 2026-03-01
- Status: Accepted

## Context
BusDriver adopted a feature-oriented structure where each feature owned local `application`, `ports`, and `adapters` folders. While this improved feature locality, the requested source navigation model is layer-first at top level:
- one place for all ports
- one place for all adapters
- feature folders focused on application logic

The repository also had `src/shared/**` for cross-feature contracts and adapter implementations, which no longer matches the requested structure.

## Decision
Adopt top-level layer folders and keep feature core logic within `src/features/**`:

- `src/features/**` for feature core logic and contracts.
- `src/features/common/**` for shared cross-feature core types.
- `src/ports/primary/**` and `src/ports/secondary/**` for all port contracts.
- `src/adapters/primary/**` and `src/adapters/secondary/**` for all adapters.
- Remove `src/shared/**`.
- Keep `src/extension.ts` as the composition root.

## Consequences
Positive:
- Ports and adapters are globally discoverable by role.
- Feature folders are narrower and focused on use-cases/types/services.
- Boundary rules align directly to top-level role folders.

Tradeoffs:
- Reverses ADR-0004 structure, requiring broad import/path rewiring.
- Adapter ownership by feature becomes naming/convention-driven rather than folder-driven.
- Test paths and lint constraints require synchronized updates to avoid drift.

## Related Changes
- `src/features/**`
- `src/ports/**`
- `src/adapters/**`
- `src/extension.ts`
- `.eslintrc.cjs`
- `docs/architecture.md`
- `docs/contributing.md`
- `AGENTS.md`
