// app/api/payments/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DispatchChargeType } from "@prisma/client";

export const runtime = "nodejs";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

async function computeBaseTotalPrice(clientLoadingId: string): Promise<number> {
  const loading = await prisma.clientLoading.findUnique({
    where: { id: clientLoadingId },
    select: {
      totalPrice: true,
      items: { select: { totalPrice: true } }, // ✅ fallback if totalPrice is 0
    },
  });

  if (!loading) return 0;

  const apiTotal = Number(loading.totalPrice || 0);
  if (apiTotal > 0) return apiTotal;

  const itemsSum = (loading.items || []).reduce(
    (s, it) => s + Number(it.totalPrice || 0),
    0
  );

  return Number.isFinite(itemsSum) ? itemsSum : 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const sourceRecordId = asString(body.sourceRecordId);
    const typeRaw = body.type;
    const label = asString(body.label) || null;
    const notes = asString(body.notes) || null;
    const amount = asPositiveNumber(body.amount);

    if (!sourceRecordId) {
      return NextResponse.json(
        { error: "sourceRecordId is required" },
        { status: 400 }
      );
    }

    if (
      !typeRaw ||
      !Object.values(DispatchChargeType).includes(typeRaw as any)
    ) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    const type = typeRaw as DispatchChargeType;

    if (amount === null) {
      return NextResponse.json(
        { error: "Valid positive amount required" },
        { status: 400 }
      );
    }

    if (type === "OTHER" && !label) {
      return NextResponse.json(
        { error: "Label required for OTHER" },
        { status: 400 }
      );
    }

    // ✅ Verify loading exists (Client only)
    const loadingExists = await prisma.clientLoading.findUnique({
      where: { id: sourceRecordId },
      select: { id: true, vehicleId: true, vehicleNo: true },
    });

    if (!loadingExists) {
      return NextResponse.json(
        { error: "Loading record not found" },
        { status: 404 }
      );
    }

    // ✅ Enforce: TRANSPORT allowed only if vehicle exists
    if (type === "TRANSPORT") {
      const hasVehicle = Boolean(
        (loadingExists.vehicleId && loadingExists.vehicleId.trim()) ||
          (loadingExists.vehicleNo && loadingExists.vehicleNo.trim())
      );
      if (!hasVehicle) {
        return NextResponse.json(
          { error: "Transport charge not allowed: vehicle not assigned" },
          { status: 400 }
        );
      }
    }

    // ✅ Create DispatchCharge (Client only relation)
    const dispatchCharge = await prisma.dispatchCharge.create({
      data: {
        sourceRecordId,
        type,
        label,
        amount,
        notes,
        clientLoadingId: sourceRecordId,
      },
    });

    // ✅ Recalculate totals
    const [dispatchSum, packingSum, baseTotalPrice] = await Promise.all([
      prisma.dispatchCharge.aggregate({
        where: { clientLoadingId: sourceRecordId },
        _sum: { amount: true },
      }),
      prisma.packingAmount.aggregate({
        where: { clientLoadingId: sourceRecordId },
        _sum: { totalAmount: true },
      }),
      computeBaseTotalPrice(sourceRecordId),
    ]);

    const newDispatchTotal = dispatchSum._sum.amount || 0;
    const newPackingTotal = packingSum._sum.totalAmount || 0;
    const newGrandTotal = baseTotalPrice + newDispatchTotal + newPackingTotal;

    // ✅ Update parent
    await prisma.clientLoading.update({
      where: { id: sourceRecordId },
      data: {
        dispatchChargesTotal: newDispatchTotal,
        packingAmountTotal: newPackingTotal,
        grandTotal: newGrandTotal,
      },
    });

    return NextResponse.json(
      { success: true, data: dispatchCharge },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("DispatchCharge POST error:", error);
    return NextResponse.json(
      { error: "Failed to save dispatch charge", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceRecordId = searchParams.get("sourceRecordId")?.trim() || "";

    const where: any = {};
    if (sourceRecordId) where.sourceRecordId = sourceRecordId;

    // Require at least sourceRecordId (or return all charges)
    const dispatchCharges = await prisma.dispatchCharge.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        label: true,
        amount: true,
        notes: true,
        createdAt: true,
        sourceRecordId: true,
      },
    });

    return NextResponse.json(
      { success: true, data: dispatchCharges },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DispatchCharge GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatch charges", details: error.message },
      { status: 500 }
    );
  }
}
