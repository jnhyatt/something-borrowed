import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign up · Something Borrowed" };

export default async function SignupPage({
  searchParams,
}: PageProps<"/auth/signup">) {
  const { next } = await searchParams;
  return (
    <AuthForm
      mode="signup"
      next={typeof next === "string" ? next : undefined}
    />
  );
}
