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
      { message: "ClientLoading ID required" },
      { status: 400 }
    );
  }

  try {
    const exists = await prisma.clientLoading.findUnique({
      where: { id },
      select: { id: true, billNo: true },
    });

    if (!exists) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    // OPTIONAL but recommended: clean legacy links (sourceRecordId is NOT a FK)
    await prisma.packingAmount.updateMany({
      where: { sourceRecordId: id },
      data: { sourceRecordId: null },
    });

    await prisma.dispatchCharge.updateMany({
      where: { sourceRecordId: id },
      data: { sourceRecordId: null },
    });

    // MAIN: delete parent -> CASCADE deletes ClientItem + linked packing/dispatch via FK fields
    await prisma.clientLoading.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Client bill deleted (cascade applied)",
      billNo: exists.billNo,
    });
  } catch (error: any) {
    console.error("ClientLoading DELETE error:", error);
    return NextResponse.json(
      { message: "Delete failed", error: error.message },
      { status: 500 }
    );
  }
}
