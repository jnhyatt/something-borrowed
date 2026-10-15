import Link from "next/link";
import { signIn, signUp } from "@/lib/actions/auth";
import { StatefulForm } from "@/components/ui/StatefulForm";

type AuthMode = "login" | "signup";

const MODES = {
  login: {
    title: "Sign in",
    action: signIn,
    submitLabel: "Sign in",
    pendingLabel: "Checking your papers…",
    passwordAutoComplete: "current-password",
    switchPrompt: "No account yet?",
    switchLabel: "Sign up",
    switchPath: "/auth/signup",
  },
  signup: {
    title: "Sign up",
    action: signUp,
    submitLabel: "Sign up",
    pendingLabel: "Signing the loan papers…",
    passwordAutoComplete: "new-password",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchPath: "/auth/login",
  },
} as const;

const INPUT_CLASSES =
  "rounded-plate border-2 border-panel-edge bg-hull px-3 py-2 text-base text-ink";

type AuthFormProps = { mode: AuthMode; next?: string };

export function AuthForm({ mode, next }: AuthFormProps) {
  const config = MODES[mode];
  const switchHref = next
    ? `${config.switchPath}?${new URLSearchParams({ next })}`
    : config.switchPath;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl">{config.title}</h1>
      <StatefulForm
        action={config.action}
        submitLabel={config.submitLabel}
        pendingLabel={config.pendingLabel}
      >
        {next && <input type="hidden" name="next" value={next} />}
        <label className="flex flex-col gap-1">
          <span className="font-mono text-sm tracking-[0.08em] uppercase">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className={INPUT_CLASSES}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-sm tracking-[0.08em] uppercase">
            Password
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete={config.passwordAutoComplete}
            className={INPUT_CLASSES}
          />
        </label>
      </StatefulForm>
      <p className="text-ink-muted">
        {config.switchPrompt}{" "}
        <Link href={switchHref} className="text-rust underline">
          {config.switchLabel}
        </Link>
      </p>
    </div>
  );
}
