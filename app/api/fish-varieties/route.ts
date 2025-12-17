// app\api\fish-varieties\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const data = await prisma.fishVariety.findMany({
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching varieties:", error);
        return NextResponse.json(
            { success: false, message: "Failed to load varieties" },
            { status: 500 }
        );
    }
}
