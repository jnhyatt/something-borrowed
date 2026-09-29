# Quickstart & Validation: Junker Ship Wedding Run

How to run the feature locally and check that it meets the spec. Data shapes are in
[data-model.md](./data-model.md). Pages, mutations, and service functions are in
[contracts/](./contracts/).

## Prerequisites

- Node.js 22, Docker (for Postgres)
- An OpenRouter API key and a model that supports structured outputs (only for real play; tests
  use the fake provider)

## Setup

```sh
docker compose up -d                 # postgres:17 with dev + test databases
cp .env.example .env.local           # fill DATABASE_URL, BETTER_AUTH_SECRET, OPENROUTER_API_KEY, OPENROUTER_MODEL
npm install
npx playwright install chromium
npm run db:migrate                   # drizzle-kit migrate
npm run dev
```

To play without OpenRouter, set `AI_PROVIDER=fake` in `.env.local`.

## Automated checks (quality gates)

```sh
npm run lint && npm run typecheck && npm run format:check
npm test                             # Vitest: lib/game units, DB integration, service, components
npm run test:e2e                     # Playwright, AI_PROVIDER=fake
npm run build
```

### Vitest suites must show

| Area                            | Expected                                                                                                                                                                                                                                       | Covers                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `validateGenerated`             | Rejects: <3 actions in an area, <10 total, duplicate `(verb, area, slug)`, reserved slug, a scenario whose correct key is unknown or reused from an earlier leg, symptoms naming the correct action or its area, a result missing `isGameOver` | FR-012–FR-018, FR-033          |
| `decideAttempt` / `applyResult` | Correct iff ID matches. Correct never loses. Leg 3 correct → won. Game over → lost. Repeat → no generation                                                                                                                                     | FR-021, FR-022, FR-010, FR-026 |
| `prompts`                       | Contains the whole history and N wrong attempts. Refers to actions only by prompt keys, never raw IDs. No player-supplied text                                                                                                                 | FR-016, FR-024, FR-036         |
| `toGameView`                    | Each status and leg derived correctly. Tried markers reset each leg. No correct-action field                                                                                                                                                   | FR-019, FR-026, US2-2          |
| `AREAS`                         | Every slug is kebab-case and none is in `RESERVED_SLUGS`                                                                                                                                                                                       | FR-038, FR-041                 |
| DB constraints                  | Second game for a player, second active scenario, duplicate attempt per scenario/action, and a scenario whose correct action is from another game are all rejected                                                                             | FR-003, FR-009, FR-026         |
| Busy claim                      | Two concurrent claims → exactly one wins. A stale claim (>60 s) can be reclaimed. A commit with a stolen claim is rolled back                                                                                                                  | FR-028                         |
| `gameService` (fake generator)  | Generation failure writes nothing and releases the claim. `startGame` failure keeps the old game. A full game can be won and lost                                                                                                              | FR-007, FR-027, FR-034         |
| Client components               | `StatefulForm` shows a returned error and retries; `PendingButton` shows the waiting notice while pending; `AreaNavLink` sets `aria-current` on the current area                                                                               | FR-034, FR-035, FR-040         |

### Playwright (`e2e/play-loop.spec.ts`) must cover

Action names refer to the [fake generator fixture](./contracts/llm-generation.md#fake-generator).

| Flow                                                 | Expected                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Visit `/piloting` signed out                         | Redirected to `/auth/login?next=/piloting`; after sign-in, lands on `/piloting`                          |
| Sign up → `/` → "Borrow the junker"                  | Waiting text appears, then `/piloting` with "Leg 1 of 3" and symptoms                                    |
| Visit each area via `AreaNav`, and each by typed URL | Area name, its actions, links to all areas                                                               |
| `/not-a-room`                                        | 404 page with link to `/`                                                                                |
| Take a wrong action                                  | `LatestResult` shows result + "Still broken"; action now shows "Tried" with no button; appears on `/log` |
| Take the correct action                              | "Fixed" + Continue; Continue → "Leg 2 of 3"                                                              |
| Resolve legs 2 and 3                                 | `/` shows victory; "Borrow the junker" starts a fresh game                                               |
| Take the game-over action                            | Loss screen on `/`; ship pages show no controls                                                          |
| Reload and sign out/in mid-game                      | Same leg, symptoms, and log text                                                                         |
| Take the always-failing action                       | "Can't get a response from OpenRouter, try again later" + retry; state unchanged                         |
| Keyboard only (Tab/Enter)                            | Every step above is completable                                                                          |

## Manual checks

1. At 320 px width, every screen fits with no horizontal scrolling (FR-043).
2. In light and dark schemes, outcome tags are readable and carry text (FR-042).
3. View source and the RSC payload on an area page during an active scenario; nothing identifies
   the correct action (SC-007).
4. Ship-action endpoint ([contracts/mutations.md](./contracts/mutations.md#http-endpoint--appshipareatargetroutets)):
   `PUT /engine-room/coolant-valve` without a session cookie returns `401` JSON; with the
   `better-auth.session_token` cookie it returns `200` and the result appears on the next page
   load; `GET` on the same address redirects `303` to `/engine-room`.

### Against real OpenRouter

With `AI_PROVIDER=openrouter`, play one full game and one deliberately reckless game:

1. The first game is ready in ≤15 s, and each later leg and action result in ≤10 s / ≤8 s (SC-003,
   SC-004).
2. Symptoms never name the fixing action or its area. Hints get more direct with repeated wrong
   tries. Cautious actions don't worsen the ship (FR-017, FR-024, FR-025).
3. With an invalid `OPENROUTER_API_KEY`, an action shows the error message within 30 s and nothing
   is logged (SC-005).
