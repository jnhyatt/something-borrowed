# Research: Junker Ship Wedding Run

Phase 0 decisions for [plan.md](./plan.md). The Technical Context had no unresolved
NEEDS CLARIFICATION entries. This file records the technology choices and the patterns chosen
for the hard parts.

## 1. Authentication

- **Decision**: Better Auth with the email/password plugin and database sessions in Postgres
  (via its Drizzle adapter). Pages and handlers call `requirePlayer()`
  (`lib/auth/session.ts`), which reads the session and redirects. Route handlers use
  `getOptionalPlayer()` and return 401. This is the real check. `proxy.ts` only
  does an optimistic cookie redirect. Better Auth's `nextCookies()` plugin lets the UI's
  sign-in/sign-up Server Actions set the session cookie.
- **Rationale**: The spec only needs email/password (Assumptions). Better Auth is listed in the
  bundled Next.js auth guide, has first-class App Router support, stores sessions in our own
  Postgres (so they can be revoked, with no third-party service), and uses an HTTP-only session
  cookie. The Next docs note that proxy checks are only optimistic, so the real check has to happen near the data
  anyway.
- **Alternatives considered**: Auth.js (email/password "credentials" support is deliberately
  limited and it's not designed for DB sessions with credentials). Hand-rolled
  sessions/JWT (more security surface for no gain). Clerk/Auth0 (hosted dependency, overkill).
- **Note**: Better Auth owns `user`, `session`, `account`, and `verification` tables, and its IDs
  are `text`. `games.player_id` is therefore `text` referencing `"user"(id)`.

## 2. Database access

- **Decision**: Drizzle ORM + `postgres` (postgres.js) driver, with `drizzle-kit` generating
  SQL migrations into `drizzle/`.
- **Rationale**: Typed queries without code generation at runtime. The schema is written in TS
  and supports everything the data model needs: pg enums, composite foreign keys, partial
  unique indexes, and check constraints. Row types are inferred, so there are no `as` casts
  (Principle I). Better Auth has a Drizzle adapter, so there is one schema source.
- **Alternatives considered**: Prisma (heavier; partial unique indexes and composite FKs to
  non-PK uniques need raw SQL migrations). Kysely (fine, but a second schema definition is
  needed for Better Auth). Raw `pg` (no types for rows).

## 3. Serializing actions (FR-028) without long transactions

- **Decision**: The `games.busy_since` column is used as a claim with a 60 s timeout.
  1. Claim: `UPDATE games SET busy_since = now() WHERE id = $1 AND status = 'in_progress' AND
(busy_since IS NULL OR busy_since < now() - interval '60 seconds') RETURNING busy_since`.
     No row back → `busy` (or `not-allowed` if the game is over).
  2. Call the LLM with no transaction open.
  3. Commit in one short transaction: re-check the claim with `UPDATE games SET busy_since =
NULL … WHERE id = $1 AND busy_since = $claimed`. If 0 rows, the claim expired and was
     taken by another request, so roll back and report a generation failure. Then insert the
     attempt / scenario and update status.
  4. On LLM failure: release the claim (`busy_since = NULL WHERE busy_since = $claimed`). Nothing
     else is written (FR-027).
- **Rationale**: This matches the spec ("the server tracks when an action is being evaluated"
  and rejects others). It avoids holding a pooled connection for up to 25 s. The timeout
  (60 s > 25 s LLM timeout + margin) means a crashed process can't lock a game forever. Using
  the claimed timestamp as a token makes the final write safe even if the claim was stolen.
- **Alternatives considered**: `SELECT … FOR UPDATE` held across the LLM call (blocks rather
  than rejects, and ties up connections). Advisory locks (session-scoped, so they fail with
  pooled connections). An in-memory mutex (breaks with more than one server instance).

## 4. Repeated and invalid requests (FR-026, FR-029)

- **Decision**: `takeAction` checks in this order: the action ID belongs to the player's game →
  the game is in progress with an active scenario (otherwise `not-allowed`) → **existing attempt
  for (active scenario, action)?** → return it with `repeated: true`, no claim → claim (`busy`) →
  generate (`generation-failed`) → commit. `UNIQUE (scenario_id, action_id)` backs this up if
  two requests race. Mapping an address to an action (`findActionByAddress`, 404/405) happens
  before this, in the route handler (§10).
- **Rationale**: A repeat should show the stored result even while another action is being
  evaluated, and must never trigger generation. The error codes are the
  `ServiceResult` codes in [contracts/service-api.md](./contracts/service-api.md).

## 5. Starting / replacing a game (FR-006, FR-007, FR-011)

- **Decision**: Generate the action set, validate it, then generate scenario 1 from it and
  validate that. Only then, in one transaction: `DELETE FROM games WHERE player_id = $1`
  (cascades), then insert the game, actions, and scenario 1. If the player already has an
  in-progress game that is busy, return `busy`. If generation fails, the existing game
  is untouched.
- **Rationale**: There's never a stored game without a playable first scenario. FR-034 ("no
  progress lost") holds even if the player clicks "New game" by mistake while the service is
  down. Two tabs starting at once both succeed and the later commit wins. `UNIQUE (player_id)`
  guarantees one game. This race is acceptable because the losing tab shows the winner's game
  on its next load.
- **Alternatives considered**: Inserting the game first with a "setting up" status (adds a
  state and a cleanup path).

## 6. Advancing legs (FR-009, US2)

- **Decision**: The correct action marks the scenario resolved in the same commit as the
  attempt. On leg 3 it also sets `status = 'won'`. The next scenario is generated by a separate
  `startNextLeg` call when the player presses **Continue**. That call is also the retry
  path if the generation fails.
- **Rationale**: This keeps each request under its own latency target (8 s result, 10 s
  scenario). It matches the spec ("When the player continues, the next scenario begins"). It
  also gives an obvious retry point. The "resolved, waiting for next leg" state comes from the
  data (latest scenario resolved, leg < 3), so nothing needs to be stored for it.

## 7. OpenRouter integration

- **Decision**: Plain `fetch` to `https://openrouter.ai/api/v1/chat/completions` with
  `response_format: { type: "json_schema", strict: true }` and a JSON Schema per generation
  kind. `AbortSignal.timeout(25_000)` aborts slow calls. The model comes from the
  `OPENROUTER_MODEL` env var and must support structured outputs. The API key stays in a
  server-only env var. Every response is parsed as `unknown` and validated with Zod plus the
  semantic checks in `lib/game/validateGenerated.ts`. Any failure (network, non-2xx, timeout,
  bad JSON, failed validation) becomes a single `GenerationError`, and the player sees "Can't
  get a response from OpenRouter, try again later." There is one automatic retry only when a
  failure happens within the first 10 s, which keeps the total under 30 s (SC-005).
- **Rationale**: The OpenAI-compatible endpoint is simple. An SDK would add a dependency for
  one POST call. Structured outputs reduce validation failures, but validation still
  runs regardless.
- **Action references in prompts**: Actions are given to the LLM as short keys (`A1`, `A2`, …)
  mapped server-side to action IDs. The LLM returns `correctActionKey`, and the server checks
  that it exists and wasn't the correct action of an earlier leg (FR-018).
- **Alternatives considered**: Vercel AI SDK / OpenAI SDK (unneeded dependency). Free-text
  output with regex parsing (unreliable).

## 8. Content safety (FR-037)

- **Decision**: The system prompt requires light-hearted, all-ages content. Validation rejects
  output containing words from a small denylist (`lib/game/validateGenerated.ts`) and enforces
  length limits. A rejected output counts as a generation failure.
- **Rationale**: The input is only game-generated content plus fixed action choices (FR-036), so
  the risk is low. A separate moderation API call would add latency to every request.
- **Alternatives considered**: An OpenRouter moderation model per generation (adds about 1 s and a
  second failure point; can be revisited if playtesting finds problems).

## 9. Hint escalation and history (FR-016, FR-022–FR-025)

- **Decision**: `lib/game/prompts.ts` builds every prompt from the full stored game: premise,
  action list (keys, area, verb, label), each earlier leg's symptoms and correct action, and
  every attempt in order with its result text. The result prompt also includes
  `wrongAttemptsThisScenario` (N) with an instruction to make the hint more direct as N grows.
  It also includes the rule that diagnostic/cautious actions shouldn't worsen the ship and that
  game over is only for reckless or repeatedly ignored hints. Correctness is decided **before**
  the prompt is built. The model is told whether the action was correct and never makes that
  call itself (FR-021).
- **Rationale**: Prompt building is pure and deterministic, so it's unit-testable
  (Principle IV). The whole history is small (≤3 legs, ≤ about 30 attempts).

## 10. How in-game controls take a ship action

- **Decision**: Each action is a `<form>` posting to the `takeShipAction` Server Action, bound to
  the action's ID. The same action is also reachable as `POST`/`PUT`/`DELETE` on its address via
  `app/(ship)/[area]/[target]/route.ts`. Both are thin adapters over `takeAction(playerId,
actionId)` (§4), which owns all validation and state changes. The route handler first maps
  `(method, address)` to an action with `findActionByAddress` (404/405).
- **Rationale**: Server Actions are the constitution's preferred mutation path (II). They work
  from the keyboard and before hydration, give pending state via `useFormStatus`, and can call
  `refresh()` so every server-rendered part of the shell updates. The route handler exists
  because each action has a request type and an address (FR-012/013), and REST methods on that
  address are their natural expression. It adds no UI logic.
- **Alternatives considered**: Client `fetch` to the route handler plus `router.refresh()`.
  Rejected: needs larger client components (6 instead of 3), doesn't work before hydration, and
  duplicates the pending/error handling `useActionState` already provides. Separate
  `/api/game` and `/api/game/legs` handlers for start and continue: rejected for the same reason.

## 11. Where the latest result is shown

- **Decision**: `LatestResult` in the ship shell renders the most recent attempt **from server
  state** (`GameView.attempts`), not from the Server Action's return value. Actions return only
  errors.
- **Rationale**: The result survives reloads, device switches, and moving between areas (FR-004,
  SC-011), and a repeated request naturally re-shows the stored result (FR-026). There's one source
  of truth for results.
- **Alternatives considered**: Rendering the result from `useActionState`. Rejected: lost on
  reload, and duplicates what the log already stores.

## 12. Waiting states during generation (FR-035)

- **Decision**: `PendingButton` (client, `useFormStatus`) replaces its label with
  `GeneratingNotice` and blocks resubmission while its form is pending. The new-game,
  take-action, and continue forms all use it. `(ship)/loading.tsx` covers navigation between
  areas only. When `GameView.isEvaluating` is true (another tab's action is being generated),
  area pages replace their controls with a notice.
- **Rationale**: Generation happens inside mutations, not navigations, so `loading.tsx` alone
  would never show during the 8–15 s waits. One small client leaf covers all three forms.
- **Alternatives considered**: A global overlay driven by client state. Rejected: needs a
  provider and more client code for the same effect.

## 13. Error handling in the UI

- **Decision**: Expected failures (`generation-failed`, `busy`, `not-allowed`, `invalid-input`)
  are **returned** from Server Actions as `FormState` and rendered by `StatefulForm` as
  `GenerationError`, with a retry that resubmits the same form. Unexpected exceptions fall
  through to `app/error.tsx`, which in Next 16 receives `retry` (not `reset`).
- **Rationale**: FR-034 needs a friendly message and a retry without losing progress. Returning
  values keeps these out of error boundaries, which would unmount the page.
- **Alternatives considered**: Throwing and catching with `error.tsx` or `catchError`. Rejected
  for expected errors: loses surrounding UI and the form's context.

## 14. Auth gating

- **Decision**: `proxy.ts` does an optimistic cookie check. It redirects signed-out requests for
  ship routes to `/auth/login?next=<path>`, and returns `401` JSON for ship-action requests.
  Every page and Server Action also calls `requirePlayer()`, and the route handler calls
  `getOptionalPlayer()` (§1); that is the real check. After sign-in the player is sent to `next`,
  validated as a same-origin path, which covers the session-expiry edge case.
- **Rationale**: Matches the Next 16 authentication guide: proxy for optimistic redirects only,
  authorization close to the data. Layout-only checks aren't enough, because layouts don't
  re-render on every navigation.
- **Alternatives considered**: `unauthorized()` with `unauthorized.tsx`. Rejected: experimental
  (`authInterrupts` flag).

## 15. Area routing

- **Decision**: One dynamic segment, `app/(ship)/[area]/page.tsx`, validated with `isAreaSlug()`
  against the hand-authored `AREAS` constant. Unknown slugs call `notFound()` (FR-041).
- **Rationale**: Areas are fixed but share an identical page, so one file avoids duplication.
  Static segments (`log`, `auth`, `api`) take precedence over `[area]`, so area slugs and
  generated action slugs must avoid them. `RESERVED_SLUGS` is enforced in `AREAS` (unit test)
  and when validating generated action sets.
- **Alternatives considered**: A static folder per area (duplicate pages).
  `generateStaticParams` with `dynamicParams = false` (pages are per-player and dynamic anyway).

## 16. Win, loss, and new-game screens

- **Decision**: `/` renders by game state: signed out → premise with sign-in/sign-up links;
  no game → premise and start; in progress or between legs → recap, resume link, and "Start
  over"; won → `VictoryScreen`; lost → `LossScreen`. Ship pages of a finished game stay viewable
  read-only, with a link to `/`.
- **Rationale**: Fewer routes. One form satisfies FR-006 (start from home and from end screens).
  A finished game stays viewable until it's replaced (spec Assumptions).
- **Alternatives considered**: Separate `/victory` and `/game-over` routes. Rejected: routes
  valid in only one state, each needing its own guard.

## 17. Styling tokens

- **Decision**: A "rust bucket held together by duct tape" style, specified in
  [visual-style.md](./visual-style.md). Galvanized-steel neutrals with oxidized orange (`rust`) as
  the only accent, duct-tape and hazard-yellow details, and an amber-on-black diagnostic screen as
  the one space-themed surface. Fonts: Bungee (display), Permanent Marker (tape labels), Atkinson
  Hyperlegible (body), Share Tech Mono (readouts), loaded with `next/font/google` in place of Geist.
  All tokens have light and dark values and live in `@theme` in `app/globals.css`.
- **Rationale**: The premise is silly, so the jokes go into the tape labels and copy, while
  layout, contrast, and body text stay readable. Constitution III requires tokens in `@theme` and
  light/dark support. Dark mode puts dark text on `rust` (`on-rust`) to keep button contrast.
- **Alternatives considered**: Keeping the default create-next-app tokens (no semantic colors for
  outcomes). A glossy "space game" look (starfields, neon; rejected as off-premise). Rubik Dirt
  (goofier) and Saira Stencil One (more spaceship) as the display face.

## 18. Accessibility and keeping the answer hidden

- **Decision**: `LatestResult` is a `role="status"` live region. Its `OutcomeTag` says "Fixed",
  "Still broken", or "Game over" in text. Tried actions render as text with a "Tried" tag and no
  button, rather than as disabled buttons. Components receive only view types, which have no
  correct-action field.
- **Rationale**: FR-042 requires text, not color alone. Disabled buttons are skipped by keyboard
  focus and announced inconsistently, and the spec says tried actions aren't offered (FR-026).
  Anything passed to a client component is serialized to the browser, so leaving the field out of
  the view types makes leaking the answer (FR-019, SC-007) a type error rather than a review item.
- **Alternatives considered**: `aria-disabled` buttons. Rejected: they present a control that
  can't be used.

## 19. Testing strategy

- **Decision**:
  - Unit (Vitest, node env): every `lib/game/` module. This covers correctness decisions, state
    derivation, validators (action-set counts, uniqueness, reserved slugs, leg-distinct correct
    action), and prompt building (snapshot the message structure and check that no player text
    is included).
  - DB integration (Vitest against `docker compose` Postgres, a fresh schema per test file):
    constraints (one game per player, one active scenario, one attempt per action per scenario,
    cross-game FK rejection) and the busy claim (concurrent claim → one wins, stale claim reclaimable).
  - Service tests: `gameService` with a fake `TextGenerator` covering failure → nothing written,
    repeat → no generation, win/loss transitions, and replacement keeping the old game when
    generation fails.
  - Component (Vitest, jsdom, React Testing Library): every client component
    (`StatefulForm`, `PendingButton`, `AreaNavLink`) and synchronous presentational components,
    asserting on roles, text, and labels. `vite-tsconfig-paths` resolves the `@/` alias.
  - E2E (Playwright, `AI_PROVIDER=fake`): pages and flows, using the fixture in
    [contracts/llm-generation.md](./contracts/llm-generation.md#fake-generator) (known correct,
    game-over, and failing actions). The flows are listed in [quickstart.md](./quickstart.md).
  - Scripts: `typecheck` (`tsc --noEmit`), `test`, `test:e2e`.
- **Rationale**: This covers constitution Principle V. The Next 16 Vitest guide notes that async
  Server Components can't be unit-tested, so pages are covered by Playwright. The fake provider
  makes E2E deterministic.
- **Alternatives considered**: Jest (the constitution names Vitest).

## 20. Local environment

- **Decision**: `docker-compose.yml` runs `postgres:17` with `something_borrowed` (dev) and
  `something_borrowed_test` databases. Env vars: `DATABASE_URL`, `TEST_DATABASE_URL`,
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`,
  `AI_PROVIDER` (`openrouter` | `fake`, defaults to `openrouter`; `fake` is refused when
  `NODE_ENV=production`). Env is validated with Zod at startup (`lib/env.ts`).
