import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { AuthTokenPayload } from "./auth";

export function withAuth(handler: Function) {
  return async (req: NextRequest, context: any) => {
    const cookieToken = req.cookies.get("session")?.value;

    const headerToken = req.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    const token = cookieToken || headerToken;

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    let decoded: AuthTokenPayload;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
    } catch {
      return new Response("Invalid token", { status: 401 });
    }

    (req as any).user = {
      id: decoded.userId,
      employeeId: decoded.employeeId,
      role: decoded.role,
      email: decoded.email,
    };

    return handler(req, context);
  };
}
