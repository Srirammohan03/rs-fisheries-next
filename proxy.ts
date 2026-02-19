// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

/* ---------------- PUBLIC PAGES ---------------- */
const PUBLIC_PAGES = ["/login"];

/* ---------------- PUBLIC APIs ---------------- */
const PUBLIC_APIS = [
  "/api/login",
  "/api/logout",
  "/api/me",
];

/* ---------------- HELPERS ---------------- */
function isPublicPage(pathname: string) {
  return PUBLIC_PAGES.some((p) => pathname.startsWith(p));
}

function isPublicApi(pathname: string) {
  return PUBLIC_APIS.some((p) => pathname.startsWith(p));
}

/* ================= MAIN ================= */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  /* ===== ALLOW PWA + STATIC FILES ===== */
  if (
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }
  /* ===== NEVER BLOCK API ===== */
  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  /* ===== ROOT ===== */
  if (pathname === "/") {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  /* ===== LOGIN PAGE ===== */
  if (isPublicPage(pathname)) {
    if (!token) return NextResponse.next();

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } catch {
      return NextResponse.next();
    }
  }

  /* ===== PROTECTED ROUTES ===== */
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|manifest|icons|sw.js).*)",],
};
