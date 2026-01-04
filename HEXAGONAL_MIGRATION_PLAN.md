# Hexagonal Architecture Migration Plan

This document outlines the concrete steps required to migrate BusDriver from the current VS Code/UI-centric structure (see `ARCHITECTURE_NOTES.md`) to the proposed hexagonal (ports and adapters) architecture. The migration favors incremental, shippable slices so the extension stays functional after every pull request.

## 0. Guiding Objectives
- **Maintain shipping cadence:** keep `npm run compile`, `npm run compile-tests`, and `npm test` green at each checkpoint.
- **Codify seams:** each step should increase the surface area covered by domain-level services and decrease direct Azure/VS Code dependencies inside `src/providers`.
- **Improve testability:** every new service must ship with fast unit tests (run via `npx mocha "out/test/**/*.js" --grep "<pattern>"`) exercising behavior through in-memory adapters.
- **Avoid breaking users:** preserve command IDs/activation events declared in `package.json` while refactoring internals.
- **No dead abstractions:** each phase must wire new ports/services into production code immediately; no parallel/unused paths.

## 1. Folder & Naming Baseline
- Create `src/domain/` for domain services/models and `src/ports/` for TypeScript interfaces that describe dependencies (`ConnectionRepository`, `QueueRegistry`, etc.).
- Add `src/adapters/vscode/` for VS Code-specific implementations and `src/adapters/azure/` for Service Bus gateways.
- Update `tsconfig.json` `rootDir` (currently `src`) and ESLint import paths if needed so new folders build cleanly.

## 2. Phase One — Define Core Ports
**Goal:** Introduce pure TypeScript interfaces with no VS Code imports.

Tasks:
1. Create the following ports under `src/ports/`: `ConnectionRepository`, `QueueRegistry`, `MessageOperations`, optional `Telemetry`/`Logger`.
2. Document each interface with responsibilities, failure contracts, and async signatures.
3. Provide VS Code adapters (e.g., `VsCodeConnectionRepository`) that implement the interfaces while delegating to `ExtensionContext`.
4. Provide Azure adapters (`AzureQueueRegistry`, `AzureMessageOperations`) that implement the Azure-facing ports and wire them into production code immediately.
5. Ensure existing `ConnectionsProvider` uses these adapters internally without yet extracting logic—this keeps behavior identical while allowing subsequent services to rely on the ports.
6. Add unit tests validating adapters pass through values (use fakes for VS Code contexts).
7. Remove any direct `ExtensionContext` usage from `ConnectionsProvider` once adapters are wired so the ports are the only path.

Status:
- Completed. Implemented ports and adapters under `src/ports/`, `src/adapters/vscode/`, and `src/adapters/azure/`.
- Wired `ConnectionsProvider` to use ports for connections, queue listing, and message operations.
- Added adapter tests under `src/test/adapters/` and a fast unit runner `npm run test:unit`.

## 3. Phase Two — Connection Persistence Service
**Goal:** Move credential + metadata handling out of `ConnectionsProvider`.

Tasks:
1. Create `src/domain/connections/ConnectionService.ts` encapsulating add/update/delete/list behavior. It depends only on `ConnectionRepository`.
2. Move `Connection` model definitions into `src/domain/models` (single entity including `connectionString`).
3. Update command handlers (`extension.ts`) and `ConnectionsProvider` to call the service rather than mutating state directly.
4. Add deterministic unit tests for the service using in-memory adapters to simulate secrets/global state.
5. Keep integration tests verifying tree behavior to ensure VS Code UI remains intact.
6. Remove any remaining direct calls to the connection adapter in providers/commands so the service is the only access path.

Status:
- Completed. Added `ConnectionService` with domain-level validation and Result-style errors.
- Moved `Connection` into `src/domain/models` and split `ConnectionTreeItem` into a UI-only model.
- Wired `ConnectionsProvider`/`extension.ts` through the service; removed direct repository access.
- Added unit tests for the service with an in-memory repository.

## 4. Phase Three — Service Bus Access Layer
**Goal:** Centralize Service Bus access behind ports/adapters, keeping adapters simple for now.

