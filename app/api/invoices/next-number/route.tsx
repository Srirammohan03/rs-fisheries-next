import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Financial year helper
function getFinancialYear(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/**
 * GET → PREVIEW ONLY (NO DB WRITE)
 * Used when opening Edit modal
 */
export async function GET() {
  const currentFY = getFinancialYear();

  const counter = await prisma.invoiceCounter.findUnique({
    where: { id: 1 },
  });

  let nextCount = 1;

  if (counter && counter.financialYear === currentFY) {
    nextCount = counter.count + 1;
  }

  const padded = String(nextCount).padStart(4, "0");
  const invoiceNumber = `RS-INV-${currentFY.slice(2)}-${padded}`;

  return NextResponse.json({ invoiceNumber });
}

/**
 * POST → RESERVE NUMBER (INCREMENT ON SAVE)
 * Used only when user clicks "Save & Finalize"
 */
export async function POST() {
  const currentFY = getFinancialYear();

  const counter = await prisma.invoiceCounter.findUnique({
    where: { id: 1 },
  });

  let nextCount = 1;

  if (counter && counter.financialYear === currentFY) {
    nextCount = counter.count + 1;
  }

  await prisma.invoiceCounter.upsert({
    where: { id: 1 },
    update: {
      count: nextCount,
      financialYear: currentFY,
    },
    create: {
      id: 1,
      count: nextCount,
      financialYear: currentFY,
    },
  });

  const padded = String(nextCount).padStart(4, "0");
  const invoiceNumber = `RS-INV-${currentFY.slice(2)}-${padded}`;

  return NextResponse.json({ invoiceNumber });
}
