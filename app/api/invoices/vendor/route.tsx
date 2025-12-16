// app\api\invoices\vendor\route.tsx
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const {
      paymentId,
      vendorId,
      vendorName,
      source,
      invoiceNo,
      hsn,
      gstPercent,
      billTo,
      shipTo,
    } = await req.json();

    if (!paymentId || !invoiceNo || !hsn || !billTo) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const payment = await prisma.vendorPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 }
      );
    }

    const taxableValue = payment.amount;
    const gstAmount = taxableValue * (gstPercent / 100);
    const totalAmount = taxableValue + gstAmount;

    const invoice = await prisma.vendorInvoice.upsert({
      where: { paymentId },
      update: {
        hsn,
        gstPercent,
        taxableValue,
        gstAmount,
        totalAmount,
        billTo,
        shipTo,
        isFinalized: true,
      },
      create: {
        paymentId,
        vendorId,
        vendorName,
        source,
        invoiceNo,
        invoiceDate: new Date(),
        hsn,
        gstPercent,
        taxableValue,
        gstAmount,
        totalAmount,
        billTo,
        shipTo,
        isFinalized: true,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to save invoice" },
      { status: 500 }
    );
  }
}
