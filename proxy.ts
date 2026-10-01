import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { isAreaSlug } from "@/lib/game/areas";

export function proxy(request: NextRequest) {
  const [firstSegment] = request.nextUrl.pathname.split("/").filter(Boolean);
  const isShipRoute = firstSegment === "log" || isAreaSlug(firstSegment);
  if (!isShipRoute || getSessionCookie(request)) return NextResponse.next();

  // Ship actions are POST/PUT/DELETE requests on an action's address.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json(
      { error: "unauthenticated", message: "Sign in to take ship actions." },
      { status: 401 },
    );
  }

  const login = new URL("/auth/login", request.url);
  login.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(login);
}

export const config = {
  // Skip Next internals, the auth API and auth pages, and files with an extension.
  matcher: ["/((?!_next/|api/|auth/|.*\\..*).*)"],
};
