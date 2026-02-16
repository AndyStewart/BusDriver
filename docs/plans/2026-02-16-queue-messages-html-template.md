# Plan: Queue Messages HTML Template Extraction

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Move queue messages webview markup out of TypeScript into a standalone HTML template file while preserving existing behavior and external JS/CSS asset loading.

## Background and Context
`QueueMessagesPanel` currently builds HTML in a TypeScript template string. CSS and JS were already extracted to `media/` assets. The next maintainability step is to keep markup in a dedicated template file and let provider code populate safe dynamic placeholders.

## Scope
- In scope:
- Add `media/queueMessagesPanel.html`.
- Update provider code to load and populate the template at runtime.
- Keep existing webview behavior, commands, pagination, and details rendering.
- Update tests to assert template-backed markup.
- Out of scope:
- Bundling/build-pipeline changes for webview assets.
- Visual redesign and behavior changes.

## Design Summary
Use a tokenized HTML template with placeholders for dynamic values (queue title, message count, rendered table, initial JSON data, stylesheet URI, script URI). `QueueMessagesPanel` reads the template from `extensionUri/media` and performs deterministic token replacement. Dynamic JSON remains safely serialized with existing serializer utilities.

## Vertical Slices (Top-Down)

### Slice 1: Add Failing Coverage For Template Marker
- Objective: Introduce a test expectation that verifies template-based markup presence.
- Changes:
- Extend integration test to assert a dedicated template marker attribute in generated HTML.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- New assertion fails before implementation.

### Slice 2: Implement HTML Template Loading and Token Replacement
- Objective: Replace TS inline markup composition with file-backed template population.
- Changes:
- Add `media/queueMessagesPanel.html` with placeholders.
- Update `QueueMessagesPanel` to load/replace placeholders and emit final HTML.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Webview renders and behaves as before.
- Template marker appears in generated HTML.

### Slice 3: Validate, Document, and Close
- Objective: Run quality gates and close this plan.
- Changes:
- Run lint, compile, compile-tests, unit tests, integration tests.
- Update plan with outcomes and lessons learned.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Required gates pass.
- Plan status and validation checklist completed.

## Progress Log
- 2026-02-16 21:35 - Created plan and started implementation.
- 2026-02-16 21:36 - Added failing integration assertion for template marker (`data-view=\"queue-messages-panel\"`).
- 2026-02-16 21:36 - Added `media/queueMessagesPanel.html` and updated provider to load and populate the template.
- 2026-02-16 21:36 - Ran lint/compile/compile-tests/unit/integration; all passing.

## Decisions and Notes
- Template file extension will be `.html` (standard for VS Code webview composition); `.jhtml` is not a project/runtime convention.
- Reviewed `docs/product.md`, `docs/architecture.md`, `docs/adr/README.md`, and `docs/contributing.md`; no updates were required for this refactor-only change.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Outcome
Queue messages webview markup now lives in `media/queueMessagesPanel.html` and is populated by `QueueMessagesPanel` using deterministic token replacement. CSS and JS remain external assets in `media/`, and initial data injection remains safely serialized in a non-executable JSON script tag.

## Lessons Learned
- `String.prototype.replaceAll` is not available under this project’s TypeScript target, so template token replacement should use target-compatible approaches (for example, `split(...).join(...)`).
