import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export async function GET() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 200 });

    const payload: any = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        employee: {
          select: {
            fullName: true,
            email: true,
            designation: true,
            photo: true,
          },
        },
      },
    });

    return NextResponse.json({ user }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
