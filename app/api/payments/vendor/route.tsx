// app/api/payments/vendor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/auditLogger";

export const runtime = "nodejs";

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

function asPositiveNumber(value: unknown): number | null {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function asPositiveInt(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    const source = normalizeString(body.source) as "farmer" | "agent" | null;
    const sourceRecordId = normalizeString(body.sourceRecordId);
    const billNo = normalizeString(body.billNo);
    const vendorNameRaw = normalizeString(body.vendorName);
    const dateStr = normalizeString(body.date);
    const amountRaw = body.amount;
    const paymentModeRaw = normalizeString(body.paymentMode);

    if (!source || !["farmer", "agent"].includes(source)) {
      return NextResponse.json(
        { error: "source is required and must be 'farmer' or 'agent'" },
        { status: 400 }
      );
    }

    if (!dateStr) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const amount = asPositiveNumber(amountRaw);
    if (!amount) {
      return NextResponse.json(
        { error: "Valid positive amount is required" },
        { status: 400 }
      );
    }

    let resolvedId: string | null = sourceRecordId;

    if (!resolvedId && billNo) {
      let loading;
      if (source === "farmer") {
        loading = await prisma.formerLoading.findUnique({
          where: { billNo },
          select: { id: true },
        });
      } else {
        loading = await prisma.agentLoading.findUnique({
          where: { billNo },
          select: { id: true },
        });
      }
      resolvedId = loading?.id ?? null;
    }

    if (!resolvedId) {
      return NextResponse.json(
        {
          error:
            "sourceRecordId is required (or provide valid billNo for lookup)",
        },
        { status: 400 }
      );
    }

    const vendorId = `${source}:${resolvedId}`;
    const vendorName = vendorNameRaw ?? "Unknown Vendor";
    const vendorKey = `${source}:${vendorName}`;

    const referenceNo = normalizeString(body.referenceNo);
    const paymentRef = normalizeString(body.paymentRef);
    const accountNumber = normalizeString(body.accountNumber);
    const ifsc = normalizeString(body.ifsc)?.toUpperCase() ?? null;
    const bankName = normalizeString(body.bankName);
    const bankAddress = normalizeString(body.bankAddress);
    const paymentdetails = normalizeString(body.paymentdetails);

    // Handle installment logic — only validate if isInstallment is true
    const isInstallment = Boolean(body.isInstallment);
    let installments: number | null = null;
    let installmentNumber: number | null = null;

    if (isInstallment) {
      installments = asPositiveInt(body.installments);
      installmentNumber = asPositiveInt(body.installmentNumber);

      if (!installments || !installmentNumber) {
        return NextResponse.json(
          {
            error:
              "installments and installmentNumber are required when isInstallment=true",
          },
          { status: 400 }
        );
      }

      if (installmentNumber > installments) {
        return NextResponse.json(
          { error: "installmentNumber cannot exceed total installments" },
          { status: 400 }
        );
      }
    }

    const paymentMode = paymentModeRaw?.toUpperCase() ?? "CASH";

    const payment = await prisma.$transaction(async (tx) => {
      const createdPayments = await tx.vendorPayment.create({
        data: {
          vendorId,
          vendorKey,
          vendorName,
          source,
          date,
          amount,
          paymentMode,
          referenceNo,
          paymentRef,
          accountNumber,
          ifsc,
          bankName,
          bankAddress,
          paymentdetails,
          isInstallment,
          installments,
          installmentNumber,
          sourceRecordId: resolvedId,
        },
        include: {
          vendorInvoice: true,
        },
      });

      await logAudit({
        action: "CREATE",
        module: "Vendor Payments",
        request: req,
        user: (req as any).user,
        recordId: createdPayments.id,
        oldValues: null,
        newValues: {
          vendorName: createdPayments.vendorName,
          vendorKey: createdPayments.vendorKey,
          source: createdPayments.source,
          date: createdPayments.date,
          amount: createdPayments.amount,
          paymentMode: createdPayments.paymentMode,
        },
        label: `Vendor payment created for bill ${billNo ?? undefined}`,
      });

      return createdPayments;
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error: any) {
    console.error("VendorPayment POST error:", error);
    return NextResponse.json(
      { error: "Failed to create vendor payment", details: error.message },
      { status: 500 }
    );
  }
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") as "farmer" | "agent" | null;
    const sourceRecordId = searchParams.get("sourceRecordId");

    const where: any = {};
    if (source && ["farmer", "agent"].includes(source)) {
      where.source = source;
    }
    if (sourceRecordId && source) {
      where.vendorId = `${source}:${sourceRecordId}`;
    }

    const payments = await prisma.vendorPayment.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        vendorInvoice: {
          select: {
            invoiceNo: true,
            totalAmount: true,
            isFinalized: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    console.error("VendorPayment GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor payments", details: error.message },
      { status: 500 }
    );
  }
}
