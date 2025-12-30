import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { prisma } from "@/lib/prisma";
import { buildVendorInvoicePDF } from "@/lib/pdf/vendor-invoice";

export const runtime = "nodejs";

type SourceType = "farmer" | "agent" | "client";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const invoiceNo = searchParams.get("invoiceNo");

        if (!invoiceNo) {
            return NextResponse.json({ error: "invoiceNo is required" }, { status: 400 });
        }

        const inv = await prisma.vendorInvoice.findUnique({
            where: { invoiceNo },
            include: { payment: true },
        });

        if (!inv) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // ✅ Use DB values first (new invoices)
        const source = (inv.source || searchParams.get("source") || "") as SourceType;
        const sourceRecordId =
            (inv as any).sourceRecordId || searchParams.get("sourceRecordId") || "";

        // 1) Load line items from the correct source record
        let rawItems: any[] = [];
        if (source && sourceRecordId) {
            if (source === "farmer") {
                const loading = await prisma.formerLoading.findUnique({
                    where: { id: sourceRecordId },
                    include: { items: true },
                });
                rawItems = loading?.items ?? [];
            } else if (source === "agent") {
                const loading = await prisma.agentLoading.findUnique({
                    where: { id: sourceRecordId },
                    include: { items: true },
                });
                rawItems = loading?.items ?? [];
            } else if (source === "client") {
                const loading = await prisma.clientLoading.findUnique({
                    where: { id: sourceRecordId },
                    include: { items: true },
                });
                rawItems = loading?.items ?? [];
            }
        }

        // 2) Map varietyCode -> varietyName
        const codes = Array.from(
            new Set(rawItems.map((i) => String(i.varietyCode || "")).filter(Boolean))
        );

        const varieties = codes.length
            ? await prisma.fishVariety.findMany({
                where: { code: { in: codes } },
                select: { code: true, name: true },
            })
            : [];

        const nameMap = new Map(varieties.map((v) => [v.code, v.name]));

        const enrichedItems = rawItems.map((i) => {
            const code = String(i.varietyCode ?? "").trim();
            const name = (nameMap.get(code) || "").trim();

            return {
                varietyCode: code,                 // ✅ always
                varietyName: name || code,         // ✅ fallback to code
                qty: i.qty ?? i.totalKgs ?? 0,
                uom: i.uom ?? "KGS",
                amount: i.amount ?? i.totalPrice ?? 0,
                hsn: i.hsn ?? inv.hsn,
            };
        });

        // 3) QR URL MUST be full PDF URL (not invoiceNo)
        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.APP_URL ||
            `https://${req.headers.get("host")}`;

        // ✅ include source + sourceRecordId so old invoices also work
        const qrUrl =
            `${appUrl}/api/invoices/pdf?invoiceNo=${encodeURIComponent(invoiceNo)}` +
            (source ? `&source=${encodeURIComponent(source)}` : "") +
            (sourceRecordId ? `&sourceRecordId=${encodeURIComponent(sourceRecordId)}` : "");

        // 4) Build PDF data
        const data = {
            invoiceNo: inv.invoiceNo,
            invoiceDate: inv.invoiceDate.toISOString(),

            vendorName: inv.vendorName,
            vendorAddress: inv.payment?.bankAddress ?? "",
            vendorGSTIN: "",
            vendorStateName: "",
            vendorStateCode: "",
            vendorEmail: "",

            billTo: "",
            shipTo: "",

            hsn: inv.hsn,
            gstPercent: Number(inv.gstPercent),
            taxableValue: Number(inv.taxableValue),
            gstAmount: Number(inv.gstAmount),
            totalAmount: Number(inv.totalAmount),

            companyPAN: "",
            bankName: inv.payment?.bankName ?? "",
            bankAccNo: inv.payment?.accountNumber ?? "",
            bankIFSC: inv.payment?.ifsc ?? "",
            bankBranch: "",

            items: enrichedItems,
            qrText: qrUrl, // ✅ THIS is what QR will encode
        };

        const pdfArrayBuffer = await buildVendorInvoicePDF(jsPDF as any, data as any);

        // ✅ Use Buffer to avoid BodyInit TS issues everywhere
        const pdfBuffer = Buffer.from(pdfArrayBuffer);

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                // NOTE: many scanners open in browser; inline shows PDF reliably
                "Content-Disposition": `inline; filename="Invoice_${invoiceNo}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to generate PDF", details: err?.message ?? String(err) },
            { status: 500 }
        );
    }
}
