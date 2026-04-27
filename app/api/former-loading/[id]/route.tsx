// app\api\former-loading\[id]\route.tsx
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type FormerItemPayload = {
  formerLoadingId: string;
  varietyCode: string;
  noTrays: number;
  trayKgs: number;
  loose: number;
  totalKgs: number;
};
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { message: "FormerLoading ID required" },
      { status: 400 },
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
      { status: 500 },
    );
  }
}

const TRAY_KG = 35;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, message: "Items are required" },
        { status: 400 },
      );
    }

    const trayKg = Number(body.trayWeight) || 35;
    const items: FormerItemPayload[] = body.items.map((i: any) => {
      const trayKgs = i.noTrays * trayKg;
      const totalKgs = trayKgs + i.loose;

      return {
        formerLoadingId: id,
        varietyCode: i.varietyCode,
        noTrays: i.noTrays,
        trayKgs,
        loose: i.loose,
        totalKgs,
      };
    });

    const totalTrays = items.reduce((s: number, i) => s + i.noTrays, 0);
    const totalLooseKgs = items.reduce((s: number, i) => s + i.loose, 0);
    const totalTrayKgs = items.reduce((s: number, i) => s + i.trayKgs, 0);
    const totalKgs = items.reduce((s: number, i) => s + i.totalKgs, 0);

    const result = await prisma.$transaction(async (tx) => {
      await tx.formerItem.deleteMany({
        where: { formerLoadingId: id },
      });

      await tx.formerItem.createMany({
        data: items,
      });

      return tx.formerLoading.update({
        where: { id },
        data: {
          FarmerName: body.FarmerName,
          village: body.village,
          date: new Date(body.date),
          localVehicle: body.localVehicle || null,
          totalTrays,
          totalLooseKgs,
          totalTrayKgs,
          totalKgs,
        },
        include: { items: true },
      });
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("FormerLoading PUT error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Update failed",
        error: err.message,
      },
      { status: 500 },
    );
  }
}
