<!--
Sync Impact Report
==================
Version change: (unversioned template) → 1.0.0
Bump rationale: Initial ratification; all placeholders replaced with project-specific governance.

Modified principles (template placeholder → adopted title):
  - [PRINCIPLE_1_NAME] → I. Strict Type Safety (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Next.js App Router Conventions
  - [PRINCIPLE_3_NAME] → III. Utility-First Styling with Tailwind
  - [PRINCIPLE_4_NAME] → IV. Pure, Framework-Free Game Logic
  - [PRINCIPLE_5_NAME] → V. Testing Expectations

Added sections:
  - VI. Consistent Naming & File Organization (sixth principle beyond template's five)
  - Technology Stack & Constraints (was [SECTION_2_NAME])
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])
  - Governance rules

Removed sections: none

Follow-up TODOs / deferred items:
  - TODO(TEST_TOOLING): Vitest, React Testing Library, and Playwright are mandated by
    Principle V but not yet installed; no `test` script exists in package.json. Adopt them
    through the first feature that needs tests (or a dedicated setup task).
  - TODO(TYPECHECK_SCRIPT): Quality gates require `tsc --noEmit`; add a `typecheck` script.
-->

# Something Borrowed Constitution

## Core Principles

### I. Strict Type Safety (NON-NEGOTIABLE)

- TypeScript `strict` mode MUST remain enabled in `tsconfig.json`; it MUST NOT be weakened
  per-file or per-project.
- The `any` type MUST NOT be used, explicitly or implicitly. Use `unknown` plus narrowing,
  generics, or precise types instead.
- `@ts-ignore` and `@ts-nocheck` are forbidden. `@ts-expect-error` is permitted only with an
  inline comment explaining why, and only for third-party typing defects.
- Non-null assertions (`!`) and type assertions (`as`) MUST be avoided; when unavoidable they
  require a comment justifying why the value is guaranteed.
- Data crossing a trust boundary (URL params, `localStorage`, `fetch` responses, form input)
  MUST be typed as `unknown` and validated before use.
- Game state MUST be modeled with explicit types; state machines and variants SHOULD use
  discriminated unions so invalid states are unrepresentable.
- New source files MUST be `.ts`/`.tsx`; no new `.js` files outside configuration.

**Rationale**: Game state has many interacting variants; the compiler is the cheapest place to
catch impossible states and missed cases.

### II. Next.js App Router Conventions

