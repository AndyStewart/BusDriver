# ADR-0001: Use Ports-and-Adapters (Hexagonal) Architecture

- Date: 2026-02-16
- Status: Accepted

## Context
The extension integrates VS Code APIs and Azure Service Bus SDK concerns while needing testable domain logic.

## Decision
Separate domain logic (`src/domain`) from infrastructure via explicit ports (`src/ports`) and adapters (`src/adapters`). Compose dependencies in `src/extension.ts`.

## Consequences
Improved testability and maintainability; added interface and wiring overhead.

## Related Changes
- `src/domain`
- `src/ports`
- `src/adapters`
- `src/extension.ts`
