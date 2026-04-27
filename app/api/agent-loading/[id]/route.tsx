// app\api\agent-loading\[id]\route.tsx
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { message: "AgentLoading ID required" },
      { status: 400 },
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
      { status: 500 },
    );
  }
}
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  if (!id) {
    return NextResponse.json(
      { success: false, message: "AgentLoading ID required" },
      { status: 400 },
    );
  }

  try {
    const exists = await prisma.agentLoading.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json(
        { success: false, message: "Bill not found" },
        { status: 404 },
      );
    }

    // remove old items
    await prisma.agentItem.deleteMany({
      where: { agentLoadingId: id },
    });

    const trayKg = Number(body.trayWeight) || 35;
    const items = body.items.map((i: any) => {
      const trayKgs = i.noTrays * trayKg;
      const totalKgs = trayKgs + i.loose;

      return {
        varietyCode: i.varietyCode,
        noTrays: i.noTrays,
        loose: i.loose,
        trayKgs,
        totalKgs,
      };
    });

    const totalKgs = items.reduce((sum: number, i: any) => sum + i.totalKgs, 0);

    const grandTotal = body.useVehicle
      ? Math.round(totalKgs)
      : Math.round(totalKgs * 0.95);

    const updated = await prisma.agentLoading.update({
      where: { id },
      data: {
        agentName: body.agentName,
        agentId: body.agentId || null,
        village: body.village || "",
        date: new Date(body.date),
        localVehicle: body.localVehicle || null,

        totalKgs,
        grandTotal,

        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    console.error("AgentLoading PUT error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update agent loading",
        error: err.message,
      },
      { status: 500 },
    );
  }
}
