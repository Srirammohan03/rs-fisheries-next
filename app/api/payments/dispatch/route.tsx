// app/api/payments/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DispatchChargeType, DispatchSourceType } from "@prisma/client";

export const runtime = "nodejs";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const sourceTypeRaw = body.sourceType;
    const sourceRecordId = asString(body.sourceRecordId);
    const typeRaw = body.type;
    const label = asString(body.label) || null;
    const notes = asString(body.notes) || null;
    const amount = asPositiveNumber(body.amount);

    if (
      !sourceTypeRaw ||
      !Object.values(DispatchSourceType).includes(sourceTypeRaw as any)
    ) {
      return NextResponse.json(
        { error: "Invalid or missing sourceType" },
        { status: 400 }
      );
    }
    const sourceType = sourceTypeRaw as DispatchSourceType;

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

    if ((type === "OTHER" || type === "PACKING") && !label) {
      return NextResponse.json(
        { error: "Label required for OTHER or PACKING" },
        { status: 400 }
      );
    }

    // ✅ Verify loading exists + get base price from correct table
    let baseTotalPrice = 0;

    if (sourceType === DispatchSourceType.CLIENT) {
      const loading = await prisma.clientLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true, totalPrice: true },
      });
      if (!loading) {
        return NextResponse.json(
          { error: "Loading record not found" },
          { status: 404 }
        );
      }
      baseTotalPrice = loading.totalPrice || 0;
    }

    if (sourceType === DispatchSourceType.FORMER) {
      const loading = await prisma.formerLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true, totalPrice: true },
      });
      if (!loading) {
        return NextResponse.json(
          { error: "Loading record not found" },
          { status: 404 }
        );
      }
      baseTotalPrice = loading.totalPrice || 0;
    }

    if (sourceType === DispatchSourceType.AGENT) {
      const loading = await prisma.agentLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true, totalPrice: true },
      });
      if (!loading) {
        return NextResponse.json(
          { error: "Loading record not found" },
          { status: 404 }
        );
      }
      baseTotalPrice = loading.totalPrice || 0;
    }

    // ✅ Create DispatchCharge with correct relation FK
    const relationData: any = {};
    if (sourceType === DispatchSourceType.CLIENT)
      relationData.clientLoadingId = sourceRecordId;
    if (sourceType === DispatchSourceType.FORMER)
      relationData.formerLoadingId = sourceRecordId;
    if (sourceType === DispatchSourceType.AGENT)
      relationData.agentLoadingId = sourceRecordId;

    const dispatchCharge = await prisma.dispatchCharge.create({
      data: {
        sourceType,
        sourceRecordId,
        type,
        label,
        amount,
        notes,
        ...relationData,
      },
    });

    // ✅ Recalculate totals from actual tables
    const [dispatchSum, packingSum] = await Promise.all([
      prisma.dispatchCharge.aggregate({
        where: {
          OR: [
            { clientLoadingId: sourceRecordId },
            { formerLoadingId: sourceRecordId },
            { agentLoadingId: sourceRecordId },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.packingAmount.aggregate({
        where: {
          OR: [
            { clientLoadingId: sourceRecordId },
            { formerLoadingId: sourceRecordId },
            { agentLoadingId: sourceRecordId },
          ],
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const newDispatchTotal = dispatchSum._sum.amount || 0;
    const newPackingTotal = packingSum._sum.totalAmount || 0;

    // ✅ Correct grandTotal
    const newGrandTotal = baseTotalPrice + newDispatchTotal + newPackingTotal;

    // ✅ Update parent
    if (sourceType === DispatchSourceType.CLIENT) {
      await prisma.clientLoading.update({
        where: { id: sourceRecordId },
        data: {
          dispatchChargesTotal: newDispatchTotal,
          packingAmountTotal: newPackingTotal,
          grandTotal: newGrandTotal,
        },
      });
    }

    if (sourceType === DispatchSourceType.FORMER) {
      await prisma.formerLoading.update({
        where: { id: sourceRecordId },
        data: {
          dispatchChargesTotal: newDispatchTotal,
          packingAmountTotal: newPackingTotal,
          grandTotal: newGrandTotal,
        },
      });
    }

    if (sourceType === DispatchSourceType.AGENT) {
      await prisma.agentLoading.update({
        where: { id: sourceRecordId },
        data: {
          dispatchChargesTotal: newDispatchTotal,
          packingAmountTotal: newPackingTotal,
          grandTotal: newGrandTotal,
        },
      });
    }

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
    const sourceTypeRaw = searchParams.get("sourceType");
    const sourceRecordId = searchParams.get("sourceRecordId");

    const where: any = {};

    if (sourceTypeRaw) {
      if (!Object.values(DispatchSourceType).includes(sourceTypeRaw as any)) {
        return NextResponse.json(
          { error: "Invalid sourceType" },
          { status: 400 }
        );
      }
      where.sourceType = sourceTypeRaw as DispatchSourceType;
    }

    if (sourceRecordId) {
      where.sourceRecordId = sourceRecordId;
    }

    // Require at least sourceType or sourceRecordId
    if (!sourceTypeRaw && !sourceRecordId) {
      return NextResponse.json(
        { error: "At least sourceType or sourceRecordId is required" },
        { status: 400 }
      );
    }

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
        sourceType: true,
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
