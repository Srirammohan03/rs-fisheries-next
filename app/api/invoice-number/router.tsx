// app/api/invoice-number/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Format invoice as RS-Fisheries-0001 */
function formatInvoice(prefix: string, seq: number) {
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/** GET -> peek next invoice number (safe preview) */
export async function GET(req: NextRequest) {
  try {
    const counter = await prisma.invoiceCounter.findUnique({
      where: { id: 1 },
    });
    const next = (counter?.count ?? 0) + 1;
    const invoiceNumber = formatInvoice("RS-Fisheries-", next);
    return NextResponse.json({ invoiceNumber, seq: next });
  } catch (err: any) {
    console.error("invoice-number GET error:", err);
    return NextResponse.json(
      { error: err?.message ?? "server error" },
      { status: 500 }
    );
  }
}

/**
 * POST -> reserve and create an invoice record
 * Body shape:
 * {
 *   partyName?, partyAddress?, date?, items: [{description,hsn,qty,rate,amount}], subtotal, taxAmount, total
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic validation
    if (!body?.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "Missing items array" },
        { status: 400 }
      );
    }

    // Transaction: increment counter and create invoice
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // upsert will create counter if missing
        const updated = await tx.invoiceCounter.upsert({
          where: { id: 1 },
          update: { count: { increment: 1 } as any },
          create: { id: 1, count: 1 },
        });

        const seq = updated.count;
        const invoiceNumber = formatInvoice("RS-Fisheries-", seq);

        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            seq,
            partyName: body.partyName ?? null,
            partyAddress: body.partyAddress ?? null,
            date: body.date ? new Date(body.date) : new Date(),
            items: body.items,
            subtotal: Number(body.subtotal ?? 0),
            taxAmount: Number(body.taxAmount ?? 0),
            total: Number(body.total ?? 0),
          },
        });

        return { inv, invoiceNumber };
      }
    );

    return NextResponse.json({
      ok: true,
      invoiceNumber: result.invoiceNumber,
      invoice: result.inv,
    });
  } catch (err: any) {
    console.error("invoice-number POST error:", err);
    return NextResponse.json(
      { error: err?.message ?? "server error" },
      { status: 500 }
    );
  }
}
