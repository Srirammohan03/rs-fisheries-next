// app/api/client-loading/next-bill-no/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const currentYear = new Date().getFullYear().toString().slice(-2); // "25"


        const last = await prisma.clientLoading.findFirst({
            orderBy: { createdAt: "desc" },
        });
        let nextNumber = 1;

        if (last?.billNo) {
            const match = last.billNo.match(/RS-D-\d{2}-(\d+)/);
            if (match) {
                nextNumber = Number(match[1]) + 1;
            }
        }
        const displayNumber =
            nextNumber <= 9999 ? String(nextNumber).padStart(4, "0") : String(nextNumber);

        const billNo = `RS-D-${currentYear}-${displayNumber}`;

        return NextResponse.json({
            success: true,
            billNo,
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({
            billNo: `RS-Client-${new Date().getFullYear().toString().slice(-2)}-0001`,
        });
    }
}
