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

export async function POST(req: Request) { /* existing */ }

// New DELETE handler
export async function DELETE(req: Request) {
    try {
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json(
                { success: false, message: "Code is required" },
                { status: 400 }
            );
        }

        // Optional: Check if this variety is used in transactions
        // If you have relations (e.g., LoadingItem.varietyCode), you might want to restrict deletion
        // For now, we'll just delete if exists

        const deleted = await prisma.fishVariety.delete({
            where: { code },
        });

        return NextResponse.json({ success: true, data: deleted });
    } catch (error: any) {
        console.error("Failed to delete variety:", error);

        // If foreign key constraint violation (variety in use)
        if (error.code === "P2003") {
            return NextResponse.json(
                { success: false, message: "Cannot delete: Variety is used in transactions" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, message: "Failed to delete variety" },
            { status: 500 }
        );
    }
}