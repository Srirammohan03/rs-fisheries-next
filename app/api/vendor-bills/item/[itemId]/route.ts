// app/api/vendor-bills/item/[itemId]/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH — Update price
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const { itemId } = await params;

    if (!itemId) {
        return NextResponse.json({ message: "Item ID required" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { pricePerKg, totalPrice } = body;

        // Try FormerItem first
        const former = await prisma.formerItem.findUnique({ where: { id: itemId } });
        if (former) {
            const updated = await prisma.formerItem.update({
                where: { id: itemId },
                data: {
                    pricePerKg: pricePerKg !== undefined ? Number(pricePerKg) : undefined,
                    totalPrice: totalPrice !== undefined ? Number(totalPrice) : undefined,
                },
            });
            return NextResponse.json({ success: true, item: updated });
        }

        // Then AgentItem
        const updated = await prisma.agentItem.update({
            where: { id: itemId },
            data: {
                pricePerKg: pricePerKg !== undefined ? Number(pricePerKg) : undefined,
                totalPrice: totalPrice !== undefined ? Number(totalPrice) : undefined,
            },
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error: any) {
        console.error("PATCH error:", error);
        return NextResponse.json({ message: "Update failed", error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const { itemId } = await params;

    if (!itemId) {
        return NextResponse.json({ message: "Item ID required" }, { status: 400 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1) Try farmer item
            const former = await tx.formerItem.findUnique({
                where: { id: itemId },
                select: { id: true, formerLoadingId: true },
            });

            if (former) {
                const loadingId = former.formerLoadingId;

                await tx.formerItem.delete({ where: { id: itemId } });

                const remaining = await tx.formerItem.count({
                    where: { formerLoadingId: loadingId },
                });

                // if no more items, delete bill
                if (remaining === 0) {
                    // clean legacy references (optional but safe)
                    await tx.packingAmount.updateMany({
                        where: { sourceRecordId: loadingId },
                        data: { sourceRecordId: null },
                    });

                    await tx.dispatchCharge.updateMany({
                        where: { sourceRecordId: loadingId },
                        data: { sourceRecordId: null },
                    });

                    await tx.formerLoading.delete({ where: { id: loadingId } });

                    return {
                        source: "farmer" as const,
                        deletedBill: true,
                        loadingId,
                    };
                }

                return {
                    source: "farmer" as const,
                    deletedBill: false,
                    loadingId,
                };
            }

            // 2) Try agent item
            const agent = await tx.agentItem.findUnique({
                where: { id: itemId },
                select: { id: true, agentLoadingId: true },
            });

            if (!agent) {
                return null;
            }

            const loadingId = agent.agentLoadingId;

            await tx.agentItem.delete({ where: { id: itemId } });

            const remaining = await tx.agentItem.count({
                where: { agentLoadingId: loadingId },
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

                await tx.agentLoading.delete({ where: { id: loadingId } });

                return {
                    source: "agent" as const,
                    deletedBill: true,
                    loadingId,
                };
            }

            return {
                source: "agent" as const,
                deletedBill: false,
                loadingId,
            };
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
        console.error("DELETE vendor item error:", error);
        return NextResponse.json(
            { message: "Delete failed", error: error.message },
            { status: 500 }
        );
    }
}
