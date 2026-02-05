import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { ROUTE_PERMISSIONS } from "@/lib/routePermissions";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;

  /* ---------------- ROOT REDIRECT ---------------- */
  if (pathname === "/") {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  /* ---------------- PUBLIC ROUTES ---------------- */
  if (isPublicPath(pathname)) {
    if (!token) return NextResponse.next();

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } catch {
      return NextResponse.next();
    }
  }

  /* ---------------- NO TOKEN ---------------- */
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /* ---------------- VERIFY TOKEN ---------------- */
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role: string = payload.role;

  /* ---------------- ADMIN BYPASS ---------------- */
  if (role === "admin") {
    return NextResponse.next();
  }

  /* ---------------- FIND REQUIRED PERMISSION ---------------- */
  const matched = Object.entries(ROUTE_PERMISSIONS).find(([route]) =>
    pathname.startsWith(route)
  );

  if (!matched) {
    return NextResponse.next(); // no permission required
  }

  const requiredPermission = matched[1];

  /* ---------------- CHECK DB PERMISSION ---------------- */
  const has = await prisma.rolePermission.findFirst({
    where: {
      role,
      permission: requiredPermission,
    },
    select: { id: true },
  });

  if (!has) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
