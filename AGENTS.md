**Purpose**
- A concise agent-facing guide for the BusDriver repository. Contains build/test/lint commands, how to run single tests, TypeScript/ESLint notes, and project code-style rules agents must follow.

**Repository Pointers**
- Key files:
  - `package.json:77` — scripts and test/lint/build commands.
  - `.eslintrc.json:1` — ESLint configuration and key rules.
  - `tsconfig.json:1` — TypeScript compiler options.
  - `.github/workflows/ci.yml:1` — CI steps and `xvfb-run` usage for tests.
  - `docs/architecture.md:1` — technical architecture overview (layers, composition, runtime flow).
  - `docs/adr/README.md:1` — ADR index and guidance for major design decisions.
  - `docs/product.md:1` — product overview (what BusDriver is for and its aims).
  - `docs/contributing.md:1` — contribution expectations (TDD-first workflow and quality gates).
  - `docs/plans/` — living work plans (one plan per task, updated as progress is made).
  - `src/` — main source code.
  - `src/test/` or `out/test` — test sources/compiled tests (compiled tests are placed in `out` by `compile-tests`).
- If you need details on any file referenced, open the file path above.

**Documentation-First Context Loading**
- Use progressive disclosure when gathering context:
  1. Start with `docs/product.md` for user/problem framing and product aims.
  2. Read `docs/architecture.md` for system boundaries and dependency direction.
  3. Read `docs/adr/README.md` for major architectural decision history and constraints.
  4. Read `docs/contributing.md` for process constraints and quality expectations.
  5. Only then open code files relevant to the requested change.
- Keep context minimal: load only the sections/files needed for the current task.
- When a request is ambiguous, align decisions to product aims in `docs/product.md` before implementation.
- For implementation work, explicitly follow `docs/contributing.md` gates:
  - Defects/behavior changes must start with a failing test (TDD).
  - Lint, compile/build, and tests must pass before completion.

**Documentation Update Rule (Do Not Forget)**
- Documentation updates are required as part of implementation, not optional follow-up work.
- When behavior, architecture, workflow, or contribution expectations change, update docs in the same change set.
- Minimum doc check on every non-trivial change:
  - `docs/product.md` — update if purpose, scope, or aims changed.
  - `docs/architecture.md` — update if layers, dependencies, or runtime flow changed.
  - `docs/adr/` — add/update an ADR for any major architectural decision/change.
  - `docs/contributing.md` — update if engineering process/quality gates changed.
- Before finishing, verify documentation accuracy and call out doc updates in the change summary/PR description.

**Planning Rule (Mandatory)**
- All non-trivial work must start with a written plan stored in `docs/plans/`.
- Treat plans as living documents: update the same plan file as work progresses.
- Plans must be organized as small, top-down vertical slices.
- Each slice must be independently deployable and independently testable.
- Each slice must explicitly state:
  - whether documentation updates are required
  - whether the plan must be updated during/after that slice
- Plans must include a "lessons learned" section capturing key learnings discovered during implementation.
- Plans must contain enough context that a reviewer unfamiliar with BusDriver can assess whether the design is sound.
- Minimum planning workflow:
  1. Create a new plan file in `docs/plans/` before implementation starts.
  2. Define goal, scope, architecture context, and concrete vertical slices.
  3. Update progress during execution (completed steps, blockers, decisions).
  4. Mark final status, summarize outcome, and record lessons learned before considering the task done.
- Naming guidance:
  - Use `docs/plans/YYYY-MM-DD-short-title.md` for plan files.
  - Use `docs/plans/_template.md` as the starting format.
- Do not treat planning as optional memory; if work changes direction, update the plan immediately.

**Ports & Adapters Architecture**
- BusDriver follows a hexagonal (ports and adapters) structure to keep domain logic isolated from VS Code and Azure SDK details.
- Core layers and locations:
  - `src/domain/` — domain services and models (no VS Code/Azure imports).
  - `src/ports/` — TypeScript interfaces for dependencies (`ConnectionRepository`, `QueueRegistry`, `MessageOperations`, `Logger`, `Telemetry`).
  - `src/adapters/vscode/` — VS Code adapters (e.g., `VsCodeConnectionRepository`, `VsCodeTelemetry`).
  - `src/adapters/azure/` — Azure Service Bus adapters (e.g., `AzureQueueRegistry`, `AzureMessageOperations`).
