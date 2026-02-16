# Plan: Minimize QueueMessagesPanel Provider Templating

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Reduce templating in `src/providers/QueueMessagesPanel.ts` so webview structure/rendering is handled primarily by HTML/JS assets.

## Background and Context
`QueueMessagesPanel` still templates queue title, count, and message table markup in TypeScript. This couples view rendering to provider code. The webview script can render initial table and metadata from serialized initial data.

## Scope
- In scope:
- Move initial table rendering to `media/queueMessagesPanel.js`.
- Reduce provider template replacement to URI/data injection only.
- Remove no-longer-needed HTML string builders in provider.
- Keep behavior unchanged.
- Out of scope:
- Broader CSP/nonces or framework migration.

## Design Summary
Pass `queueName`, `headers`, `rows`, `messages`, and `pageSize` in the initial JSON payload. Render the header title/count and initial table in JS with DOM APIs. Keep HTML template mostly static with IDs/placeholders.

## Vertical Slices (Top-Down)

### Slice 1: Add Failing Coverage For Reduced Provider Templating
- Objective: Add assertion that provider HTML no longer contains pre-rendered queue title text.
- Changes:
- Extend integration test to assert static title marker and no server-rendered queue title interpolation.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Test fails before implementation.

### Slice 2: Shift Initial Render To Webview JS
- Objective: Move initial table and header metadata render into JS.
- Changes:
- Update HTML template IDs/placeholders.
- Update JS to render table/no-messages state from initial payload.
- Simplify provider replacement map and remove table HTML helpers.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Existing interactions still work.
- Provider no longer emits table HTML strings.

### Slice 3: Validate And Close
- Objective: Run checks and close plan.
- Changes:
- Run lint/compile/compile-tests/unit/integration.
- Update plan with validation and lessons.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- All required gates pass.

## Progress Log
- 2026-02-16 21:41 - Created plan and started implementation.
- 2026-02-16 21:42 - Added failing integration assertion for static title element and no server-rendered queue title interpolation.
- 2026-02-16 21:42 - Moved initial queue title/count/table render to `media/queueMessagesPanel.js`.
- 2026-02-16 21:43 - Simplified provider replacement map and removed provider-side table/escape templating helpers.
- 2026-02-16 21:43 - Ran lint/compile/compile-tests/unit/integration; all passing.

## Decisions and Notes
- Prefer DOM API rendering in JS for safety and reduced provider string templating.
- Reviewed `docs/product.md`, `docs/architecture.md`, `docs/adr/README.md`, and `docs/contributing.md`; no updates were required for this refactor.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Outcome
`QueueMessagesPanel` now performs minimal templating (asset URIs + serialized initial data only). Initial header and grid rendering have been moved to webview JS (`media/queueMessagesPanel.js`), and provider-side HTML table/string escaping helpers were removed.

## Lessons Learned
- Shifting initial rendering into JS meaningfully reduces provider complexity while preserving behavior when data is passed through a single serialized payload.
