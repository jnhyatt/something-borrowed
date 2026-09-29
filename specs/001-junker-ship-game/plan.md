# Implementation Plan: Junker Ship Wedding Run

**Branch**: `001-junker-ship-game` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-junker-ship-game/spec.md`

## Summary

A signed-in player gets three AI-generated ship malfunctions in a row and must find the one
correct fix for each by exploring flat ship areas and taking actions. The game decides whether an
action is correct by exact ID match. OpenRouter writes all text and decides game over.

Technical approach:

- **UI**: a small set of server-rendered pages. The home screen doubles as the start, resume,
  victory, and loss screen. There is one dynamic page per ship area, a log page, and sign-in/sign-up
  pages. A shared "ship shell" layout shows trip progress, symptoms, the latest result, and area
  navigation on every ship page (FR-039, FR-031).
- **Mutations**: starting a game, taking an action, continuing to the next leg, and signing
  in/out are Server Actions submitted from plain `<form>`s, so they work by keyboard and before
  hydration. Ship actions are also exposed as `POST`/`PUT`/`DELETE` on each action's address,
  matching the do/set/remove request types. The Server Action and the route handler are thin
  adapters over one service call, so they can't diverge.
- **Data**: Postgres (via Drizzle) stores the whole game: the action set, every scenario, and
  every attempt, with constraints enforcing the spec's invariants. Better Auth provides
  email/password sessions.
- **Rules and AI**: game rules, prompt building, and validation of generated content are pure
  modules in `lib/game/`. A server-only service runs each LLM call **outside** any database
  transaction. A short-lived `busy_since` claim on the game row ensures only one generation runs
  per game at a time.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 19.2, Next.js 16.3 (App Router)

**Primary Dependencies**: `better-auth` (sessions, email/password), `drizzle-orm` + `postgres`
(DB access), `zod` (validating LLM output and env), `server-only`, Tailwind CSS v4. OpenRouter is
called with plain `fetch` (no SDK). No UI, state-management, or form libraries. See
[research.md](./research.md) for why each was chosen.

**Storage**: PostgreSQL 17. Game tables are in [data-model.md](./data-model.md); auth tables are
owned by Better Auth.

**Testing**: Vitest for unit tests (`lib/game/`), service tests with a fake generator, DB
integration tests against a real Postgres, and component tests (React Testing Library, jsdom).
Playwright for end-to-end flows against the fake generator
([contracts/llm-generation.md](./contracts/llm-generation.md#fake-generator)).

**Target Platform**: Node.js 22 server runtime (any Next.js host with outbound HTTPS and a
Postgres connection); modern desktop and mobile browsers.

**Project Type**: Full-stack web application (single Next.js project).

**Performance Goals**: New game ready ≤15 s p95 (SC-003); next scenario ≤10 s p95; action result
≤8 s p95 (SC-004). All three are dominated by LLM latency. Database work per call is a handful of
indexed queries. The waiting UI appears as soon as any generating form is submitted (FR-035).

**Constraints**: Failures surface within 30 s (SC-005), so there is a hard 25 s timeout per LLM
call. The correct action never leaves the service layer (FR-019, SC-007). No player free text
ever reaches the LLM (FR-036). Nothing is recorded for a failed generation (FR-027). Fully
keyboard playable, with outcomes conveyed in text (FR-042). Usable at 320 px wide (FR-043). Light
and dark schemes.

**Scale/Scope**: Hobby scale (tens of concurrent players). 5 page routes (all ship areas share
one dynamic route), 1 ship-action route handler, 6 Server Actions, about 25 components (3 client),
4 game tables, 3 fixed areas, 1 game per player, 3 LLM prompt types.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                  | Status | How the design complies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Strict Type Safety      | ✅     | `strict` stays on. Route params, form data, env vars, and every OpenRouter response are `unknown` and validated (Zod, `isAreaSlug`, or lookup in the player's game). `GameView`, `ServiceResult`, and `FormState` are discriminated unions. Drizzle infers row types, so there are no `as` casts on query results.                                                                                                                                                                                                        |
| II. App Router Conventions | ✅     | File-based routes only, with `page`, `layout`, `loading`, `error`, `not-found`, and `route` special files and `(auth)`/`(ship)` route groups. Server Components by default; 3 client leaves (below). Mutations via Server Actions plus one route handler. DB, LLM, auth, and service modules import `server-only`. Bundled Next 16 docs consulted: `proxy.ts` (not middleware), `error.tsx`'s `retry` prop, `refresh()` only in Server Actions, `RouteContext`/`PageProps` helpers, async `params`, authentication guide. |
| III. Tailwind              | ✅     | Tokens in `@theme` in `app/globals.css`. Repeated class lists become components (`Button`, `Panel`, `Badge`). Custom CSS limited to what utilities can't express (waiting-dots keyframes, tape-label `clip-path`, rivet and scanline gradients), each with a justification comment. Palette and fonts in [visual-style.md](./visual-style.md).                                                                                                                                                                            |
| IV. Pure Game Logic        | ✅     | `lib/game/` holds rules (`decideAttempt`, `applyResult`), derived state (`toGameView`), validation of generated content, prompt builders, and constants (`AREAS`, `REQUEST_METHOD`). None import React, Next, DB, or `fetch`. The LLM is injected into the service as a `TextGenerator` interface. Timestamps come from Postgres `now()`. Components contain no rules.                                                                                                                                                    |
| V. Testing                 | ✅     | Unit tests for every `lib/game/` module. Service tests with a fake `TextGenerator`. DB integration tests for constraints and the busy claim. Component tests for every client component. Playwright covers start → play → win/lose → restart. Resolves the constitution's TODO(TEST_TOOLING) and TODO(TYPECHECK_SCRIPT). Async Server Components are covered by E2E, since Vitest can't render them.                                                                                                                      |
| VI. Naming & Layout        | ✅     | `app/` holds routes only; shared UI in `components/`; Server Actions in `lib/actions/`; pure rules in `lib/game/`; server-only infrastructure in `lib/db/`, `lib/ai/`, `lib/auth/`, `lib/server/`. Kebab-case route segments, PascalCase component files, named exports except special files. Tests colocated; E2E in `e2e/`.                                                                                                                                                                                             |

**Client components (each justified)**:

1. `StatefulForm`: needs `useActionState` to show a Server Action's returned error (generation
   failure, rejected action) in place.
2. `PendingButton`: needs `useFormStatus` to swap in the in-story waiting state (FR-035).
3. `AreaNavLink`: needs `usePathname` to set `aria-current` on the current area, because the
   shared `(ship)` layout doesn't receive the child `[area]` param.

`app/error.tsx` is also a client component, as Next.js requires.

**New dependencies** (the constitution requires justification; detail in research.md):

- **Runtime**: `better-auth`, `drizzle-orm`, `postgres`, `zod`, `server-only`.
- **Dev**: `drizzle-kit`, `vitest`, `@vitejs/plugin-react`, `jsdom`, `vite-tsconfig-paths`,
  `@testing-library/react`, `@testing-library/dom`, `@playwright/test`.

No state-management, CSS-in-JS, or UI libraries.

**Post-design re-check (after Phase 1)**: ✅ No violations. `correct_action_id` exists only in
server-only types. `GameView`, the only shape the UI receives, has no field from which the
correct action can be derived. The contracts added no client components, dependencies, or
custom CSS beyond those listed.

## Project Structure

### Documentation (this feature)

```text
specs/001-junker-ship-game/
├── spec.md
├── plan.md                    # This file
├── research.md                # Phase 0
├── data-model.md              # Phase 1: schema, derived state, transitions
├── component-hierarchy.md     # Phase 1: UI component tree
├── visual-style.md            # Phase 1: palette, type, component treatments
├── quickstart.md              # Phase 1: setup and validation
├── contracts/
│   ├── routes.md              # Pages: URL, access, content per game state
│   ├── mutations.md           # Server Actions + ship-action HTTP endpoint
│   ├── service-api.md         # Service functions and view types the UI calls
│   └── llm-generation.md      # OpenRouter prompt/response contract + fake generator
├── checklists/requirements.md
└── tasks.md                   # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
proxy.ts                              # Optimistic signed-in check (cookie only)