- Composition happens in `src/extension.ts` and providers/commands should depend on domain services and ports, not SDKs directly.
- Tests: use fakes/in-memory adapters in `src/test/fakes/` and adapter unit tests in `src/test/adapters/`.

**Quick Commands**
- Install dependencies
  - `npm ci` — deterministic install (CI)
  - `npm install` — developer install
- Build extension (bundling)
  - `npm run compile` — builds via `node esbuild.js`
  - `npm run package` — production bundle (`node esbuild.js --production`)
  - `npm run watch` — build in watch mode
- Tests
  - `npm run compile-tests` — `tsc -p . --outDir out`
  - `npm run watch-tests` — compile tests in watch mode
  - `npm test` — runs `vscode-test` harness (integration tests / VS Code)
- Lint
  - `npm run lint` — `eslint src --ext ts`
  - Auto-fix: `npx eslint src --ext ts --fix`
- CI packaging
  - `npx @vscode/vsce package` — produce `.vsix` for marketplace (CI uses this on `main`)

**Run A Single Test (fast, local loop)**
- Recommended flow (compile then run mocha on compiled JS)
  1. Compile tests and sources:
     - `npm run compile-tests && npm run compile`
  2. Run mocha on the compiled tests (filter by name):
     - `npx mocha "out/test/**/*.js" --grep "Your test name or regex"`
     - Example: `npx mocha "out/test/**/*.js" --grep "should add connection"`
- Alternative — TypeScript directly (requires `ts-node`):
  - `npx mocha -r ts-node/register "test/suite/extension.test.ts" --grep "pattern"`
- Notes:
  - `npm test` launches the VS Code electron test harness and is slower — use it for integration/extension tests.
  - CI uses `xvfb-run -a npm test` on Linux for headless UI tests (`.github/workflows/ci.yml:32`).

**CI Notes**
- The CI pipeline (`.github/workflows/ci.yml:1`) performs:
  - `npm ci`
  - `npm run lint`
  - `npm run compile`
  - `xvfb-run -a npm test`
  - On `main`, creates a `.vsix` with `npx @vscode/vsce package`
- Local development should aim to run the same sequence before creating PRs.

**TypeScript Configuration**
- `tsconfig.json:1` highlights:
  - `strict: true` — strong static guarantees
  - `target: ES2020`, `module: commonjs`
  - `rootDir: src`, `outDir: out`
- Agents must follow `strict` assumptions — prefer type-safe patterns.

**ESLint**
- Parser: `@typescript-eslint/parser`
- Extends: `eslint:recommended`, `plugin:@typescript-eslint/recommended`
- Notable rules in `.eslintrc.json:15`:
  - `@typescript-eslint/naming-convention` — import identifiers must be camelCase or PascalCase
  - `@typescript-eslint/semi`: warn
  - `curly`: warn
  - `eqeqeq`: warn
  - `no-throw-literal`: warn (throw Error objects, not literals)
- Run `npm run lint` frequently. Use `npx eslint --fix` carefully.

**Coding Conventions (Rules for agents)**
- Project style: TypeScript-first, explicit types, high type-safety.
- Interfaces and types
  - Avoid `I`-prefix on interfaces. Use `ConnectionOptions` rather than `IConnectionOptions`.
  - Use `interface` for shapes intended to be extended or implemented.
  - Use `type` for unions, intersections, mapped types, or complex composition.
  - Public APIs should have explicit return types.
