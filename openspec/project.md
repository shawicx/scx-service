# OpenSpec Project

This repository contains proposals and specs for changes to the scx-service project. It is the central place to manage spec-driven changes across releases and services. The OpenSpec workflow here emphasizes small, well-scoped changes, explicit contracts, and traceable progress.

## Purpose

- Provide governance for spec-driven changes (proposals, design decisions, and delta specs).
- Ensure changes are incremental, auditable, and aligned with project strategy.
- Enable multi-team collaboration with clear ownership and validation.

## Scope

- All MVP or significant architectural changes that affect APIs, data contracts, or cross-service interactions.
- Includes new capabilities, breaking changes, and performance/security work when warranted.
- Excludes minor documentation fixes, styling tweaks, and non-functional tweaks unless tied to a spec.

## Principles

- Bounded changes: keep scope small and testable.
- Explicit contracts: API and event contracts in delta specs.
- Evolution over Big Bang: incremental migration and feature flagging where possible.
- Observability by default: log, monitor, and trace changes.
- Open collaboration: review and approval required before implementation.

## Process Overview (Three Stages)

- Stage 1: Creating Changes
  - Create a proposal under changes/{change-id}/ with proposal.md and tasks.md
  - Scaffold capability deltas under changes/{change-id}/specs/{capability}/spec.md as needed
  - Validate proposals with openspec validate <change-id> --strict
- Stage 2: Implementing Changes
  - Implement tasks per tasks.md, guided by design.md (if present)
  - Maintain contract consistency and perform regression checks
- Stage 3: Archiving Changes
  - After deployment, archive the change with openspec archive <change-id>
  - Move completed changes under changes/archive/YYYY-MM-DD-<name>/ and update specs if necessary

## Directory Structure (OpenSpec)

```
openspec/
├── project.md
├── specs/                  # Current truth - built capabilities
│   └── [capability]/
│       ├── spec.md        # Requirements and scenarios
│       └── design.md      # Technical decisions (optional)
├── changes/                # Proposals - changes to implement
│   ├── [change-name]/
│   │   ├── proposal.md
│   │   ├── tasks.md
│   │   ├── design.md (optional)
│   │   └── specs/          # Delta changes per capability
│   │       └── [capability]/spec.md
│   └── archive/            # Archived changes
```

## Change ID Naming

- Use kebab-case, verb-led prefixes, e.g. `add-two-factor-auth`, `migrate-auth`, `split-mvp-microservices`.
- Ensure uniqueness; if a name is taken, append a suffix like `-2`.

## Proposal.md | Tasks.md | Design.md

- Proposal.md: Why, what, impact, and high-level considerations.
- Tasks.md: Concrete, checkable tasks with progress status.
- Design.md: Optional; captures architecture decisions, trade-offs, risks, and migration plan.

## Specs Delta (spec.md)

- Location: openspec/changes/<change-id>/specs/<capability>/spec.md
- Structure:
  - ADDED|MODIFIED|REMOVED Requirements
  - Each Requirement must include at least one Scenario:
  - Cross-reference to related capabilities when needed

## Validation & Archiving

- Validate with: `openspec validate <change-id> --strict`.
- Archive with: `openspec archive <change-id> --yes` after successful deployment.
- Use `openspec show <item> --json --deltas-only` to inspect deltas.

## Quick Start (CLI)

- List active changes: `openspec list`
- List specs: `openspec list --specs`
- Show details: `openspec show <item>`
- Validate: `openspec validate <change-id> --strict`
- Archive: `openspec archive <change-id> [--yes|-y]`

## OpenSpec in this repo

- Cursor rules: none detected in repository.
- Copilot rules: none detected in repository.
- The AGENTS.md in this repo contains operational guidance for agent-based changes and is aligned with OpenSpec workflow.

## Validation Notes

- Specs are the source of truth. Changes are proposals awaiting approval and implementation.
- Ensure all deltas have at least one Scenario and use the correct markdown headers for parsing.
