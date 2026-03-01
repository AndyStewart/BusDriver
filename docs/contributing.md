# Contributing to BusDriver

## Project Overview
BusDriver is a VS Code extension for managing Azure Service Bus connections and queue messages from inside the editor.

## Product Purpose and Aims
BusDriver exists to reduce context switching during development and troubleshooting.

Core aims:
- keep common Service Bus operations inside VS Code
- speed up debugging and issue resolution
- provide safe, reliable message operations
- maintain a clean, testable architecture that can evolve

## Contribution Principles
- Keep changes small, focused, and easy to review.
- Follow the existing ports-and-adapters architecture.
- Keep port contracts explicit inside each feature under `src/features/**/ports/**`.
- Never log secrets (connection strings, keys, tokens).
- Prefer pure functions for parsing, normalization, and serialization logic.
- Keep side effects at boundaries (providers, adapters, composition root).

## Mandatory TDD Rule
For **all defects and new behavior changes**:
1. Write or update a test first.
2. Run it and confirm it fails for the right reason.
3. Implement the smallest code change to make it pass.
4. Refactor while keeping tests green.

No production fix should be merged without a corresponding test.

## Integration Test Requirement
Integration tests are required for PRs that introduce new code or modify integration-relevant behavior.

Integration-relevant changes typically include:
- command registration, activation, or extension wiring (`src/extension.ts`)
- drag/drop adapter behavior in the connections tree (`src/features/connections/adapters/**`)
- changes to test/build wiring that affects extension runtime behavior (`package.json`, `tsconfig.json`, `esbuild.js`)

Integration tests are usually not required for:
- documentation-only changes
- isolated refactors that do not alter integration-relevant behavior

When unsure, prefer adding or running the integration test.

Current integration suite focus:
- production-mode extension smoke checks (activation, command registration, command guards, deactivation safety)
- connection-tree drag/drop adapter integration paths

## Quality Gates (Must Pass)
Before opening or merging a PR, all of the following must pass:
- lint
- build/compile
- `npm run test:unit`
- `npm run test:acceptance`
- `npm run test:integration` when integration-relevant code changed

Lint policy note:
- Type-aware TypeScript ESLint rules are enforced as errors in this repository; warning-free lint output is expected.
- Core JavaScript/TypeScript safety and style rules are also enforced as errors; lint output should contain no warnings.
- Architecture boundary rules are enforced in ESLint:
  - no feature-to-feature imports in `application` and `ports` layers
  - `application` and `ports` must not depend on VS Code/Azure SDKs or adapter implementations
  - adapter layers must not import from other feature slices; use `src/shared/**` contracts and composition-root wiring
  - feature port files are interface-only contracts; `type` aliases/re-exports are not allowed
- Safety guardrails are lint-enforced:
  - console usage is restricted to explicit boundary files (logger/composition/test paths)
  - webview inline script payloads must use safe serialization helpers

Suggested local sequence:
```bash
npm run lint
npm run compile
npm run test:unit
npm run test:integration
npm run test:acceptance
```

If your change is not integration-relevant, `npm run test:unit` and `npm run test:acceptance` are the minimum required test run.

## Acceptance Tests (Azure Service Bus Namespace Required)
Acceptance tests validate exposed user-facing command flows against a real Service Bus backend and are written as specification-style scenarios under `src/test/acceptance/**`.

Current acceptance suite focus:
- user-visible command flows (open, move, delete, purge, connection management, column configuration)
- queue messages panel lifecycle and queue-switch behavior

Technical UI-contract checks (for example, webview HTML template structure/safety) belong in lower-level tests, preferably unit tests.

Local command:
```bash
npm run test:acceptance
```

Required environment variable:
`BUSDRIVER_ACCEPTANCE_SERVICEBUS_CONNECTION_STRING=Endpoint=sb://<your-namespace>.servicebus.windows.net/;SharedAccessKeyName=<name>;SharedAccessKey=<key>`

Acceptance runs fail fast when:
- the variable is missing
- the connection string points to localhost
- the connection string contains `UseDevelopmentEmulator=true`

CI command:
```bash
npm run test:acceptance:ci
```

## Coverage Visibility (Non-Gating)
Coverage reporting is enabled for visibility and review prioritization, not as a merge gate.

- CI publishes a unit coverage summary and uploads coverage artifacts.
- Coverage percentage does not fail CI by itself.
- Test failures still fail CI.

Local command:
```bash
npm run test:unit:coverage
```

## Pull Request Expectations
- Explain the problem and the approach in 1-3 short paragraphs.
- Link issue(s) when available.
- Include test coverage for the change.
- Keep unrelated refactors out of defect-fix PRs.

## ADR Requirement for Major Architecture Changes
- If a PR introduces a major architectural change, add or update an ADR in `docs/adr/`.
- Include the ADR ID/title in the PR description so reviewers can validate rationale and tradeoffs.