app/
├── layout.tsx                        # Root: fonts, metadata, <body>
├── globals.css                       # @theme tokens
├── page.tsx                          # / — premise, start/resume, victory, loss
├── not-found.tsx                     # 404 with link back (FR-041)
├── error.tsx                         # Unexpected errors, `retry`
├── (auth)/
│   ├── layout.tsx                    # Centered card; redirects to / if signed in
│   └── auth/
│       ├── login/page.tsx
│       └── signup/page.tsx
├── (ship)/
│   ├── layout.tsx                    # ShipShell (requires player + game)
│   ├── loading.tsx                   # In-story "pulling up schematics" state
│   ├── log/page.tsx                  # Full attempt log (FR-031)
│   └── [area]/
│       ├── page.tsx                  # Area: header + action list
│       └── [target]/route.ts         # POST/PUT/DELETE ship actions; GET → 303 to area
└── api/auth/[...all]/route.ts        # Better Auth's handler

components/
├── ui/          Button, Panel, Badge, StatefulForm*, PendingButton*
├── ship/        ShipShell, ShipHeader, TripProgress, SymptomsPanel, LatestResult,
│                AreaNav, AreaNavLink*, AreaHeader, ActionList, ActionItem,
│                OutcomeTag, ContinueForm, NoGamePrompt
├── game/        Premise, NewGameForm, EndScreen, VictoryScreen, LossScreen,
│                GeneratingNotice, GenerationError
├── log/         ShipLog, LogEntry
└── auth/        AuthForm, SignOutForm
                 (* = client component)

