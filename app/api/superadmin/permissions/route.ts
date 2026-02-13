// app\api\superadmin\permissions\route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";

// GET all permissions
export const GET = withAuth(async () => {
    const roles = await prisma.rolePermission.findMany({
        orderBy: { role: "asc" },
    });

    return NextResponse.json({ roles });    
});


// UPDATE role permissions
export const POST = withAuth(async (req: Request) => {
    const { role, permissions } = await req.json();

    if (!role) return NextResponse.json({ error: "Missing role" }, { status: 400 });

    await prisma.rolePermission.deleteMany({ where: { role } });

    await prisma.rolePermission.createMany({
        data: permissions.map((p: string) => ({ role, permission: p })),
    });

    return NextResponse.json({ success: true });
}, "teams.view");