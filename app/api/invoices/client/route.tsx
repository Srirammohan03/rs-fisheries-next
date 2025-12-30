// app/api/invoices/client/route.tsx
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { paymentId, clientId, clientName, invoiceNo, billTo } = body;

    // Removed shipTo from required fields
    if (!paymentId || !invoiceNo || !clientId || !clientName || !billTo) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const payment = await prisma.clientPayment.findUnique({
      where: { id: paymentId },
      select: { amount: true, date: true },
    });

    if (!payment) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 }
      );
    }

    const hsn = "0302";
    const gstPercent = 0;
    const taxableValue = payment.amount;
    const gstAmount = 0;
    const totalAmount = taxableValue + gstAmount;

    const invoice = await prisma.clientInvoice.upsert({
      where: { paymentId },
      update: {
        clientId,
        clientName,
        invoiceNo,
        billTo,
        // shipTo removed from update
        hsn,
        gstPercent,
        taxableValue,
        gstAmount,
        totalAmount,
        isFinalized: true,
      },
      create: {
        paymentId,
        clientId,
        clientName,
        invoiceNo,
        invoiceDate: payment.date || new Date(),
        billTo,
        // shipTo removed from create
        hsn,
        gstPercent,
        taxableValue,
        gstAmount,
        totalAmount,
        isFinalized: true,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    console.error("Client Invoice Save Error:", err);
    return NextResponse.json(
      { message: "Failed to save invoice", details: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json({ message: "Missing paymentId" }, { status: 400 });
  }

  const invoice = await prisma.clientInvoice.findUnique({
    where: { paymentId },
  });

  if (!invoice) {
    return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}
