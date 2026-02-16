# Plan: Queue Messages Remove Inline Handlers

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Remove inline `onclick` handlers from the queue messages webview template and bind UI actions via JavaScript event listeners.

## Background and Context
`media/queueMessagesPanel.html` currently contains inline event handler attributes for buttons and tabs. Moving event wiring to `media/queueMessagesPanel.js` keeps HTML structural and behavior centralized in JavaScript.

## Scope
- In scope:
- Remove inline `onclick` from queue messages template.
- Add JS-based binding for button and tab actions.
- Keep existing behavior unchanged.
- Update tests accordingly.
- Out of scope:
- CSP hardening and nonce rollout.
- UI redesign.

## Design Summary
Replace inline handlers with semantic attributes (`data-action`, `data-tab`) and attach listeners in JS during startup. Keep existing command posting and tab-switch logic intact.

## Vertical Slices (Top-Down)

### Slice 1: Add Failing Assertion
- Objective: Add test coverage requiring no inline click handlers.
- Changes:
- Extend integration assertion to fail when `onclick=` appears.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Integration test fails before implementation.

### Slice 2: Remove Inline Handlers And Bind In JS
- Objective: Move UI action wiring into `queueMessagesPanel.js`.
- Changes:
- Update template attributes and JS startup event listeners.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Buttons and tabs still function.
- Generated HTML contains no inline click handlers.

### Slice 3: Validate And Close
- Objective: Run full checks and close plan.
- Changes:
- Run lint/compile/compile-tests/unit/integration.
- Update plan outcomes and lessons learned.
- Independent deployability: Yes
- Independent testability: Yes
- Documentation updates required? (Yes/No): No
- Plan update required for this slice? (Yes/No): Yes
- Acceptance checks:
- Required quality gates pass.

## Progress Log
- 2026-02-16 21:39 - Created plan and started implementation.
- 2026-02-16 21:39 - Added failing integration assertion requiring no `onclick=` in generated HTML.
- 2026-02-16 21:39 - Replaced inline handlers in template with `data-action` / `data-tab` attributes.
- 2026-02-16 21:40 - Added JS listener binding for actions and tabs, removed global function exports.
- 2026-02-16 21:40 - Ran lint/compile/compile-tests/unit/integration; all passing.

## Decisions and Notes
- Use semantic `data-*` attributes to keep template readable and avoid coupling to global functions.
- Reviewed `docs/product.md`, `docs/architecture.md`, `docs/adr/README.md`, and `docs/contributing.md`; no updates were required for this refactor.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Outcome
Queue messages webview markup no longer includes inline click handlers. Actions and tab switching are now bound in `media/queueMessagesPanel.js` using semantic `data-*` attributes from `media/queueMessagesPanel.html`, preserving existing behavior while keeping HTML purely structural.

## Lessons Learned
- Removing inline handlers also lets us remove unnecessary `window.*` global exports from the webview script and keeps behavior wiring localized.
