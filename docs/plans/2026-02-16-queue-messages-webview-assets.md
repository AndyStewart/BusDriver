# Plan: Queue Messages Webview Asset Extraction

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Extract inline CSS and JavaScript from `QueueMessagesPanel` into separate static webview asset files while preserving existing behavior and interactions.

## Background and Context
`src/providers/QueueMessagesPanel.ts` currently embeds a large HTML template with inline `<style>` and `<script>`. This makes maintenance harder and obscures behavior boundaries between markup, styles, and client-side logic. The extension webview can load local assets via `asWebviewUri`, which allows us to keep HTML composition in TypeScript while moving CSS/JS to dedicated files.

## Scope
- In scope:
- Create dedicated CSS and JS assets for the queue messages webview.
- Update `QueueMessagesPanel` to reference those assets.
- Preserve existing data flow from extension host to webview script.
- Add/update tests for the new structure.
- Update documentation if architectural/process docs are affected.
- Out of scope:
- Rebuilding the webview as a bundled frontend app.
- Major UI redesign or behavior changes.

## Design Summary
Use a minimal split approach:
- Keep HTML template generation in `QueueMessagesPanel.ts`.
- Add static files under `media/` for CSS and JS.
- Compute webview-safe URIs with `webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...))`.
- Pass dynamic data via a safely serialized inline JSON payload and consume it from external JS.
This minimizes risk and keeps packaging straightforward for both development and production extension runs.

## Vertical Slices (Top-Down)

### Slice 1: Add Webview Static Assets
- Objective: Introduce standalone CSS and JS files for queue messages panel UI logic.
- Changes:
- Add `media/queueMessagesPanel.css` and `media/queueMessagesPanel.js`.
- Move existing style and script logic from inline template into those files.
- Independent deployability: Yes (assets can ship with existing panel host code once wired).
- Independent testability: Yes (validate webview HTML references and runtime integration tests).
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Asset files exist and contain migrated logic.
- No secret/logging regressions.

### Slice 2: Wire QueueMessagesPanel To External Assets
- Objective: Replace inline style/script with linked assets while preserving behavior.
- Changes:
- Update `src/providers/QueueMessagesPanel.ts` to build webview URIs and emit `<link>`/`<script src>`.
- Keep safe serialization for dynamic message data.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Panel renders and supports selection, drag/drop, delete/move, and pagination.

### Slice 3: Validate And Close Out
- Objective: Confirm quality gates and close plan.
- Changes:
- Add/update tests for new HTML structure.
- Run lint/compile/compile-tests/unit tests.
- Update this plan with outcomes and lessons learned.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Required quality gates pass.
- Plan status marked completed.

## Progress Log
- 2026-02-16 21:03 - Created plan and started implementation.
- 2026-02-16 21:04 - Added `media/queueMessagesPanel.css` and `media/queueMessagesPanel.js`.
- 2026-02-16 21:06 - Updated `QueueMessagesPanel` to link external assets and inline only serialized initial JSON data.
- 2026-02-16 21:08 - Added integration assertion for external asset links and validated quality gates.

## Decisions and Notes
- Prefer `media/` for static webview assets to avoid TypeScript compile-copy concerns for non-TS files.
- Keep HTML template in provider as requested (minimal split) and avoid introducing bundling/CSP changes in this slice.
- Reviewed `docs/product.md`, `docs/architecture.md`, `docs/adr/README.md`, and `docs/contributing.md`; no content changes were required for this refactor-only slice.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Outcome
Queue messages webview styles and script were extracted to standalone assets under `media/` and wired through `asWebviewUri` from `QueueMessagesPanel`. The panel now keeps HTML template composition in TypeScript but removes large inline style/script blocks, while still using safe serialization for initial data embedded in a non-executable JSON script element. Integration coverage was updated to assert the new external asset structure.

## Lessons Learned
- For VS Code webview tests, panel HTML can be stale immediately after construction because initial `_update()` is async and not awaited by `createOrShow`; tests should call `refreshView()` before asserting rendered HTML.
