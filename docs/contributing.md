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
- Keep port taxonomy explicit: inbound use-case interfaces belong in `src/ports/primary/**`, and outbound dependency interfaces belong in `src/ports/secondary/**`.
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
- provider-level UI orchestration and command handlers (`src/providers/**`)
- adapter behavior that affects VS Code or Azure runtime interactions (`src/adapters/**`)
- changes to test/build wiring that affects extension runtime behavior (`package.json`, `tsconfig.json`, `esbuild.js`)

Integration tests are usually not required for:
- documentation-only changes
- isolated refactors that do not alter integration-relevant behavior

When unsure, prefer adding or running the integration test.

## Quality Gates (Must Pass)
Before opening or merging a PR, all of the following must pass:
- lint
- build/compile
- required tests for the change (unit tests always; integration tests when integration-relevant code changed)

Suggested local sequence:
```bash
npm run lint
npm run compile
npm run test:unit
npm run test:integration
```

If your change is not integration-relevant, `npm run test:unit` is the minimum required test run.

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
