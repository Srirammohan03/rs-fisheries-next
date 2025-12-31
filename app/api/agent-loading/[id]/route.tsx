// app\api\agent-loading\[id]\route.tsx
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
      { message: "AgentLoading ID required" },
      { status: 400 }
    );
  }

  try {
    const exists = await prisma.agentLoading.findUnique({
      where: { id },
      select: { id: true, billNo: true },
    });

    if (!exists) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    // Clean legacy references (not FK)
    await prisma.packingAmount.updateMany({
      where: { sourceRecordId: id },
      data: { sourceRecordId: null },
    });

    await prisma.dispatchCharge.updateMany({
      where: { sourceRecordId: id },
      data: { sourceRecordId: null },
    });

    // Delete parent -> CASCADE deletes AgentItem + linked PackingAmount/DispatchCharge (via FK IDs)
    await prisma.agentLoading.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Agent bill deleted (cascade applied)",
      billNo: exists.billNo,
    });
  } catch (error: any) {
    console.error("AgentLoading DELETE error:", error);
    return NextResponse.json(
      { message: "Delete failed", error: error.message },
      { status: 500 }
    );
  }
}
