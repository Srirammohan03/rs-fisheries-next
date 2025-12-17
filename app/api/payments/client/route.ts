// app/api/payments/client/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMode } from "@prisma/client";
import { put } from "@vercel/blob";

export const runtime = "nodejs"; // ✅ important (Prisma + Blob)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const clientId = formData.get("clientId") as string;
    const clientName = formData.get("clientName") as string;
    const dateStr = formData.get("date") as string;
    const amountStr = formData.get("amount") as string;
    const paymentModeStr = formData.get("paymentMode") as string;
    const reference = (formData.get("reference") as string) || null;
    const image = formData.get("image") as File | null;
    const isInstallmentStr = formData.get("isInstallment");

    if (!clientId || !clientName || !dateStr || !amountStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const paymentMode = paymentModeStr.toUpperCase() as PaymentMode;
    if (!["CASH", "AC", "UPI", "CHEQUE"].includes(paymentMode)) {
      return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 });
    }

    let imageUrl: string | undefined;

    // ✅ Upload to Vercel Blob (no filesystem write)
    if (image && image.size > 0) {
      const ext = image.name?.split(".").pop()?.toLowerCase() || "jpg";
      const safeClient = clientId.replace(/[^a-zA-Z0-9-_]/g, "_");
      const key = `client-payments/${safeClient}/${Date.now()}.${ext}`;

      const blob = await put(key, image, { access: "public" });
      imageUrl = blob.url; // store full URL
    }

    const payment = await prisma.clientPayment.create({
      data: {
        clientId,
        clientName,
        date,
        amount,
        paymentMode,
        reference: reference || undefined,
        imageUrl,
        isInstallment: isInstallmentStr === "true",
      },
    });

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error: any) {
    console.error("ClientPayment POST error:", error);
    return NextResponse.json(
      { error: "Failed to save payment", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const payments = await prisma.clientPayment.findMany({
      select: {
        id: true,
        clientId: true,
        clientName: true,
        date: true,
        amount: true,
        paymentMode: true,
        reference: true,
        imageUrl: true,
        isInstallment: true,
        createdAt: true,
        client: {
          select: {
            clientName: true,
            village: true,
            billNo: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ payments }, { status: 200 });
  } catch (error: any) {
    console.error("ClientPayment GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments", details: error.message },
      { status: 500 }
    );
  }
}
 