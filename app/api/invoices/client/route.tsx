// app/api/invoices/client/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      paymentId,
      clientId,
      clientName,
      invoiceNo,
      billTo,
      hsn,
      description,
      gstPercent = 0,
    } = body;

    // ✅ Strict validation (no defaults)
    if (!paymentId || !clientId || !clientName || !invoiceNo || !billTo) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!hsn || !String(hsn).trim()) {
      return NextResponse.json({ message: "HSN is required" }, { status: 400 });
    }

    if (!description || !String(description).trim()) {
      return NextResponse.json(
        { message: "Description is required" },
        { status: 400 }
      );
    }

    const payment = await prisma.clientPayment.findUnique({
      where: { id: paymentId },
      select: {
        amount: true,
        date: true,
        paymentMode: true,
        clientName: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 }
      );
    }

    const taxableValue = payment.amount;
    const gstAmount = 0;
    const totalAmount = taxableValue;

    const invoice = await prisma.clientInvoice.upsert({
      where: { paymentId },
      update: {
        clientId,
        clientName,
        invoiceNo,
        billTo: String(billTo).trim(),
        hsn: String(hsn).trim(),
        description: String(description).trim(),
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
        billTo: String(billTo).trim(),
        hsn: String(hsn).trim(),
        description: String(description).trim(),
        gstPercent,
        taxableValue,
        gstAmount,
        totalAmount,
        isFinalized: true,
      },
    });

    return NextResponse.json({
      success: true,
      invoice,
      payment: {
        amount: payment.amount,
        date: payment.date,
        paymentMode: payment.paymentMode,
        clientName: payment.clientName,
      },
    });
  } catch (err: any) {
    console.error("Client Invoice Save Error:", err);
    return NextResponse.json(
      {
        message: "Failed to save invoice",
        details: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json({ message: "Missing paymentId" }, { status: 400 });
  }

  try {
    const invoice = await prisma.clientInvoice.findUnique({
      where: { paymentId },
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404 }
      );
    }

    const payment = await prisma.clientPayment.findUnique({
      where: { id: paymentId },
      select: { amount: true, date: true, paymentMode: true, clientName: true },
    });

    return NextResponse.json({ invoice, payment: payment || {} });
  } catch (err: any) {
    console.error("Invoice fetch error:", err);
    return NextResponse.json(
      {
        message: "Failed to fetch invoice",
        details: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
