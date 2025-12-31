// app\api\login\route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // create JWT
    const token = createToken({
      userId: user.id,
      employeeId: user.employeeId,
      role: mapDesignationToRole(user.employee.designation),
      email: user.email,
    });

    const res = NextResponse.json({ message: "Login successful" });

    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function mapDesignationToRole(designation?: string) {
  const map: Record<string, string> = {
    Admin: "admin",
    Finance: "finance",
    Clerk: "clerk",
    Sales: "sales",
    Supervisor: "supervisor",
    Executive: "executive",
    Documentation: "documentation",
    Partner: "partner",
    "Senior Executive": "seniorExecutive",
    "Junior Executive": "juniorExecutive",
    Others: "others",
  };

  return map[designation ?? ""] ?? "others";
}
