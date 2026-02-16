# ADR-0002: TDD-First for Defects and Behavior Changes

- Date: 2026-02-16
- Status: Accepted

## Context
Regression risk is highest when fixing defects or changing behavior without executable specifications.

## Decision
Require a failing test first, then minimal implementation to pass, then refactor with tests green.

## Consequences
Higher confidence and traceability; slightly slower upfront implementation.

## Related Changes
- `docs/contributing.md`
- `AGENTS.md`
