// app\api\client-bills\update-total\route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const DEDUCTION_PERCENT = 5;

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { loadingId?: string };
        const loadingId = (body.loadingId || "").trim();

        if (!loadingId) {
            return NextResponse.json({ success: false, message: "loadingId required" }, { status: 400 });
        }

        const loading = await prisma.clientLoading.findUnique({
            where: { id: loadingId },
            include: { items: true, vehicle: { select: { vehicleNumber: true } } },
        });

        if (!loading) {
            return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
        }

        const hasVehicle =
            Boolean(loading.vehicleId) ||
            Boolean((loading.vehicleNo || "").trim()) ||
            Boolean((loading.vehicle?.vehicleNumber || "").trim());

        const totalTrays = loading.items.reduce((s, i) => s + Number(i.noTrays || 0), 0);
        const totalKgs = loading.items.reduce((s, i) => s + Number(i.totalKgs || 0), 0);

        const grandTotal = hasVehicle
            ? Number(totalKgs.toFixed(2))
            : Number((totalKgs * (1 - DEDUCTION_PERCENT / 100)).toFixed(2));

        // ✅ distribute effective kgs per item proportionally to bill grand total
        const updates = loading.items.map((it) => {
            const itemKgs = Number(it.totalKgs || 0);

            const effectiveKgs =
                totalKgs > 0 ? Number(((itemKgs / totalKgs) * grandTotal).toFixed(3)) : itemKgs;

            const pricePerKg = Number(it.pricePerKg || 0);
            const totalPrice = Number((effectiveKgs * pricePerKg).toFixed(2));

            return { id: it.id, totalPrice };
        });

        const totalPrice = updates.reduce((s, u) => s + Number(u.totalPrice || 0), 0);

        await prisma.$transaction(async (tx) => {
            // update each item totalPrice
            for (const u of updates) {
                await tx.clientItem.update({
                    where: { id: u.id },
                    data: { totalPrice: u.totalPrice },
                });
            }

            // update parent totals
            await tx.clientLoading.update({
                where: { id: loadingId },
                data: {
                    totalTrays,
                    totalKgs,
                    grandTotal,
                    totalPrice,
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: "Totals updated",
            data: { loadingId, totalTrays, totalKgs, grandTotal, totalPrice, hasVehicle },
        });
    } catch (e) {
        console.error("client-bills update-total error:", e);
        return NextResponse.json({ success: false, message: "Failed to update totals" }, { status: 500 });
    }
}
