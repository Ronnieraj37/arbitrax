import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const protectedPaths = ["/dashboard", "/billing"];
  const isProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path),
  );

  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL("/auth/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|data).*)"],
};
