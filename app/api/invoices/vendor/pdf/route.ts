// app/api/invoices/vendor/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import { buildVendorInvoicePDF } from "@/lib/pdf/vendor-invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const paymentId = req.nextUrl.searchParams.get("paymentId");
        if (!paymentId) {
            return NextResponse.json({ message: "Missing paymentId" }, { status: 400 });
        }

        const invoice = await prisma.vendorInvoice.findUnique({
            where: { paymentId },
        });

        if (!invoice) {
            return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
        }

        // Use env var for production domain/IP, fallback to request origin for local dev
        const origin = process.env.APP_URL || req.nextUrl.origin;
        const pdfUrl = `${origin}/api/invoices/vendor/pdf?paymentId=${invoice.paymentId}`;

        let qrDataUrl: string | undefined;
        try {
            const mod: any = await import("qrcode");
            const QR = mod?.default ?? mod;

            qrDataUrl = await QR.toDataURL(pdfUrl, {
                errorCorrectionLevel: "M",
                margin: 0,
                scale: 6,
            });
            console.log("QR generated successfully →", pdfUrl);
        } catch (e) {
            console.error("QR generation failed:", e);
        }

        const buf = await buildVendorInvoicePDF(
            jsPDF,
            {
                invoiceNo: invoice.invoiceNo,
                invoiceDate: invoice.invoiceDate.toISOString(),
                vendorName: invoice.vendorName,
                description: invoice.description ?? undefined,
                hsn: invoice.hsn,
                gstPercent: Number(invoice.gstPercent),
                taxableValue: Number(invoice.taxableValue),
                gstAmount: Number(invoice.gstAmount),
                totalAmount: Number(invoice.totalAmount),
            },
            {
                qrDataUrl, // This will now be the full URL QR
            }
        );

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="Invoice_${invoice.invoiceNo}.pdf"`,
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: "Failed to generate invoice PDF" }, { status: 500 });
    }
}