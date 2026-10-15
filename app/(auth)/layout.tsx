import { redirect } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { getOptionalPlayer } from "@/lib/auth/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getOptionalPlayer()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Panel className="px-6 py-8">{children}</Panel>
    </main>
  );
}
