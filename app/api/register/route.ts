// import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const { email, password, name, role } = await req.json();

    const existing = await prisma.user.findUnique({ where: { employeeId: email } });

    if (existing) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            email: email,
            employeeId: email,
            password: hashedPassword,
        },
    });


    return NextResponse.json({ success: true, user });
}
