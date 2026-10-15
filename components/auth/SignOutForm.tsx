import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/actions/auth";

export function SignOutForm() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        Sign out
      </Button>
    </form>
  );
}
