# LLM Generation Contract (OpenRouter)

There are three generation kinds. Each is one chat-completions call with a system prompt (tone,
rules), a user message built by `lib/game/prompts.ts` from stored game data only (FR-036), and a
strict JSON Schema `response_format`. The server validates every response. Any failure is a
`GenerationError` (see [research.md §7](../research.md#7-openrouter-integration)).

Shared system rules: comedic, light-hearted, suitable for all ages (FR-037). Premise: the player
forgot their friend's wedding, their ship is in the shop, and they borrowed their uncle's junker.
Ship areas are fixed: piloting, engine room, life support.

## 1. Action set (game start)

**Input**: the list of areas (slug and name). Minimum counts.

**Output schema**

```json
{
  "actions": [
    {
      "area": "engine-room",
      "slug": "coolant-valve",
      "verb": "set",
      "label": "Crank the coolant valve"
    }
  ]
}
```

**Validation** (FR-012–FR-014, FR-033):

- `area` is a known area. `verb` ∈ do/set/remove. `slug` matches `^[a-z0-9]+(-[a-z0-9]+)*$`,
  is ≤48 chars, and isn't in `RESERVED_SLUGS`. `label` is 1–80 chars.
- `(verb, area, slug)` is unique across the set.
- ≥3 actions per area, ≥10 in total, ≤30 in total.
- Denylist/length checks on all text.

The server assigns `position` (in response order within each area) and a prompt key (`A1`…`An`).

## 2. Scenario (leg 1 at game start; legs 2–3 on continue)

**Input**: the action list with keys, and for each earlier leg its symptoms, correct action key,
attempts in order (action key, outcome, result text). Also the leg number.

**Output schema**

```json
{
  "symptoms": "The cabin smells like burnt toast and the gravity keeps hiccuping…",
  "correctActionKey": "A7"
}
```

**Validation** (FR-016–FR-018):

- `correctActionKey` exists and isn't the correct action of an earlier leg.
- `symptoms` is 40–800 chars. It doesn't contain the correct action's label or slug, or its area's
  name or slug (case-insensitive, FR-017).
- Denylist check.

## 3. Attempt result

**Input**: the full history (as above, including the current scenario's symptoms and correct
action key), the action just taken, `isCorrect` (decided by the server, FR-021), and
`wrongAttemptsThisScenario` (N, before this attempt).

Instructions vary with `isCorrect`:

- **Correct**: write a success text that riffs on the actions already tried this scenario
  (FR-022).
- **Wrong**: write a consequence that hints at the correct action, more directly as N grows
  (FR-024). Convey the ship's condition. Decide `isGameOver` using the whole history. Don't
  punish cautious or diagnostic actions. Reserve game over for reckless actions or ones that
  repeatedly ignore hints (FR-023, FR-025).

**Output schema**

```json
{ "resultText": "…", "isGameOver": false }
```

**Validation**: `resultText` is 20–1200 chars and passes the denylist. `isGameOver` is a boolean
(required even for a correct action; ignored when `isCorrect`). For wrong actions, `resultText`
must not contain the correct action's slug (the hint should be in-story, not a literal answer).

## Fake generator

Setting `AI_PROVIDER=fake` selects `lib/ai/fakeGenerator.ts`. It's refused when
`NODE_ENV=production`. It never calls the network, and its output still goes through the same
validation as real output.

- **Action set**: a fixed set of 12 actions, 4 per area. The fixture is exported so tests can
  refer to actions by name.
- **Scenarios**: legs 1–3 always use the same fixed correct actions, one in each area:
  `PUT /engine-room/coolant-valve`, `DELETE /life-support/air-filter`, and
  `POST /piloting/reboot-nav-computer`.
- **Results**: correct → a fixed success text. Wrong → a fixed hint text, with `isGameOver`
  false except for one designated game-over action:
  `DELETE /engine-room/reactor-shielding`.
- **Failure**: generating a result for `POST /life-support/jiggle-the-handle` always throws a
  `GenerationError`, so tests can exercise the error-and-retry path deterministically.
