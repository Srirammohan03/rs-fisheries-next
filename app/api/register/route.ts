// app\api\register\route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { email, password, employeeId } = body;

        // validation
        if (!email || !password || !employeeId) {
            return NextResponse.json(
                { error: "email, password and employeeId are required" },
                { status: 400 }
            );
        }

        // check employee exists
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
        });

        if (!employee) {
            return NextResponse.json(
                { error: "Employee not found" },
                { status: 404 }
            );
        }

        // check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 409 }
            );
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                employeeId: employee.id,
            },
        });

        return NextResponse.json(
            {
                message: "User registered successfully",
                user: {
                    id: user.id,
                    email: user.email,
                    employeeId: user.employeeId,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("REGISTER_ERROR:", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
