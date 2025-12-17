// app\api\login\route.ts
import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 400 });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return NextResponse.json({ error: "Invalid password" }, { status: 400 });
        }

        // create JWT
        const token = createToken({
            userId: user.id,
            role: user.role,
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
