# Component Hierarchy

Part of [plan.md](plan.md). Solid arrows mean "renders". Dashed-border nodes are Client
Components; everything else is a Server Component. Shaded nodes are route files.

```mermaid
flowchart TD
  Root["app/layout.tsx"]

  %% ---------- Routes ----------
  Root --> Home["page.tsx — /"]
  Root --> AuthLayout["(auth)/layout.tsx"]
  Root --> ShipLayout["(ship)/layout.tsx"]
  Root --> NotFound["not-found.tsx"]

  %% ---------- Auth ----------
  AuthLayout --> Login["auth/login/page.tsx"]
  AuthLayout --> Signup["auth/signup/page.tsx"]
  Login --> AuthForm
  Signup --> AuthForm
  AuthForm --> StatefulForm

  %% ---------- Home ----------
  Home --> Premise
  Home --> VictoryScreen
  Home --> LossScreen
  VictoryScreen --> EndScreen
  LossScreen --> EndScreen
  Home --> NewGameForm
  EndScreen --> NewGameForm
  NewGameForm --> StatefulForm

  %% ---------- Ship shell ----------
  ShipLayout --> NoGamePrompt
  NoGamePrompt --> NewGameForm
  ShipLayout --> ShipShell
  ShipShell --> ShipHeader
  ShipHeader --> TripProgress
  ShipHeader --> SignOutForm
  ShipShell --> SymptomsPanel
  ShipShell --> LatestResult
  LatestResult --> OutcomeTag
  LatestResult --> ContinueForm
  ContinueForm --> StatefulForm
  ShipShell --> AreaNav
  AreaNav --> AreaNavLink
  ShipShell --> Area["[area]/page.tsx"]
  ShipShell --> Log["log/page.tsx"]

  %% ---------- Area ----------
  Area --> AreaHeader
  Area --> ActionList
  ActionList --> ActionItem
  ActionItem --> OutcomeTag
  ActionItem --> StatefulForm

  %% ---------- Log ----------
  Log --> ShipLog
  ShipLog --> LogEntry
  LogEntry --> OutcomeTag

  %% ---------- Form wrapper (shared) ----------
  StatefulForm --> PendingButton
  StatefulForm --> GenerationError
  PendingButton --> GeneratingNotice

  classDef client stroke-dasharray: 5 5,stroke-width:2px;
  classDef route fill:#eef,stroke:#669;
  class StatefulForm,PendingButton,AreaNavLink client;
  class Root,Home,AuthLayout,ShipLayout,NotFound,Login,Signup,Area,Log route;
```

`StatefulForm` takes a Server Action and children (fields) from its Server Component parent, and
renders the error from `useActionState` as `GenerationError`. That's how `NewGameForm`,
`ContinueForm`, `ActionItem`, and `AuthForm` stay Server Components. `SignOutForm` is a plain
`<form>` with no pending state. Shared primitives (`Button`, `Panel`, `Badge`) are omitted.
