// app\api\invoices\client\by-payment\route.tsx
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const paymentId = new URL(req.url).searchParams.get("paymentId");

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
