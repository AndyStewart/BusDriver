# BusDriver Architecture

## Overview
BusDriver is a VS Code extension for managing Azure Service Bus connections and queue messages from an Activity Bar view. The extension composes domain services with infrastructure adapters at activation time.

## Architectural Style
The project follows a ports-and-adapters (hexagonal) architecture:

- **Feature core modules (`src/features/*`)**:
  - `src/features/connections/**`: connection service and connection-focused core contracts.
  - `src/features/queues/**`: queue registry service and queue listing contracts.
  - `src/features/queueMessages/**`: queue-message load/move/delete/purge/open use-cases and core contracts.
  - `src/features/common/**`: cross-feature core types (for example, `Connection`, `Queue`).
- **Top-level ports (`src/ports/*`)**:
  - `src/ports/primary/**`: inbound capability interfaces consumed by commands/UI flows.
  - `src/ports/secondary/**`: outbound dependency contracts used by application services/use-cases.
- **Top-level adapters (`src/adapters/*`)**:
  - `src/adapters/primary/**`: primary-side adapter logic (tree/webview/command interaction boundaries and payload mapping).
  - `src/adapters/secondary/**`: secondary-side infrastructure adapters (Azure SDK, VS Code persistence/config/logging/telemetry).
- **Composition root (`src/extension.ts`)**: dependency wiring and VS Code command registration.

Notable current use-case boundaries:
- Queue panel message loading and pagination are handled by feature-local use cases (for example, `src/features/queueMessages/LoadQueueMessagesUseCase.ts`) behind primary ports, with UI adapters acting as transport/lifecycle boundaries.

## Runtime Composition
`src/extension.ts` is the composition root:

1. Instantiate VS Code and Azure adapters.
2. Construct domain services and application use-cases.
3. Create providers/panels that call primary port implementations.
4. Register commands and tree view interactions.

This keeps domain logic testable and independent from VS Code/Azure details.

## Dependency Guardrails
- Feature-to-feature imports are disallowed by lint policy for feature core layers (except `src/features/common/**` shared contracts).
- `application` and `ports` layers are SDK/framework-agnostic and must not import VS Code/Azure SDKs or adapter implementations.
- Port files are interface-only contracts; type aliases and type re-exports are disallowed.
- Port interface method custom parameter/return types must originate from feature modules or local port contracts.

## Data and Control Flow
Typical flow for a user action (for example, moving a message):

1. VS Code command is invoked from UI.
2. Provider/command handler collects input/context and calls a primary port (use case).
3. Use case coordinates domain services and secondary ports.
4. Adapter performs concrete I/O (Azure SDK or VS Code API).
5. Provider updates UI and surfaces success/error feedback.

Boundary safety notes:
- Treat webview-bound payloads as untrusted data; serialize safely before embedding in inline script contexts.
- Parse and validate drag/drop payload transport data through dedicated helpers before orchestration logic consumes it.
- Keep parsing/normalization helpers pure where practical, and apply mutations only at boundary layers.

## Testing Approach
- **Unit tests (`src/test/features/**/application/**`, `src/test/features/common/**`, and `src/test/adapters/**`)** validate feature behavior and adapter boundaries.
- **Extension/integration tests (`src/test/**/**/*.integration.test.ts`)** run through `vscode-test` and focus on production-mode extension smoke wiring plus connection-tree drag/drop adapter integration behavior.
- **Acceptance tests (`src/test/acceptance/**/*.acceptance.integration.test.ts`)** run user-facing command flows against a real Azure Service Bus namespace using a spec-style DSL.

Acceptance-mode runtime notes:
- `BUSDRIVER_ACCEPTANCE_MODE=1` enables hidden `busdriver.__test.*` setup commands used only by acceptance harnesses.
- Default runtime behavior remains unchanged when acceptance mode is disabled.

## Key Entry Points
- `src/extension.ts`: activation and dependency wiring.
- `src/adapters/primary/TreeConnectionsAdapter.ts`: tree interactions and command-backed actions.
- `src/adapters/primary/WebviewQueueMessagesPanelAdapter.ts`: queue message webview interactions.
