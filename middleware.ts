import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "./lib/supabaseMiddleware";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow access to login page and auth callback without authentication
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthCallback = request.nextUrl.pathname === "/auth/callback";
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/icon-") ||
    request.nextUrl.pathname === "/manifest.json" ||
    request.nextUrl.pathname === "/sw.js" ||
    request.nextUrl.pathname === "/favicon.ico";

  if (isPublicAsset || isApi || isAuthCallback) {
    return response;
  }

  if (!user && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPage) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