Tasks:
1. Keep distinct adapters for `QueueRegistry` and `MessageOperations` without a shared gateway or cache.
2. Refactor `ConnectionsProvider` to use the adapters/services instead of instantiating SDK clients inline. This ensures only adapters touch `@azure/service-bus`.
3. Extract queue-listing logic into `src/domain/queues/QueueRegistryService.ts` (depends on `QueueRegistry` and the connection store).
4. Ensure commands that refresh queues invoke the registry service, returning POJOs that the provider adapts into `TreeItem`s.
5. Add unit tests for `QueueRegistry` covering empty states, errors, and pagination behavior (simulated via fake queue ports).
6. Delete or refactor any remaining direct `@azure/service-bus` usage outside adapters; add a quick scan or lint check if helpful.

Status:
- Completed with separate `QueueRegistry`/`MessageOperations` adapters and a `QueueRegistryService`.
- Deferred: shared gateway/cache (revisit if performance or connection reuse becomes an issue).

## 5. Phase Four — Message Operations
**Goal:** Decouple message-moving/deleting/sending from VS Code concerns.

Tasks:
1. Create domain services: `MessageMover`, `MessageDeleter`, `MessageSender`, each depending on `MessageOperations`.
2. Keep all confirmation/notification logic in the command handlers (VS Code layer); services return results/intents only and never call VS Code APIs directly.
3. Update existing commands (send/move/delete) to call the domain services and translate results into UI feedback with `vscode.window` in the command layer.
4. Add failure-mode unit tests verifying retries, partial failures, and validation.
5. Remove any legacy command paths that still use direct SDK calls or VS Code prompts.

## 6. Phase Five — Queue Messages Webview
**Goal:** Split `QueueMessagesPanel` into controller + renderer.

Tasks:
1. Create `QueueMessagesController` under `src/domain/messages/` that coordinates message retrieval via `QueueRegistry`/`MessageGatewayPort` and emits serializable view models.
2. Build a `QueueMessagesWebviewAdapter` (driving adapter) responsible only for wiring VS Code webview lifecycle events to/from the controller.
3. Extract the HTML/JS to static files bundled by `esbuild` (hook via `npm run compile` to include new assets).
4. Validate that drag-and-drop operations now call domain services and never mutate static globals.
5. Create unit tests for the controller plus integration tests for the adapter/webview handshake (can run under `npm test`).
6. Delete the static globals after the controller is wired so there is a single live execution path.

## 7. Phase Six — Command Wiring & Tree Provider Simplification
**Goal:** Reduce `ConnectionsProvider` to UI concerns.

Tasks:
1. Introduce lightweight application services (or a manual `AppContainer`) in `extension.ts` that wire ports/adapters/services together.
2. Update tree provider to accept the domain services via constructor injection, delegating each command to the corresponding service.
3. Ensure `activate` registers commands referencing these injected services instead of the provider’s monolithic methods.
4. Add regression tests ensuring command registration and activation still work.

## 8. Testing & Tooling Enhancements
- Augment `npm run compile-tests` to include new domain test suites and ensure `tsconfig.json` references `src/domain` paths.
- Add mocks/fakes under `test/fakes/` representing each port; reuse them across suites.
- Expand CI (`.github/workflows/ci.yml`) to surface unit test results separately if desired (e.g., `npm run test:unit` before VS Code integration tests).

## 9. Risk Mitigation & Rollout
- **Incremental PRs:** Each phase can be split into multiple PRs (ports, services, adapter wiring) so reviews remain manageable.
- **Feature flags:** For risky refactors, introduce temporary toggles (environment-based) to fall back to legacy behaviors if regressions appear.
- **Telemetry/logging:** Leverage `TelemetryPort`/`LoggerPort` early to monitor errors introduced during migration.
- **Documentation:** Update `README.md`/`ARCHITECTURE_NOTES.md` after each milestone so future contributors understand the new layout.

Following this plan will gradually converge BusDriver on a clean hexagonal topology, enabling richer unit tests, easier Azure mocking, and clearer separation between domain behavior and VS Code plumbing.
