// app/api/client-bills/item/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ message: "Item ID required" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { pricePerKg, totalPrice } = body;

        const updated = await prisma.clientItem.update({
            where: { id },
            data: {
                pricePerKg: pricePerKg !== undefined ? Number(pricePerKg) : undefined,
                totalPrice: totalPrice !== undefined ? Number(totalPrice) : undefined,
            },
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error: any) {
        console.error("PATCH client item failed:", error);
        if (error.code === "P2025") {
            return NextResponse.json({ message: "Item not found" }, { status: 404 });
        }
        return NextResponse.json({ message: "Update failed" }, { status: 500 });
    }
}


export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ message: "Item ID required" }, { status: 400 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.clientItem.findUnique({
                where: { id },
                select: { id: true, clientLoadingId: true },
            });

            if (!item) return null;

            const loadingId = item.clientLoadingId;

            await tx.clientItem.delete({ where: { id } });

            const remaining = await tx.clientItem.count({
                where: { clientLoadingId: loadingId },
            });

            if (remaining === 0) {
                await tx.packingAmount.updateMany({
                    where: { sourceRecordId: loadingId },
                    data: { sourceRecordId: null },
                });

                await tx.dispatchCharge.updateMany({
                    where: { sourceRecordId: loadingId },
                    data: { sourceRecordId: null },
                });

                await tx.clientLoading.delete({ where: { id: loadingId } });

                return { deletedBill: true, loadingId };
            }

            return { deletedBill: false, loadingId };
        });

        if (!result) {
            return NextResponse.json({ message: "Item not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: result.deletedBill
                ? "Item deleted, bill removed (last item)"
                : "Item deleted",
            ...result,
        });
    } catch (error: any) {
        console.error("DELETE client item error:", error);
        return NextResponse.json(
            { message: "Delete failed", error: error.message },
            { status: 500 }
        );
    }
}
