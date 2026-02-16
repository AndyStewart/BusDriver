# BusDriver Architecture

## Overview
BusDriver is a VS Code extension for managing Azure Service Bus connections and queue messages from an Activity Bar view. The extension composes domain services with infrastructure adapters at activation time.

## Architectural Style
The project follows a ports-and-adapters (hexagonal) architecture:

- **Domain (`src/domain`)**: business logic for connections, queue discovery, message send/move/delete, and message-grid preferences.
- **Ports (`src/ports`)**: TypeScript interfaces that define dependencies the domain needs (repositories, queue registry, message operations, logging, telemetry).
- **Adapters (`src/adapters`)**:
  - `azure/`: implementations backed by Azure Service Bus SDK.
  - `vscode/`: implementations backed by VS Code APIs (secrets/config/logging/telemetry).
- **UI/Orchestration (`src/providers`, `src/models`, `src/extension.ts`)**: tree view provider, webview panel, command registration, and dependency wiring.

## Runtime Composition
`src/extension.ts` is the composition root:

1. Instantiate VS Code and Azure adapters.
2. Construct domain services using port interfaces.
3. Create providers/panels that call domain services.
4. Register commands and tree view interactions.

This keeps domain logic testable and independent from VS Code/Azure details.

## Data and Control Flow
Typical flow for a user action (for example, moving a message):

1. VS Code command is invoked from UI.
2. Provider collects input/context and calls a domain service.
3. Domain service executes logic through a port interface.
4. Adapter performs concrete I/O (Azure SDK or VS Code API).
5. Provider updates UI and surfaces success/error feedback.

## Testing Approach
- **Unit tests (`src/test/domain`)** validate domain behavior with fakes.
- **Adapter tests (`src/test/adapters`)** validate integration boundaries.
- **Extension/integration tests (`src/test/suite`)** run through `vscode-test`.

## Key Entry Points
- `src/extension.ts`: activation and dependency wiring.
- `src/providers/ConnectionsProvider.ts`: tree interactions and command-backed actions.
- `src/providers/QueueMessagesPanel.ts`: queue message webview interactions.
