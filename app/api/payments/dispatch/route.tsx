// app/api/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DispatchChargeType, DispatchSourceType } from "@prisma/client";

export const runtime = "nodejs";

// Helpers
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

    // Required: sourceType
    if (
      !sourceTypeRaw ||
      !Object.values(DispatchSourceType).includes(sourceTypeRaw as any)
    ) {
      return NextResponse.json(
        {
          error: "sourceType is required and must be FORMER, AGENT, or CLIENT",
        },
        { status: 400 }
      );
    }
    const sourceType = sourceTypeRaw as DispatchSourceType;

    // Required: sourceRecordId
    if (!sourceRecordId) {
      return NextResponse.json(
        { error: "sourceRecordId is required" },
        { status: 400 }
      );
    }

    // Required: valid type
    if (
      !typeRaw ||
      !Object.values(DispatchChargeType).includes(typeRaw as any)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid type. Allowed: ICE_COOLING, TRANSPORT, OTHER, PACKING",
        },
        { status: 400 }
      );
    }
    const type = typeRaw as DispatchChargeType;

    // Required: positive amount
    if (amount === null) {
      return NextResponse.json(
        { error: "Valid positive amount is required" },
        { status: 400 }
      );
    }

    // Required: label for OTHER or PACKING
    if ((type === "OTHER" || type === "PACKING") && !label) {
      return NextResponse.json(
        { error: "label is required when type is OTHER or PACKING" },
        { status: 400 }
      );
    }

    // Optional but recommended: verify the parent loading exists
    let loadingExists = false;
    if (sourceType === DispatchSourceType.FORMER) {
      loadingExists = !!(await prisma.formerLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true },
      }));
    } else if (sourceType === DispatchSourceType.AGENT) {
      loadingExists = !!(await prisma.agentLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true },
      }));
    } else if (sourceType === DispatchSourceType.CLIENT) {
      loadingExists = !!(await prisma.clientLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true },
      }));
    }

    if (!loadingExists) {
      return NextResponse.json(
        {
          error: `No ${sourceType.toLowerCase()} loading found with ID: ${sourceRecordId}`,
        },
        { status: 404 }
      );
    }

    // Create dispatch charge — now safe with no conflicting FKs
    const dispatchCharge = await prisma.dispatchCharge.create({
      data: {
        sourceType,
        sourceRecordId,
        type,
        label,
        notes,
        amount,
      },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: dispatchCharge },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("DispatchCharge POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to create dispatch charge",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceTypeRaw = searchParams.get("sourceType");
    const sourceRecordId = searchParams.get("sourceRecordId");

    if (!sourceRecordId) {
      return NextResponse.json(
        { error: "sourceRecordId query parameter is required" },
        { status: 400 }
      );
    }

    let where: any = { sourceRecordId };

    if (sourceTypeRaw) {
      if (!Object.values(DispatchSourceType).includes(sourceTypeRaw as any)) {
        return NextResponse.json(
          { error: "Invalid sourceType" },
          { status: 400 }
        );
      }
      where.sourceType = sourceTypeRaw as DispatchSourceType;
    }

    const dispatchCharges = await prisma.dispatchCharge.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
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
