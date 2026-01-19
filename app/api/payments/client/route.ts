import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMode } from "@prisma/client";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/auditLogger";

export const runtime = "nodejs";

/* ---------------- helpers ---------------- */
function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}
function asPositiveNumber(value: unknown): number | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  if (typeof value === "number") return value > 0 ? value : null;
  return null;
}
function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

type PostBody = {
  clientDetailsId?: string; // Client master ID
  loadingId?: string; // Specific loading ID to apply payment to
  clientName?: string;
  date?: string;
  amount?: number;
  paymentMode?: string;

  referenceNo?: string | null;
  paymentRef?: string | null;
  paymentdetails?: string | null;

  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;

  isInstallment?: boolean;
  installments?: number | null;
  installmentNumber?: number | null;
};

/* ================= POST ================= */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = (await req.json()) as PostBody;

    const clientDetailsId = asString(body.clientDetailsId);
    const loadingId = asString(body.loadingId);
    const clientName = asString(body.clientName);
    const dateStr = asString(body.date);
    const totalAmount = Math.round(asPositiveNumber(body.amount) || 0);

    const paymentModeStr = asString(body.paymentMode)?.toUpperCase() || null;
    const paymentMode = paymentModeStr as PaymentMode | null;

    if (
      !clientDetailsId ||
      !loadingId ||
      !clientName ||
      !dateStr ||
      !totalAmount ||
      !paymentMode
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Object.values(PaymentMode).includes(paymentMode)) {
      return NextResponse.json(
        { error: "Invalid payment mode" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // Fetch the specific loading
    const loading = await prisma.clientLoading.findUnique({
      where: { id: loadingId },
      select: {
        id: true,
        billNo: true,
        grandTotal: true,
        clientId: true,
      },
    });

    if (!loading || loading.clientId !== clientDetailsId) {
      return NextResponse.json(
        { error: "Specified bill not found or does not belong to the client" },
        { status: 404 }
      );
    }

    // Get paid amount for this specific loading
    const paidAgg = await prisma.clientPayment.aggregate({
      where: { clientId: loadingId },
      _sum: { amount: true },
    });

    const billed = Math.round(Number(loading.grandTotal || 0));
    const paid = Math.round(Number(paidAgg._sum.amount || 0));
    const due = Math.max(0, billed - paid);

    if (due <= 0) {
      return NextResponse.json(
        { error: "This bill is already fully paid" },
        { status: 400 }
      );
    }

    if (totalAmount > due) {
      return NextResponse.json(
        { error: "Amount exceeds remaining due for this bill" },
        { status: 400 }
      );
    }

    const isInstallment = asBoolean(body.isInstallment);
    const installments =
      body.installments === null || body.installments === undefined
        ? null
        : Number(body.installments);
    const installmentNumber =
      body.installmentNumber === null || body.installmentNumber === undefined
        ? null
        : Number(body.installmentNumber);

    // Basic installment validation
    if (isInstallment) {
      if (
        installments !== null &&
        (!Number.isInteger(installments) || installments < 1)
      ) {
        return NextResponse.json(
          { error: "Invalid total installments" },
          { status: 400 }
        );
      }
      if (
        installmentNumber !== null &&
        (!Number.isInteger(installmentNumber) || installmentNumber < 1)
      ) {
        return NextResponse.json(
          { error: "Invalid installment number" },
          { status: 400 }
        );
      }
      if (
        installments !== null &&
        installmentNumber !== null &&
        installmentNumber > installments
      ) {
        return NextResponse.json(
          { error: "Installment number exceeds total installments" },
          { status: 400 }
        );
      }
    }

    // Create the payment for this specific loading
    const payment = await prisma.clientPayment.create({
      data: {
        clientId: loading.id, // Loading FK
        clientDetailsId: clientDetailsId, // Master FK
        clientKey: `client:${clientName}`,
        clientName,
        date,
        amount: totalAmount,
        paymentMode,
        isInstallment,
        installments,
        installmentNumber,
      },
    });

    // Log audit
    await logAudit({
      user: (req as any).user,
      module: "Client Payments",
      action: "CREATE",
      recordId: payment.id,
      label: `Client payment created for bill ${loading.billNo}`,
      oldValues: null,
      newValues: {
        clientName: payment.clientName,
        clientKey: payment.clientKey,
        billNo: loading.billNo,
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        date: payment.date,
      },
      request: req,
    });

    return NextResponse.json(
      { success: true, data: [{ ...payment, billNo: loading.billNo }] },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("ClientPayment POST error:", error);
    return NextResponse.json(
      { error: "Failed to save client payment", details: error.message },
      { status: 500 }
    );
  }
});

/* ================= GET ================= */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientDetailsId = searchParams.get("clientDetailsId");

    const where: any = {};
    if (clientDetailsId) where.clientDetailsId = clientDetailsId;

    const payments = await prisma.clientPayment.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        id: true,
        clientId: true,
        clientDetailsId: true,
        clientKey: true,
        clientName: true,
        date: true,
        amount: true,
        paymentMode: true,
        isInstallment: true,
        installments: true,
        installmentNumber: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    console.error("ClientPayment GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch client payments", details: error.message },
      { status: 500 }
    );
  }
}