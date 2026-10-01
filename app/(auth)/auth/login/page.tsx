import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in · Something Borrowed" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/auth/login">) {
  const { next } = await searchParams;
  return (
    <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
  );
}
