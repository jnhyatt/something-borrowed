# Service Contract

What `lib/server/*` and `lib/auth/session.ts` provide to pages, Server Actions, and the route
handler ([mutations.md](mutations.md)). All modules are `server-only`.

## Types (`lib/game/types.ts`)

```ts
type AreaSlug = "piloting" | "engine-room" | "life-support";
type RequestType = "do" | "set" | "remove";

type ActionView = {
  id: string;
  label: string;
  requestType: RequestType;
  area: AreaSlug;
  address: string; // `/${area}/${slug}`
  isTriedThisScenario: boolean;
};

type AttemptView = {
  order: number; // attempts.seq
  leg: 1 | 2 | 3;
  actionLabel: string;
  area: AreaSlug;
  outcome: "resolved" | "continued" | "game-over";
  text: string;
};

type GameView =
  | { status: "none" }
  | {
      status: "in-progress" | "between-legs" | "won" | "lost";
      leg: 1 | 2 | 3;
      symptoms: string; // active scenario, or the most recently resolved one
      actions: ActionView[]; // ordered by area (AREAS order), then position
      attempts: AttemptView[]; // oldest first
      isEvaluating: boolean; // busy claim held and not stale
    };

type ServiceResult<T = void> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "generation-failed" | "busy" | "not-allowed" | "invalid-input";
    };
```

The DB enums use snake_case (`in_progress`, `game_over`). `gameRepo` maps them to these
hyphenated view values at the boundary.

The server-only domain types (`Game`, `Scenario` with `correctActionId`, and so on) never appear
in any of the return types below.

## Functions

| Function                                         | Returns                                                                                      | Notes                                                                                                                                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requirePlayer()`                                | `{ playerId }`                                                                               | Reads the Better Auth session. Otherwise calls `redirect("/auth/login")`. Route handlers use `getOptionalPlayer()` so they can return 401 JSON.                                                                                     |
| `getOptionalPlayer()`                            | `{ playerId } \| null`                                                                       |                                                                                                                                                                                                                                     |
| `getGameView(playerId)`                          | `GameView`                                                                                   | One read of the game + actions + scenarios + attempts. Pure `toGameView` does the derivation.                                                                                                                                       |
| `startGame(playerId)`                            | `ServiceResult`                                                                              | Generates the action set, then scenario 1. Then it replaces any existing game in one transaction ([research §5](../research.md#5-starting--replacing-a-game-fr-006-fr-007-fr-011)). `busy` if the existing game holds a live claim. |
| `takeAction(playerId, actionId: unknown)`        | `ServiceResult<{ outcome, text, leg, repeated }>`                                            | See the check order below.                                                                                                                                                                                                          |
| `findActionByAddress(playerId, method, address)` | `{ actionId } \| { error: "not-found" } \| { error: "method-not-allowed"; allow: string[] }` | `address` = `/${area}/${slug}`. `not-found` also covers "no game".                                                                                                                                                                  |
| `startNextLeg(playerId)`                         | `ServiceResult`                                                                              | Only valid in status `between-legs`. Otherwise `not-allowed`. Claims busy, generates, and inserts the scenario. This is also the retry path.                                                                                        |
| `signUp` / `signIn` / `signOut`                  | `ServiceResult`                                                                              | Wrap `auth.api.*`. The `nextCookies()` plugin sets cookies from Server Actions. `invalid-input` for bad credentials, with a message that doesn't reveal whether the email exists.                                                   |

### `takeAction` check order

1. `actionId` isn't a string, or isn't an action in this player's game → `not-allowed`.
2. Game `won`/`lost`, or no active scenario (between legs) → `not-allowed`.
3. An attempt already exists for (active scenario, action) → `ok`, `repeated: true`, the stored
   outcome and text. Nothing is written and nothing is generated (FR-026).
4. Claim `busy_since`. If it fails → `busy`.
5. `decideAttempt` → correct? Build the prompt → generate the result → validate. On any failure →
   release the claim → `generation-failed` (FR-027).
6. Commit: verify the claim token, insert the attempt (`seq = max + 1`), then either resolve the
   scenario (and set `won` on leg 3) or set `lost` on game over, and release the claim.
   If the claim token doesn't match → `generation-failed`.

Returned `outcome` uses the view spelling (`"game-over"`). `leg` is the leg the attempt belonged to.

## Fake generator hooks for e2e

With `AI_PROVIDER=fake`, generation is deterministic. The fixture is described in
[llm-generation.md](./llm-generation.md#fake-generator). It includes a known correct action per
leg, a known game-over action, and a known action whose result generation always fails.
