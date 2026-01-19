import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const currentYear = new Date().getFullYear().toString().slice(-2);

        const lastRecord = await prisma.agentLoading.findFirst({
            orderBy: { createdAt: "desc" },
        });

        let nextNumber = 1;

        if (lastRecord?.billNo) {
            const match = lastRecord.billNo.match(/RS-A-\d{2}-(\d+)/);
            if (match) {
                nextNumber = Number(match[1]) + 1;
            }
        }

        const displayNumber = nextNumber <= 9999
            ? String(nextNumber).padStart(4, "0")
            : String(nextNumber);

        const newBillNo = `RS-A-${currentYear}-${displayNumber}`;

        return NextResponse.json({
            success: true,
            billNo: newBillNo,
            nextNumber,
            preview: `Next bill: ${newBillNo}`,
        });

    } catch (error) {
        console.error("Error generating agent bill no:", error);
        return NextResponse.json(
            { success: false, message: "Failed to generate bill number" },
            { status: 500 }
        );
    }
}