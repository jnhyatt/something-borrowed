"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AreaNavLinkProps = { href: string; children: string };

export function AreaNavLink({ href, children }: AreaNavLinkProps) {
  const isCurrent = usePathname() === href;

  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      className={`rounded-plate block border-2 px-3 py-2 font-mono text-sm tracking-[0.08em] uppercase ${
        isCurrent
          ? "border-rust-deep bg-rust text-on-rust"
          : "border-panel-edge bg-panel text-ink hover:border-rust"
      }`}
    >
      {children}
    </Link>
  );
}
