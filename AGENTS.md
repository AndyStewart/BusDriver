**Purpose**
- A concise agent-facing guide for the BusDriver repository. Contains build/test/lint commands, how to run single tests, TypeScript/ESLint notes, and project code-style rules agents must follow.

**Repository Pointers**
- Key files:
  - `package.json:77` — scripts and test/lint/build commands.
  - `.eslintrc.json:1` — ESLint configuration and key rules.
  - `tsconfig.json:1` — TypeScript compiler options.
  - `.github/workflows/ci.yml:1` — CI steps and `xvfb-run` usage for tests.
  - `src/` — main source code.
  - `test/` or `out/test` — test sources/compiled tests (compiled tests are placed in `out` by `compile-tests`).
- If you need details on any file referenced, open the file path above.

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
  - Keep inline comments concise and ideally explain the why, not the what.
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
