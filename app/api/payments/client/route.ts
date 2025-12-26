import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMode } from "@prisma/client";

export const runtime = "nodejs";

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const num = parseFloat(trimmed);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  if (typeof value === "number") {
    return value > 0 ? value : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const clientId = asString(body.clientId);
    const clientName = asString(body.clientName);
    const dateStr = asString(body.date);
    const amount = asPositiveNumber(body.amount);
    const paymentModeStr = asString(body.paymentMode)?.toUpperCase() as PaymentMode | null;
    const referenceNo = asString(body.referenceNo);
    const paymentRef = asString(body.paymentRef);
    const accountNumber = asString(body.accountNumber);
    const ifsc = asString(body.ifsc);
    const bankName = asString(body.bankName);
    const bankAddress = asString(body.bankAddress);
    const paymentdetails = asString(body.paymentdetails);
    const billNo = asString(body.billNo); // optional

    // Required fields
    if (!clientId || !clientName || !dateStr || !amount || !paymentModeStr) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, clientName, date, amount, paymentMode" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (!Object.values(PaymentMode).includes(paymentModeStr)) {
      return NextResponse.json(
        { error: "Invalid paymentMode. Allowed: CASH, AC, UPI, CHEQUE" },
        { status: 400 }
      );
    }

    // Optional: Validate client loading exists
    const clientLoading = await prisma.clientLoading.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!clientLoading) {
      return NextResponse.json({ error: "Client loading not found" }, { status: 404 });
    }

    // Installment logic
    // Handle installment logic — only validate if isInstallment is true AND fields are provided
    const isInstallment = asBoolean(body.isInstallment);
    let installments: number | null = null;
    let installmentNumber: number | null = null;

    if (isInstallment) {
      const inst = body.installments;
      const instNum = body.installmentNumber;

      if (inst !== undefined && inst !== null && inst !== "") {
        installments = Number(inst);
        if (!Number.isInteger(installments) || installments < 1) {
          return NextResponse.json(
            { error: "Total installments must be a positive integer" },
            { status: 400 }
          );
        }
      }

      if (instNum !== undefined && instNum !== null && instNum !== "") {
        installmentNumber = Number(instNum);
        if (!Number.isInteger(installmentNumber) || installmentNumber < 1) {
          return NextResponse.json(
            { error: "Installment number must be a positive integer" },
            { status: 400 }
          );
        }
      }

      // Only check relation if both are provided
      if (installments !== null && installmentNumber !== null) {
        if (installmentNumber > installments) {
          return NextResponse.json(
            { error: "Installment number cannot exceed total installments" },
            { status: 400 }
          );
        }
      }

      // If isInstallment=true but no numbers provided → still allow (just mark as installment without details)
    }

    const clientKey = `client:${clientName}`;

    const payment = await prisma.clientPayment.create({
      data: {
        clientId,
        clientKey,
        clientName,
        date,
        amount,
        paymentMode: paymentModeStr,
        referenceNo,
        paymentRef,
        accountNumber,
        ifsc,
        bankName,
        bankAddress,
        paymentdetails,
        isInstallment,
        installments: installments ?? undefined,
        installmentNumber: installmentNumber ?? undefined,
      },
      include: {
        client: {
          select: {
            billNo: true,
            village: true,
            fishCode: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error: any) {
    console.error("ClientPayment POST error:", error);
    return NextResponse.json(
      { error: "Failed to save client payment", details: error.message },
      { status: 500 }
    );
  }
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const where: any = {};
    if (clientId) where.clientId = clientId;

    const payments = await prisma.clientPayment.findMany({
      where,
      select: {
        id: true,
        clientId: true,
        clientKey: true,
        clientName: true,
        date: true,
        amount: true,
        paymentMode: true,
        referenceNo: true,
        paymentRef: true,
        accountNumber: true,
        ifsc: true,
        bankName: true,
        bankAddress: true,
        paymentdetails: true,
        isInstallment: true,
        installments: true,
        installmentNumber: true,
        createdAt: true,
        client: {
          select: {
            billNo: true,
            village: true,
            fishCode: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: payments }, { status: 200 });
  } catch (error: any) {
    console.error("ClientPayment GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch client payments", details: error.message },
      { status: 500 }
    );
  }
}