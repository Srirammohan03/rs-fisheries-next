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
        await prisma.clientItem.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "Item deleted" });
    } catch (error: any) {
        console.error("DELETE failed:", error);
        if (error.code === "P2025") {
            return NextResponse.json({ message: "Item not found" }, { status: 404 });
        }
        return NextResponse.json({ message: "Delete failed" }, { status: 500 });
    }
}
