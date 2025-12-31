import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { message: "FormerLoading ID required" },
      { status: 400 }
    );
  }

  try {
    const exists = await prisma.formerLoading.findUnique({
      where: { id },
      select: { id: true, billNo: true },
    });

    if (!exists) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    // IMPORTANT: legacy field may still keep old references (not FK)
    // If you want it clean, clear sourceRecordId too.
    await prisma.packingAmount.updateMany({
      where: { sourceRecordId: id },
      data: { sourceRecordId: null },
    });

    await prisma.dispatchCharge.updateMany({
      where: { sourceRecordId: id },
      data: { sourceRecordId: null },
    });

    // Delete parent -> CASCADE deletes FormerItem + linked PackingAmount/DispatchCharge (via FK IDs)
    await prisma.formerLoading.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Farmer bill deleted (cascade applied)",
      billNo: exists.billNo,
    });
  } catch (error: any) {
    console.error("FormerLoading DELETE error:", error);
    return NextResponse.json(
      { message: "Delete failed", error: error.message },
      { status: 500 }
    );
  }
}
