import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { AuthTokenPayload } from "./auth";
import { hasServerPermission } from "./serverPermission";
// import { hasServerPermission } from "./permission";

export function withAuth(handler: Function, requiredPermission?: string) {
  return async (req: NextRequest, context: any) => {
    const cookieToken = req.cookies.get("session")?.value;
    const headerToken = req.headers.get("authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: AuthTokenPayload;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = {
      id: decoded.userId,
      employeeId: decoded.employeeId,
      role: decoded.role,
      email: decoded.email,
    };

    // attach user to req
    (req as any).user = user;

    // 🔐 PERMISSION CHECK (DB BASED)
    if (requiredPermission) {
      const allowed = await hasServerPermission(
        user.role,
        requiredPermission,
        user.id
      );

      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return handler(req, context);
  };
}
