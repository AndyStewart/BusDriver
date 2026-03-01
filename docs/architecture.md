# BusDriver Architecture

## Overview
BusDriver is a VS Code extension for managing Azure Service Bus connections and queue messages from an Activity Bar view. The extension composes domain services with infrastructure adapters at activation time.

## Architectural Style
The project follows a ports-and-adapters (hexagonal) architecture:

- **Feature modules (`src/features/*`)**: each feature is organized as a vertical slice with local `application`, `ports`, and `adapters` folders.
  - `src/features/connections/**`: connection management and tree interactions.
  - `src/features/queues/**`: queue discovery and queue registry orchestration.
  - `src/features/queueMessages/**`: queue-message load/move/delete/purge behavior and panel UI.
- **Shared cross-feature code (`src/shared/*`)**:
  - `src/shared/adapters/**`: shared adapter implementations (for example, logging, telemetry, Azure client pooling).
  - `src/shared/ports/**`: shared outbound contracts and cross-feature contracts (for example, shared connection lookup/types).
- **Composition root (`src/extension.ts`)**: dependency wiring and VS Code command registration.

Notable current use-case boundaries:
- Queue panel message loading and pagination are handled by feature-local application use cases (for example, `src/features/queueMessages/application/LoadQueueMessagesUseCase.ts`) behind primary ports, with UI adapters acting as transport/lifecycle boundaries.

## Runtime Composition
`src/extension.ts` is the composition root:

1. Instantiate VS Code and Azure adapters.
2. Construct domain services and application use-cases.
3. Create providers/panels that call primary port implementations.
4. Register commands and tree view interactions.

This keeps domain logic testable and independent from VS Code/Azure details.

## Dependency Guardrails
- Feature-to-feature imports are disallowed by lint policy. Shared contracts must be extracted to `src/shared/**`.
- `application` and `ports` layers are SDK/framework-agnostic and must not import VS Code/Azure SDKs or adapter implementations.
- Existing legacy cross-feature adapter coupling is being migrated in phases with explicit lint carve-outs.

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
- **Unit tests (`src/test/features/**/{application,adapters}` and `src/test/shared/**`)** validate feature behavior and shared boundaries.
- **Extension/integration tests (`src/test/**/**/*.integration.test.ts`)** run through `vscode-test` and focus on production-mode extension smoke wiring plus connection-tree drag/drop adapter integration behavior.
- **Acceptance tests (`src/test/acceptance/**/*.acceptance.integration.test.ts`)** run user-facing command flows against a real Azure Service Bus namespace using a spec-style DSL.

Acceptance-mode runtime notes:
- `BUSDRIVER_ACCEPTANCE_MODE=1` enables hidden `busdriver.__test.*` setup commands used only by acceptance harnesses.
- Default runtime behavior remains unchanged when acceptance mode is disabled.

## Key Entry Points
- `src/extension.ts`: activation and dependency wiring.
- `src/features/connections/adapters/TreeConnectionsAdapter.ts`: tree interactions and command-backed actions.
- `src/features/queueMessages/adapters/WebviewQueueMessagesPanelAdapter.ts`: queue message webview interactions.
