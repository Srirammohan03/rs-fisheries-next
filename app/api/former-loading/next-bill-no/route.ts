// app/api/former-loading/next-bill-no/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const currentYear = new Date().getFullYear().toString().slice(-2); // "25"

        // Find the latest bill number (any year)
        const last = await prisma.formerLoading.findFirst({
            orderBy: { createdAt: "desc" },
        });

        let nextNumber = 1;

        if (last?.billNo) {
            // Extract number from: RS-Farmer-25-9999 or RS-Farmer-24-12345
            const match = last.billNo.match(/RS-F-\d{2}-(\d+)/);
            if (match) {
                nextNumber = Number(match[1]) + 1;
            }
        }

        // Format: 0001 to 9999 → padded, 10000+ → natural
        const displayNumber =
            nextNumber <= 9999 ? String(nextNumber).padStart(4, "0") : String(nextNumber);

        const billNo = `RS-F-${currentYear}-${displayNumber}`;

        return NextResponse.json({
            success: true,
            billNo,
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({
            billNo: `RS-F-${new Date().getFullYear().toString().slice(-2)}-0001`,
        });
    }
}