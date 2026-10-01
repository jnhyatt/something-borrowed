import Link from "next/link";
import { SignOutForm } from "@/components/auth/SignOutForm";

export function ShipHeader() {
  return (
    <header className="border-panel-edge flex flex-wrap items-center justify-between gap-3 border-b-2 pb-3">
      <Link href="/" className="font-display text-ink text-xl">
        Something Borrowed
      </Link>
      <SignOutForm />
    </header>
  );
}