- Routing MUST use the App Router's file-based conventions under `app/` (`page.tsx`,
  `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, route groups, dynamic segments).
  No custom routers or client-side route tables.
- Components are Server Components by default. `"use client"` MUST be added only where
  interactivity, browser APIs, state, or effects are required, and MUST be pushed to the
  smallest leaf component that needs it.
- Server Components MUST NOT import client-only code; client components MUST NOT import
  server-only modules (secrets, filesystem, database access).
- Props passed from Server to Client Components MUST be serializable.
- Data fetching and mutations SHOULD use server-side patterns (Server Components, Server
  Actions, Route Handlers) rather than client-side fetching when the data is not
  interaction-driven.
- This project uses a Next.js version with breaking changes relative to common training data.
  Before using any Next.js API or convention, contributors (human or AI) MUST consult the
  bundled docs in `node_modules/next/dist/docs/` and heed deprecation notices.

**Rationale**: Keeping the client boundary small minimizes shipped JavaScript and keeps
rendering predictable; following framework conventions keeps the app upgradeable.

### III. Utility-First Styling with Tailwind

- Styling MUST use Tailwind utility classes in markup.
- Custom CSS is permitted only when utilities cannot express the need (e.g., keyframe
  animations, complex game-canvas or sprite effects, third-party overrides). Each such block
  MUST carry a comment stating why utilities were insufficient.
- Design tokens (colors, fonts, spacing, animations) MUST be defined via Tailwind v4 `@theme`
  in `app/globals.css`, not as hard-coded arbitrary values repeated across components.
  Arbitrary values (`w-[137px]`) are allowed for one-off cases only.
- `@apply` SHOULD NOT be used; repeated class lists MUST be extracted into a React component
  rather than a CSS class.
- Inline `style` props are permitted only for values computed at runtime (e.g., positions or
  transforms driven by game state).
- Class ordering is enforced by `prettier-plugin-tailwindcss` and MUST NOT be hand-overridden.
- UI MUST be responsive (usable at phone width) and support the existing light/dark scheme.

**Rationale**: A single styling approach keeps components self-describing and avoids
stylesheet drift.

### IV. Pure, Framework-Free Game Logic

- Game rules, state transitions, scoring, and win/lose detection MUST live in plain
  TypeScript modules (under `lib/game/`) with no imports from React, Next.js, or the DOM.
- State transitions MUST be pure functions of the form `(state, action) => newState`;
  they MUST NOT mutate their inputs.
- Sources of nondeterminism (randomness, time) MUST be injected (e.g., a seeded RNG or clock
  parameter) so logic is reproducible in tests.
- React components render state and dispatch actions; they MUST NOT contain game rules.

**Rationale**: Isolating rules from rendering makes the game fully testable without a
browser and keeps UI changes from breaking gameplay.

### V. Testing Expectations

- Every module in `lib/game/` MUST have unit tests covering its rules, including edge cases
  (boundaries, invalid moves, win/lose/draw conditions). Bug fixes MUST add a regression test
  that fails before the fix.
- Tests for game logic SHOULD be written before the implementation (red-green-refactor).
- Interactive client components MUST have component tests for their primary interactions,
  asserting on user-visible behavior (roles, text, labels) rather than implementation details.
- The core play loop (start → play → end/restart) MUST be covered by at least one end-to-end
  test.
- Tooling: Vitest for unit and component tests, React Testing Library for components,
  Playwright for end-to-end tests.
- Tests MUST be deterministic: no reliance on real timers, real randomness, or test ordering.
- All tests MUST pass before merge; skipped tests require a linked reason.

**Rationale**: Games regress easily through subtle rule changes; fast deterministic tests on
pure logic give high confidence at low cost.

### VI. Consistent Naming & File Organization

- React component files and components: `PascalCase` (`GameBoard.tsx` exports `GameBoard`),
  one primary component per file.
- Hooks: `useCamelCase`, in files of the same name (`useGameLoop.ts`).
- Non-component modules and utilities: `camelCase` file names (`scoring.ts`).
- Route segment directories under `app/`: `kebab-case`. Next.js special files keep their
  required names (`page.tsx`, `layout.tsx`, etc.).
- Types and interfaces: `PascalCase`, without an `I` prefix. Prefer `type` aliases; use
  `interface` only when declaration merging or extension is needed.
- Module-level constants that are true fixed configuration: `SCREAMING_SNAKE_CASE`
  (`BOARD_SIZE`). Everything else: `camelCase`.
- Booleans are prefixed `is`/`has`/`can`/`should`. Event handler props are `onX`; their
  implementations are `handleX`.
- Named exports MUST be used everywhere except where Next.js requires a default export
  (pages, layouts, and other special files).
- Imports from outside the current directory MUST use the `@/` path alias rather than deep
  relative paths (`../../`).
- Tests are colocated with the code they test as `*.test.ts` / `*.test.tsx`; end-to-end tests
  live in `e2e/`.
- Layout: `app/` for routes only; shared UI in `components/`; game logic in `lib/game/`;
  shared hooks in `hooks/`. Route-private components MAY live in `_components/` inside their
  route folder.

**Rationale**: Predictable names and locations let contributors and AI agents find and place
code without guesswork.

## Technology Stack & Constraints

- **Framework**: Next.js (App Router) at the version pinned in `package.json`; React at the
  version pinned in `package.json`.
- **Language**: TypeScript 5.x, strict mode.
- **Styling**: Tailwind CSS v4 (CSS-first configuration via `@theme`).
- **Formatting & linting**: Prettier (with `prettier-plugin-tailwindcss`) and ESLint using
  `eslint-config-next` (core-web-vitals + typescript).
- **Testing**: Vitest, React Testing Library, Playwright (see Principle V).
- **Scope**: This is a simple web game. New runtime dependencies MUST be justified in the
  feature plan; prefer platform and framework features over libraries. No state-management,
  CSS-in-JS, or UI-component library may be added without a constitution-compliant
  justification.
- **Accessibility**: Game controls MUST be operable by keyboard and have accessible names;
  game state changes relevant to play SHOULD be announced or visible without relying on
  color alone.

## Development Workflow & Quality Gates

A change is mergeable only when all of the following pass:

1. `npm run lint` — zero errors.
2. `tsc --noEmit` — zero type errors.
3. `npm run format:check` — clean.
4. All tests pass (unit, component, and end-to-end where applicable).
5. `npm run build` succeeds.

Review expectations:

- Every review MUST check compliance with Principles I–VI; each new `"use client"`
  directive, custom CSS block, type assertion, and new dependency MUST be justified in the
  change.
- Feature plans (`/speckit-plan`) MUST include a Constitution Check that addresses each
  principle and records any justified deviation in the plan's Complexity Tracking section.
- Commits SHOULD be small and focused, using Conventional Commit prefixes (`feat:`, `fix:`,
  `test:`, `docs:`, `refactor:`, `chore:`).

## Governance

- This constitution supersedes other practices and style preferences for this repository.
  Where it conflicts with another document, the constitution wins until amended.
- Amendments are made via `/speckit-constitution` in a dedicated change that updates this
  file, states the version bump and rationale, and notes any code or docs requiring
  migration.
- Versioning follows semantic versioning:
  - **MAJOR**: removal or backward-incompatible redefinition of a principle or governance rule.
  - **MINOR**: a new principle or section, or materially expanded guidance.
  - **PATCH**: clarifications, wording, and typo fixes with no change in meaning.
- Deviations from a principle are permitted only when documented and justified in the
  relevant feature plan; unjustified complexity is grounds to reject a change.
- Runtime development guidance for AI agents lives in `AGENTS.md` (referenced by
  `CLAUDE.md`) and MUST remain consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-18