- Naming conventions
  - `PascalCase` for classes, types, interfaces, enums — e.g., `Connection`, `QueueItem`.
  - `camelCase` for functions and variables — e.g., `getConnection`, `queueName`.
  - Avoid Hungarian notation or `I` prefixes (C#/Java-style) for interfaces.
  - Constants (module-level immutable) may be `UPPER_SNAKE_CASE` or `PascalCase` depending on project consistency; prefer minimal use of `UPPER_SNAKE_CASE`.
- Imports
  - Order: external modules → internal absolute (if applicable) → parent relative (`../`) → same-folder relative (`./`).
  - Prefer named imports; avoid `import * as ...` unless necessary.
  - Do not include file extensions in imports (no `.ts`).
  - Keep imports grouped and sorted logically; run an import-sorting tool if you add one.
- Formatting
  - Use repository defaults. Run `npm run lint` and `npx eslint --fix` as needed.
  - Prefer `const` by default, use `let` only when mutating state.
  - Keep line length reasonable (wrap near 100 chars).
  - Semicolons: follow `.eslintrc.json` (semicolons are warned).
- Avoid `any`
  - Prefer `unknown` when you really cannot type; narrow it before use.
  - If `any` is used, document the reason with a short comment.
- Error handling and throwing
  - Throw `Error` objects: `throw new Error('message')`. Do not `throw 'string'` or `throw {}`.
  - Add context when rethrowing: `throw new Error(`Failed to X: ${err?.message}`)`.
  - Use `try/catch` around async boundaries and handle expected errors gracefully.
  - User-facing errors: prefer `vscode.window.showErrorMessage('...')` while logging full details to `console.error`.
- Logging & secrets
  - Use `console.error` and `console.warn` for diagnostics.
  - NEVER log secrets (connection strings, keys). Redact sensitive values before logging.
- Comments & documentation
  - Public APIs: include JSDoc comments.
  - Keep inline comments concise and ideally explain the why, not the what, prefer readable code over the over use of comments
- File & export organization
  - One primary exported class/module per file when sensible (existing pattern: `src/models/Connection.ts`).
  - Use named exports for utilities; reserve default exports for rare single-primary-export modules.
  - Keep file names meaningful and consistent with exported type/class.

**Interface Naming Guidance (explicit)**
- Rationale
  - TypeScript uses structural typing; prefixing with `I` is unnecessary and is a C#/Java convention that adds noise.
  - `ConnectionOptions` reads naturally and expresses the role, while `IConnectionOptions` is redundant.
- Enforcement suggestion
  - Optionally add an ESLint rule with `@typescript-eslint/naming-convention` to disallow interface names starting with `I`:
    - Example rule snippet (for repo maintainers to add to `.eslintrc.json`):
      - `{\n           "selector": "interface",\n           "format": ["PascalCase"],\n           "custom": { "regex": "^I[A-Z]", "match": false }\n         }`
  - If the repo already uses `I` prefixes widely, maintain consistency until a coordinated rename is performed.

**Testing Guidelines**
- TDD requirement for new features/defects:
  - Write a test first.
  - Run it and confirm it fails.
  - Work one failing test at a time (only add the next test after the current one passes).
  - Implement the smallest change that makes the test pass; no extra behavior.
  - Refactor code/tests to improve design and keep tests green.
- Unit vs Integration
  - Unit tests: prefer running with `mocha` on compiled JS in `out/test` for speed; mock external services (Azure Service Bus).
  - Integration tests: use `npm test` (vscode-test) — these may spin up VS Code and are slower.
- Test structure
  - Use descriptive `describe`/`it` that form readable sentences.
  - Isolate tests: use setup/teardown to reset state.
  - Use `--grep` to run individual tests during development.
- Example quick-run commands
  - Compile-only: `npm run compile-tests && npm run compile`
  - Single test: `npx mocha "out/test/**/*.js" --grep "should open connection"`
  - Entire suite (CI-like): `xvfb-run -a npm test`

**CI/Headless UI Notes**
- Linux headless tests require an X server shim. CI uses:
  - `xvfb-run -a npm test` (`.github/workflows/ci.yml:32`)
- When debugging tests locally on macOS/Windows, run `npm test` and attach the debugger if needed.

**Cursor & Copilot Rules**
- Repository scan found:
  - No `.cursor/` rules in repo root.
  - No `.github/copilot-instructions.md` present.
- Consequence:
  - Agents should not assume repo-level Cursor or Copilot constraints. If you want special LLM guidance, add `.github/copilot-instructions.md` or `.cursor/rules/` and I'll integrate it.

**Pre-edit Checklist for Agents**
- Before making changes:
  - `npm ci`
  - `npm run lint` and fix issues (or run `npx eslint --fix`)
  - `npm run compile` and `npm run compile-tests`
- Before pushing:
  - Run focused tests for changed modules: `npx mocha "out/test/**/*.js" --grep "pattern"`
  - Check that no secrets were introduced
  - Ensure naming conventions and interface rules (no `I` prefix) are followed
  - Keep changes minimal and targeted to the task
- Commit / PR conventions:
  - Small, descriptive commits (1-2 sentence summary)
  - Do not force-push or amend commits on protected branches

**When to Call for Human Review**
- Changes that affect UX or extension activation behavior.
- Any change that modifies how secrets are stored or retrieved.
- Large renames (e.g., bulk interface renames) — coordinate with maintainers.
- Adding new dependencies (use `npm ci` and consider security impact).

**If you want me to write this file**
- This file has been created at the repository root as requested.
- Optional post-write actions: run lint/compile/tests, or create a commit/PR (request explicitly).

End of file
