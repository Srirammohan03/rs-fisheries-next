// app\api\payments\vendor\route.tsx
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Use an interface for robust typing
interface VendorPaymentBody {
  vendorId?: string; // ← ignore this
  vendorName?: string;
  source?: "farmer" | "agent";
  sourceRecordId?: string; // ✅ REQUIRED
  date?: string;
  amount?: number | string;
  paymentMode?: string;
  referenceNo?: string | null;
  paymentRef?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;
  paymentdetails?: string | null;
  isInstallment?: boolean;
  installments?: number | null;
  installmentNumber?: number | null;
}

function normalizeString(v: string | null | undefined): string | null {
  if (v === null || typeof v === "undefined") return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VendorPaymentBody;
    // Debug - remove in production
    // console.log("Received payload:", body);

    const source = body.source;
    if (!source) {
      return NextResponse.json(
        { message: "source is required" },
        { status: 400 }
      );
    }

    const sourceRecordId = normalizeString(body.sourceRecordId);
    const billNo = normalizeString((body as any).billNo);
    const vendorName = normalizeString(body.vendorName) ?? "Unknown";

    let finalSourceRecordId: string | null = sourceRecordId;

    // fallback lookup by billNo
    if (!finalSourceRecordId && billNo) {
      if (source === "farmer") {
        const row = await prisma.formerLoading.findUnique({
          where: { billNo },
          select: { id: true },
        });
        finalSourceRecordId = row?.id ?? null;
      } else if (source === "agent") {
        const row = await prisma.agentLoading.findUnique({
          where: { billNo },
          select: { id: true },
        });
        finalSourceRecordId = row?.id ?? null;
      }
    }

    if (!finalSourceRecordId) {
      return NextResponse.json(
        { message: "sourceRecordId is required (or provide billNo)" },
        { status: 400 }
      );
    }

    // 🔥 ALWAYS generate vendorId from loading ID
    const vendorId = `${source}:${finalSourceRecordId}`;

    const amt =
      typeof body.amount === "string" ? Number(body.amount) : body.amount ?? 0;

    // Use Number.isFinite for a comprehensive number check
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { message: "Valid positive amount is required" },
        { status: 400 }
      );
    }

    if (!body.date) {
      return NextResponse.json(
        { message: "date is required" },
        { status: 400 }
      );
    }
    const dateObj = new Date(body.date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
    }

    // Helper to handle optional fields correctly for Prisma:
    // returns the normalized string if property exists, otherwise null
    const getOptionalField = (key: keyof VendorPaymentBody) =>
      body.hasOwnProperty(key)
        ? normalizeString(body[key] as string | null)
        : null;

    const payment = await prisma.vendorPayment.create({
      data: {
        vendorId,
        vendorName,
        source,
        date: dateObj,
        amount: amt, // Use amt directly, it's already a number
        paymentMode: normalizeString(body.paymentMode) ?? "cash",

        // Using helper function for cleaner optional field handling
        referenceNo: getOptionalField("referenceNo"),
        paymentRef: getOptionalField("paymentRef"),
        accountNumber: getOptionalField("accountNumber"),

        // IFSC Uppercase
        ifsc: getOptionalField("ifsc")?.toUpperCase(),

        bankName: getOptionalField("bankName"),
        bankAddress: getOptionalField("bankAddress"),
        paymentdetails: getOptionalField("paymentdetails"),

        isInstallment: Boolean(body.isInstallment ?? false),
        installments:
          typeof body.installments === "number" ? body.installments : null,
        installmentNumber:
          typeof body.installmentNumber === "number"
            ? body.installmentNumber
            : null,
      },
    });

    return NextResponse.json(
      { message: "Saved!", data: payment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Save error:", error);
    // Ensure error response is a standard object
    return NextResponse.json(
      { message: "Server error during payment creation", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const payments = await prisma.vendorPayment.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: payments });
  } catch (error: any) {
    console.error("Failed to fetch vendor payments:", error);
    // Ensure error response is a standard object
    return NextResponse.json(
      {
        message: "Failed to load payments",
        // Return a simplified error for client, keep detailed log server-side
        error: "Connection terminated unexpectedly or timed out.",
      },
      { status: 500 }
    );
  }
}
