// app/api/client-bills/update-total/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { loadingId } = await request.json();

        if (!loadingId) {
            return NextResponse.json({ error: "loadingId required" }, { status: 400 });
        }

        // Get all items and sum their totalPrice
        const items = await prisma.clientItem.findMany({
            where: { clientLoadingId: loadingId },
            select: { totalPrice: true },
        });

        const totalPrice = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

        // Update the parent record
        await prisma.clientLoading.update({
            where: { id: loadingId },
            data: { totalPrice },
        });

        return NextResponse.json({ success: true, totalPrice });
    } catch (error) {
        console.error("Update total failed:", error);
        return NextResponse.json({ error: "Failed to update total" }, { status: 500 });
    }
}