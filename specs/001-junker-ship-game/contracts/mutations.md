# Contract: Mutations

Every mutation is a thin adapter: authenticate with `requirePlayer()`, call one service function
from [service-api.md](service-api.md), map its result. No game rules live here.

## Shared result type (Server Actions)

```ts
type FormState =
  | { status: "idle" }
  | { status: "error"; code: MutationErrorCode; message: string };

type MutationErrorCode =
  | "generation-failed" // FR-034: "Can't get a response from OpenRouter, try again later"
  | "busy" // another action is still being evaluated
  | "not-allowed" // no game, game over, between legs, or action unknown/already tried
  | "invalid-input"; // auth forms only
```

On success, a Server Action calls `refresh()` (from `next/cache`) or `redirect()`, and returns
`{ status: "idle" }`. The resulting UI comes from re-rendered server state, never from the return
value ([research §11](../research.md#11-where-the-latest-result-is-shown)).

## Server Actions — `lib/actions/game.ts`

| Action           | Signature                                                                                                        | Service call                     | On success              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------- |
| `startNewGame`   | `(prev: FormState, form: FormData) => Promise<FormState>`                                                        | `startGame(playerId)`            | `redirect("/piloting")` |
| `takeShipAction` | `(actionId: string, prev: FormState, form: FormData) => Promise<FormState>` (bound with `.bind(null, actionId)`) | `takeAction(playerId, actionId)` | `refresh()`             |
| `continueTrip`   | `(prev: FormState, form: FormData) => Promise<FormState>`                                                        | `startNextLeg(playerId)`         | `refresh()`             |

`actionId` arrives from the client and is treated as `unknown` input; the service rejects ids
not in the player's game.

## Server Actions — `lib/actions/auth.ts`

| Action    | Fields                       | On success              |
| --------- | ---------------------------- | ----------------------- |
| `signUp`  | `email`, `password`, `next?` | `redirect(next ?? "/")` |
| `signIn`  | `email`, `password`, `next?` | `redirect(next ?? "/")` |
| `signOut` | —                            | `redirect("/")`         |

`next` must be a same-origin path starting with `/` (not `//`); otherwise it is ignored.
Error messages don't reveal whether an email is registered.

## HTTP endpoint — `app/(ship)/[area]/[target]/route.ts`

Ship actions by address. Request type → method: **do** → `POST`, **set** → `PUT`,
**remove** → `DELETE` (`lib/game/requestTypes.ts`). No request body. Auth: the session cookie
(same as the pages).

The handler resolves `(method, "/{area}/{target}")` to an action id via the service, then calls
`takeAction`. All responses are JSON.

| Status | When                                                            | Body                                                        |
| ------ | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `200`  | Attempt recorded, or repeat of an already-tried action (FR-026) | `{ outcome, text, leg, repeated }`                          |
| `303`  | `GET`                                                           | Redirect to `/{area}`                                       |
| `401`  | Not signed in                                                   | `{ error: "unauthenticated", message }`                     |
| `404`  | Unknown area, or no action at this address                      | `{ error: "not-found", message }`                           |
| `405`  | Address has an action, but with a different method              | `{ error: "method-not-allowed", message }` + `Allow` header |
| `409`  | `busy` or `not-allowed`                                         | `{ error: code, message }`                                  |
| `503`  | `generation-failed`                                             | `{ error: "generation-failed", message }`                   |

`outcome` is `"resolved" | "continued" | "game-over"`. `repeated: true` means nothing new was
recorded. No response ever includes the correct action (FR-019).
