
// app/api/admin/users/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";

export const GET = withAuth(async () => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            employee: {
                select: {
                    fullName: true,
                    designation: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
}, "teams.view");

export const PUT = withAuth(async (req: Request) => {
    const { userId, role } = await req.json();

    if (!userId || !role)
        return NextResponse.json({ error: "Missing data" }, { status: 400 });

    await prisma.user.update({
        where: { id: userId },
        data: { role },
    });

    return NextResponse.json({ success: true });
}, "teams.view");
