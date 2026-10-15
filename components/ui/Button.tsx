import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = { variant?: ButtonVariant } & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href">)
  | ({ href?: undefined } & ComponentProps<"button">)
);

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-plate border-b-4 px-4 py-2 font-display uppercase active:translate-y-0.5 active:border-b-2 disabled:pointer-events-none disabled:opacity-60 motion-reduce:active:translate-y-0 motion-reduce:active:border-b-4";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border-rust-deep bg-rust text-on-rust",
  secondary: "border-x-2 border-t-2 border-panel-edge bg-panel text-ink",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className ?? ""}`;

  if (props.href !== undefined) {
    return <Link {...props} className={classes} />;
  }
  return <button type="button" {...props} className={classes} />;
}
