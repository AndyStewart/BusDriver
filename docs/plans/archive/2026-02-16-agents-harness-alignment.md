# Plan: AGENTS Harness Alignment

- Date: 2026-02-16
- Owner: Codex
- Status: Completed

## Goal
Refactor `AGENTS.md` so it remains concise, accurate, and enforceable for agent workflows, aligned with harness-engineering principles (clarity, constraints, and low entropy).

## Background and Context
`AGENTS.md` currently captures many useful rules but is long and partially stale relative to current scripts/CI behavior. This creates ambiguity and instruction drift, which reduces reliability for human and agent contributors.

## Scope
- In scope:
  - Review `AGENTS.md` for stale or conflicting guidance.
  - Restructure content for high signal and easier agent parsing.
  - Update command and CI references to match current repository state.
  - Add explicit "hard constraints" and "definition of done" checks.
- Out of scope:
  - Production code behavior changes.
  - CI pipeline implementation changes beyond documentation.

## Design Summary
Keep the document as a short, rule-first contract: core invariants, mandatory workflow, authoritative commands, and explicit completion criteria. Remove stale statements, reduce redundancy, and preserve pointers to deeper docs for context.

## Vertical Slices (Top-Down)

### Slice 1: Gap Analysis and Drift Identification
- Objective:
  - Identify stale, conflicting, or low-signal sections in `AGENTS.md`.
- Changes:
  - Compare `AGENTS.md` guidance with `package.json`, `.github/workflows/ci.yml`, and docs.
- Independent deployability:
  - Yes. Analysis can ship as plan updates only.
- Independent testability:
  - Yes. Findings can be reviewed against source files.
- Documentation updates required? (Yes/No):
  - Yes (plan progress updates).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Drift list recorded with file references.

### Slice 2: Rewrite AGENTS.md for Enforceability
- Objective:
  - Produce a concise, agent-legible, high-confidence guide.
- Changes:
  - Reorganize sections around hard constraints, workflow steps, and exact commands.
  - Remove stale references and duplicated guidance.
  - Add explicit completion checklist.
- Independent deployability:
  - Yes. Pure documentation improvement.
- Independent testability:
  - Yes. Verify consistency with repo scripts/config.
- Documentation updates required? (Yes/No):
  - Yes (`AGENTS.md`, plan progress updates).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - `AGENTS.md` matches current scripts and CI behavior.
  - Document remains concise and actionable.

### Slice 3: Validate and Close Out
- Objective:
  - Validate changed documentation for consistency and close plan with lessons.
- Changes:
  - Run lint/compile/unit tests as standard safety checks.
  - Update plan status, validation checklist, and lessons learned.
- Independent deployability:
  - Yes.
- Independent testability:
  - Yes.
- Documentation updates required? (Yes/No):
  - Yes (plan closeout).
- Plan update required for this slice? (Yes/No):
  - Yes.
- Acceptance checks:
  - Validation checklist updated.
  - Plan marked completed with outcome and lessons.

## Progress Log
- 2026-02-16 20:00 - Created plan.
- 2026-02-16 20:03 - Completed Slice 1 gap analysis: identified stale test/CI commands and excessive duplication in `AGENTS.md`.
- 2026-02-16 20:07 - Completed Slice 2: rewrote `AGENTS.md` into a concise contract with updated command/CI truth and explicit definition-of-done checks.
- 2026-02-16 20:09 - Completed Slice 3: ran validation commands and closed out plan.

## Decisions and Notes
- Keep `AGENTS.md` as a practical contract rather than a full handbook.
- Prefer linking to authoritative docs for details instead of duplicating long explanations.

## Validation
- [x] Lint passes
- [x] Build/compile passes
- [x] Tests pass
- [x] Docs updated (`docs/product.md`, `docs/architecture.md`, `docs/adr/`, `docs/contributing.md` as applicable)
- [x] Each completed slice is independently deployable and testable
- [x] Per-slice documentation and plan-maintenance fields were reviewed and applied

## Lessons Learned
- Agent instructions are more reliable when they prioritize hard constraints and command truth over detailed prose.
- Duplicated procedural details drift quickly; linking to authoritative files preserves correctness with less maintenance.
- A short definition-of-done checklist in `AGENTS.md` materially improves execution consistency for both human and agent contributors.

## Outcome
Completed. `AGENTS.md` was refactored into a concise, enforceable guide aligned with harness-engineering principles, and validated with lint/compile/unit test checks.
