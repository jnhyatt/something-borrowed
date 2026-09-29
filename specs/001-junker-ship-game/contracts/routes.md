# Contract: Page Routes

Every page is a Server Component. "Player" means `requirePlayer()` succeeded; see
[service-api.md](service-api.md) for `GameView` states.

| Route          | File                              | Access                       |
| -------------- | --------------------------------- | ---------------------------- |
| `/`            | `app/page.tsx`                    | Public                       |
| `/auth/login`  | `app/(auth)/auth/login/page.tsx`  | Signed out (signed-in → `/`) |
| `/auth/signup` | `app/(auth)/auth/signup/page.tsx` | Signed out (signed-in → `/`) |
| `/{area}`      | `app/(ship)/[area]/page.tsx`      | Player                       |
| `/log`         | `app/(ship)/log/page.tsx`         | Player                       |
| anything else  | `app/not-found.tsx`               | Public                       |

Signed-out requests for Player routes redirect to `/auth/login?next=<path>` (spec US4 #1).

## `/`

| Game state                     | Renders                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed out                     | `Premise`, links to sign in / sign up                                                                                                                                  |
| `none`                         | `Premise`, `NewGameForm` ("Borrow the junker")                                                                                                                         |
| `in-progress` / `between-legs` | Short premise, `TripProgress`, "Back to the ship" link to `/piloting`, `NewGameForm` labelled "Start over" with text noting the current game will be replaced (FR-007) |
| `won`                          | `VictoryScreen` (final result text, link to `/log`), `NewGameForm`                                                                                                     |
| `lost`                         | `LossScreen` (final result text, link to `/log`), `NewGameForm`                                                                                                        |

## Ship shell — `(ship)/layout.tsx`

Wraps `/{area}` and `/log`. With no game, renders `NoGamePrompt` (with `NewGameForm`) instead of
the shell (US3 #4). Otherwise renders, in order:

1. `ShipHeader`: game title, `TripProgress` ("Leg 2 of 3"), link to `/log`, `SignOutForm`.
2. `SymptomsPanel`: active scenario's symptom text (hidden for `won`/`lost`; for
   `between-legs`, shows the resolved scenario's symptoms marked "Fixed").
3. `LatestResult`: most recent attempt of the game with its `OutcomeTag`. In `between-legs`
   it includes `ContinueForm`. In `won`/`lost` it includes a link to `/`.
4. `AreaNav`: links to every area; the current one has `aria-current="page"` (FR-040).
5. Page content.

## `/{area}`

- `area` not in `AREAS` → `notFound()` (FR-041).
- Renders `AreaHeader` (name, one-line flavor description) and `ActionList` of this area's
  actions (FR-039). Each `ActionItem` shows the label and either:
  - a `PendingButton` form bound to `takeShipAction(actionId)` (untried, `in-progress`), or
  - a "Tried" `OutcomeTag` with no control (tried this scenario, FR-026), or
  - label only (`between-legs`, `won`, `lost`, or while `isEvaluating`).
- While `isEvaluating` (another tab's action is being generated), a notice replaces the
  controls: "Your last action is still being worked out — reload in a moment."

## `/log`

`ShipLog`: every attempt in order (FR-031), grouped by leg, each `LogEntry` showing the action
label, area, `OutcomeTag`, and result text. Empty state: "Nothing's gone wrong yet. Give it a
minute."

## Special files

- `app/not-found.tsx`: in-story 404 ("That part fell off years ago") with link to `/`.
- `app/(ship)/loading.tsx`: in-story loading for area navigation.
- `app/error.tsx`: generic failure with a `retry()` button and a link to `/`.
