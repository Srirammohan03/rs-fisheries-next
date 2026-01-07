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
  clientDetailsId?: string; // ✅ Client.id (master)
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
    const clientName = asString(body.clientName);
    const dateStr = asString(body.date);
    const totalAmount = asPositiveNumber(body.amount);

    const paymentModeStr = asString(body.paymentMode)?.toUpperCase() || null;
    const paymentMode = paymentModeStr as PaymentMode | null;

    if (
      !clientDetailsId ||
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

    // ✅ Fetch all loadings for this client (oldest first)
    const loadings = await prisma.clientLoading.findMany({
      where: { clientId: clientDetailsId },
      orderBy: { date: "asc" },
      select: {
        id: true,
        billNo: true,
        grandTotal: true,
      },
    });

    if (loadings.length === 0) {
      return NextResponse.json(
        { error: "No bills found for this client" },
        { status: 404 }
      );
    }

    // ✅ Paid per loading
    const paidAgg = await prisma.clientPayment.groupBy({
      by: ["clientId"],
      where: { clientDetailsId },
      _sum: { amount: true },
    });

    const paidByLoading = new Map<string, number>();
    for (const row of paidAgg) {
      paidByLoading.set(row.clientId, Number(row._sum.amount || 0));
    }

    let remainingToAllocate = totalAmount;

    const isInstallment = asBoolean(body.isInstallment);
    const installments =
      body.installments === null || body.installments === undefined
        ? null
        : Number(body.installments);
    const installmentNumber =
      body.installmentNumber === null || body.installmentNumber === undefined
        ? null
        : Number(body.installmentNumber);

    // basic installment validation (optional fields)
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

    const createdPayments = await prisma.$transaction(async (tx) => {
      const created: any[] = [];

      for (const l of loadings) {
        if (remainingToAllocate <= 0) break;

        const billed = Number(l.grandTotal || 0);
        const paid = paidByLoading.get(l.id) || 0;
        const due = Math.max(0, billed - paid);

        if (due <= 0) continue;

        const payNow = Math.min(due, remainingToAllocate);
        remainingToAllocate -= payNow;

        const p = await tx.clientPayment.create({
          data: {
            clientId: l.id, // ✅ ClientLoading FK
            clientDetailsId: clientDetailsId, // ✅ Client master FK
            clientKey: `client:${clientName}`,
            clientName,
            date,
            amount: payNow,
            paymentMode, // enum
            isInstallment,
            installments,
            installmentNumber,
          },
        });

        created.push({ ...p, billNo: l.billNo });
      }

      return created;
    });

    if (remainingToAllocate > 0.01) {
      return NextResponse.json(
        { error: "Amount exceeds total pending due for this client" },
        { status: 400 }
      );
    }

    for (const payment of createdPayments) {
      await logAudit({
        user: (req as any).user,
        module: "Client Payments",
        action: "CREATE",
        recordId: payment.id,
        label: `Client payment created for bill ${payment.billNo}`,
        oldValues: null,
        newValues: {
          clientName: payment.clientName,
          clientKey: payment.clientKey,
          billNo: payment.billNo,
          amount: payment.amount,
          paymentMode: payment.paymentMode,
          date: payment.date,
        },
        request: req,
      });
    }

    return NextResponse.json(
      { success: true, data: createdPayments },
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
        clientDetailsId: true, // ✅ return master id
        clientKey: true,
        clientName: true,
        date: true,
        amount: true,
        paymentMode: true,
        isInstallment: true,
        installments: true,
        installmentNumber: true,
        createdAt: true,
        client: {
          select: { billNo: true, village: true, fishCode: true },
        },
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
