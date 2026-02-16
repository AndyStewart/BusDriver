# ADR-0003: Explicit Primary and Secondary Ports

- Date: 2026-02-16
- Status: Accepted

## Context
BusDriver already followed a ports-and-adapters style but represented only outbound interfaces in `src/ports/*` (repositories, queue registry, message operations, logging, telemetry). Inbound use-case interfaces (Cockburn primary ports) were implicit in provider and extension orchestration code.

That made the architecture less explicit and concentrated orchestration in VS Code-facing layers (`src/providers/**`, `src/extension.ts`).

## Decision
Adopt an explicit primary/secondary port taxonomy inside `src/ports/**`:

- `src/ports/primary/**`: inbound capability interfaces (for example, `MoveMessages`, `DeleteMessages`, `PurgeQueue`, `OpenQueueMessages`, `ListQueues`).
- `src/ports/secondary/**`: outbound dependency interfaces used by core/application logic.

Implement primary ports in `src/application/useCases/**` and compose them in `src/extension.ts`.

## Consequences
Positive:
- Cockburn terminology is explicit in the codebase.
- Command/provider orchestration can depend on stable inbound contracts.
- Composition root remains the place where adapters are connected.

Tradeoffs:
- More interfaces and files to maintain.
- Initial import migration across domain/adapters/providers/tests.

## Related Changes
- `src/ports/primary/**`
- `src/ports/secondary/**`
- `src/application/useCases/**`
- `src/extension.ts`
- `src/providers/ConnectionsProvider.ts`
- `docs/architecture.md`
