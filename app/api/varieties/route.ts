import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const varieties = await prisma.fishVariety.findMany({
            orderBy: { code: "asc" },
        });

        return NextResponse.json({ success: true, varieties });
    } catch (error) {
        console.error("Failed to fetch varieties:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch varieties" },
            { status: 500 }
        );
    }
}
