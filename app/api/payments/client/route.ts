// app/api/payments/client/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMode } from "@prisma/client";
import { put } from "@vercel/blob";

export const runtime = "nodejs"; // Required for Prisma + Vercel Blob

// Safe parsers
function asString(value: string | null): string {
  return value?.trim() || "";
}

function asPositiveNumber(value: string | null): number | null {
  const num = parseFloat(value || "");
  return isNaN(num) || num <= 0 ? null : num;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const clientId = asString(formData.get("clientId") as string);
    const clientName = asString(formData.get("clientName") as string);
    const dateStr = asString(formData.get("date") as string);
    const amountStr = formData.get("amount") as string;
    const paymentModeStr = asString(formData.get("paymentMode") as string);
    const referenceNo = asString(formData.get("referenceNo") as string) || null;
    const paymentRef = asString(formData.get("paymentRef") as string) || null;
    const accountNumber = asString(formData.get("accountNumber") as string) || null;
    const ifsc = asString(formData.get("ifsc") as string) || null;
    const bankName = asString(formData.get("bankName") as string) || null;
    const bankAddress = asString(formData.get("bankAddress") as string) || null;
    const paymentDetails = asString(formData.get("paymentdetails") as string) || null;
    const isInstallmentStr = formData.get("isInstallment") as string;
    const installmentsStr = formData.get("installments") as string;
    const installmentNumberStr = formData.get("installmentNumber") as string;

    // Required validation
    if (!clientId || !clientName || !dateStr || !amountStr || !paymentModeStr) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, clientName, date, amount, paymentMode" },
        { status: 400 }
      );
    }

    const amount = asPositiveNumber(amountStr);
    if (!amount) {
      return NextResponse.json({ error: "Valid positive amount is required" }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const paymentMode = paymentModeStr.toUpperCase() as PaymentMode;
    if (!Object.values(PaymentMode).includes(paymentMode)) {
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
    const isInstallment = isInstallmentStr === "true";
    let installments: number | null = null;
    let installmentNumber: number | null = null;

    if (isInstallment) {
      installments = parseInt(installmentsStr || "", 10);
      installmentNumber = parseInt(installmentNumberStr || "", 10);

      if (!installments || installments < 1 || !installmentNumber || installmentNumber < 1) {
        return NextResponse.json(
          { error: "Valid installments and installmentNumber required when isInstallment=true" },
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

    // Generate clientKey for fast grouping
    const clientKey = `client:${clientName}`;

    // Handle image upload (optional)
    const image = formData.get("image") as File | null;
    let imageUrl: string | undefined = undefined;

    if (image && image.size > 0) {
      const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = clientName.replace(/[^a-zA-Z0-9-_]/g, "_");
      const filename = `client-payments/${safeName}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${ext}`;

      const { url } = await put(filename, image, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN, // Recommended: use token
      });

      imageUrl = url;
    }

    // Create payment — NOTE: no imageUrl in schema anymore!
    const payment = await prisma.clientPayment.create({
      data: {
        clientId,
        clientKey,
        clientName,
        date,
        amount,
        paymentMode,
        referenceNo,
        paymentRef,
        accountNumber,
        ifsc,
        bankName,
        bankAddress,
        paymentdetails: paymentDetails,
        isInstallment,
        installments: installments ?? undefined,
        installmentNumber: installmentNumber ?? undefined,
        // imageUrl removed — you said it's no longer needed
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