// app/api/invoices/next-number/route.tsx
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Financial year helper (April - March)
function getFinancialYear(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// Short financial year like 25-26
function getShortFY(fy: string) {
  return fy.slice(2); // "2025-2026" → "25-26"
}

/**
 * GET → Preview next number (no DB write)
 * Query param: ?type=client  or  ?type=vendor
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toLowerCase() || "client";

  const currentFY = getFinancialYear();
  const shortFY = getShortFY(currentFY);

  // Choose counter ID based on type
  const counterId = type === "vendor" ? 2 : 1;

  const counter = await prisma.invoiceCounter.findUnique({
    where: { id: counterId },
  });

  let nextCount = 1;

  if (counter && counter.financialYear === currentFY) {
    nextCount = counter.count + 1;
  }

  const padded = String(nextCount).padStart(4, "0");

  let invoiceNumber: string;

  if (type === "vendor") {
    invoiceNumber = `RS-V-${shortFY}-${padded}`;
  } else {
    // client (default)
    invoiceNumber = `RS-INV-${shortFY}-${padded}`;
  }

  return NextResponse.json({
    invoiceNumber,
    type,
    nextCount,
    financialYear: currentFY,
  });
}

/**
 * POST → Reserve & increment number (called on final save)
 * Body: { type: "client" | "vendor" }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const type = body.type?.toLowerCase() || "client";

  const currentFY = getFinancialYear();
  const shortFY = getShortFY(currentFY);

  // Choose counter ID based on type
  const counterId = type === "vendor" ? 2 : 1;

  const counter = await prisma.invoiceCounter.findUnique({
    where: { id: counterId },
  });

  let nextCount = 1;

  if (counter && counter.financialYear === currentFY) {
    nextCount = counter.count + 1;
  }

  // Upsert (create or update)
  await prisma.invoiceCounter.upsert({
    where: { id: counterId },
    update: {
      count: nextCount,
      financialYear: currentFY,
    },
    create: {
      id: counterId,
      count: nextCount,
      financialYear: currentFY,
    },
  });

  const padded = String(nextCount).padStart(4, "0");

  let invoiceNumber: string;

  if (type === "vendor") {
    invoiceNumber = `RS-V-${shortFY}-${padded}`;
  } else {
    invoiceNumber = `RS-INV-${shortFY}-${padded}`;
  }

  return NextResponse.json({
    invoiceNumber,
    type,
    nextCount,
    financialYear: currentFY,
  });
}
