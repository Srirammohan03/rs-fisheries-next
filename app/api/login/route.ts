// app\api\login\route.ts
import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const employee = await prisma.employee.findUnique({
      where: { email },
      include: {
        user: true,
      },
    });

    if (!employee || !employee.user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    const valid = await bcrypt.compare(password, employee.user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // create JWT
    const token = createToken({
      userId: employee.user.id,
      employeeId: employee.id,
      role: mapDesignationToRole(employee.designation),
      email: employee.email,
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