lib/
├── actions/                          # 'use server' adapters over lib/server
│   ├── game.ts                       # startNewGame, takeShipAction, continueTrip
│   └── auth.ts                       # signIn, signUp, signOut
├── game/                             # PURE — no React/Next/DB/fetch
│   ├── areas.ts                      # AREAS, isAreaSlug(), RESERVED_SLUGS
│   ├── requestTypes.ts               # REQUEST_METHOD: do/set/remove ↔ POST/PUT/DELETE
│   ├── types.ts                      # domain types (server-only fields) + view types
│   ├── gameView.ts                   # toGameView(): derive status, leg, tried actions
│   ├── attempts.ts                   # decideAttempt(), applyResult()
│   ├── validateGenerated.ts          # FR-033 checks for action set / scenario / result
│   └── prompts.ts                    # build prompt messages from game history
├── ai/                               # server-only
│   ├── textGenerator.ts              # TextGenerator interface + GenerationError
│   ├── openRouter.ts                 # fetch client, 25 s timeout, JSON schema output
│   ├── fakeGenerator.ts              # scripted generator for e2e / dev (AI_PROVIDER=fake)
│   └── index.ts                      # picks the provider from env
├── db/                               # server-only
│   ├── schema.ts                     # Drizzle schema (game tables + Better Auth tables)
│   ├── client.ts
│   └── gameRepo.ts                   # load game, claim/release busy, insert rows in tx
├── auth/                             # server-only
│   ├── auth.ts                       # Better Auth config (+ nextCookies plugin)
│   └── session.ts                    # requirePlayer(), getOptionalPlayer()
├── server/                           # server-only
│   ├── gameService.ts                # getGameView, startGame, takeAction, findActionByAddress, startNextLeg
│   └── authService.ts                # signUp, signIn, signOut → ServiceResult
└── env.ts                            # server-only; Zod-validated environment variables

e2e/play-loop.spec.ts                 # start → wrong → right ×3 → win → restart; loss path
drizzle/                              # generated SQL migrations
docker-compose.yml                    # local Postgres (dev + test databases)
.env.example
```

**Structure Decision**: A single Next.js project. Routes and pages call only `lib/actions/*`,
`lib/server/*`, and `lib/auth/session.ts`. Rules are pure code in `lib/game/`. Server-only
infrastructure (`lib/ai`, `lib/db`, `lib/auth`, `lib/server`) is kept separate so the rules stay
testable without a DB or network. New scripts: `typecheck`, `test`, `test:e2e`, `db:migrate`.

## Complexity Tracking

No constitution violations. Two design choices are recorded because they add moving parts:

| Choice                                                                         | Why Needed                                                                 | Simpler Alternative Rejected Because                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `busy_since` claim column instead of a DB transaction held across the LLM call | FR-028 / edge case: reject concurrent actions while one is being evaluated | Holding a row lock for up to 25 s ties up a pooled connection and can't tell the second request "busy" without blocking it |
| Fake LLM provider selectable by env                                            | Deterministic e2e tests (Principle V) and offline dev                      | Mocking `fetch` inside Playwright's server process is brittle and doesn't exercise the real service path                   |
