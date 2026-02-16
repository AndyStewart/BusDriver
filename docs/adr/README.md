# Architecture Decision Records (ADR)

This directory captures major architectural decisions for BusDriver.

## When to Add or Update an ADR
Create or update an ADR when a change significantly affects:
- architecture layers or dependency direction
- domain boundaries or port contracts
- cross-cutting behavior (security, performance, reliability)
- long-term maintainability or operational model

If the change is major, do not merge without an ADR update.

## ADR File Format
- One ADR per file in this folder
- Naming: `NNNN-short-title.md` (example: `0003-use-foo.md`)
- Status values: `Proposed`, `Accepted`, `Superseded`

## ADR Template
Use this template for each new ADR:

```markdown
# ADR-NNNN: Title

- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded

## Context

## Decision

## Consequences

## Related Changes
- PR/issue/file links
```

## Index
- [ADR-0001: Use Ports-and-Adapters (Hexagonal) Architecture](./0001-use-ports-and-adapters-hexagonal-architecture.md)
- [ADR-0002: TDD-First for Defects and Behavior Changes](./0002-tdd-first-for-defects-and-behavior-changes.md)
- [ADR-0003: Explicit Primary and Secondary Ports](./0003-explicit-primary-secondary-ports.md)
- [ADR-0004: Feature-Oriented Source Organization](./0004-feature-oriented-source-organization.md)
