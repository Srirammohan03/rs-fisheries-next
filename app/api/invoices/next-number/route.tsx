// app\api\invoices\next-number\route.tsx
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET  → Preview invoice number (NO increment)
 * POST → Reserve invoice number (increment)
 */

// 🔹 PREVIEW (safe)
export async function GET() {
  const counter = await prisma.invoiceCounter.findUnique({
    where: { id: 1 },
  });

  const next = (counter?.invoiceCount ?? 0) + 1;

  return NextResponse.json({
    invoiceNumber: `RS-INV-${String(next).padStart(4, "0")}`,
  });
}

// 🔹 RESERVE (increment only on save)
export async function POST() {
  const counter = await prisma.invoiceCounter.upsert({
    where: { id: 1 },
    update: { invoiceCount: { increment: 1 } },
    create: { id: 1, invoiceCount: 1 },
  });

  return NextResponse.json({
    invoiceNumber: `RS-INV-${String(counter.invoiceCount).padStart(4, "0")}`,
  });
}
