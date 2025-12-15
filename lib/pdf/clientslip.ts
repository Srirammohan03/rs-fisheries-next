// lib/pdf/clientslip.ts
import jsPDF from "jspdf";
import { toast } from "sonner";

import {
    safeText,
    formatDate,
    formatAmount,
    amountToWords,
    drawCompanyHeader,
    loadImageAsBase64,
    isPdfFile,
} from "@/lib/pdf-utils";
import { ClientReceipt } from "../receipts";

export const generateClientReceiptPDF = async (receipt: ClientReceipt) => {
    try {
        const r = receipt;

        const doc = new jsPDF("p", "mm", "a4");
        const w = doc.internal.pageSize.getWidth();
        const h = doc.internal.pageSize.getHeight();
        const m = 15;

        const left = m + 6;
        const right = w - m - 6;

        /* ================= PAGE 1 : RECEIPT ================= */
        doc.setLineWidth(0.8);
        doc.rect(m, m, w - m * 2, h - m * 2);

        drawCompanyHeader(doc, left, right);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("CLIENT PAYMENT RECEIPT", w / 2, 72, { align: "center" });
        doc.line(left, 76, right, 76);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Client Name: ${safeText(r.clientName)}`, left, 86);
        doc.text(`Date: ${formatDate(r.date)}`, right, 86, { align: "right" });

        let y = 98;

        const row = (label: string, value?: string | null) => {
            doc.setFont("helvetica", "normal");
            doc.text(label, left, y);
            doc.setFont("helvetica", "bold");
            doc.text(safeText(value), right, y, { align: "right" });
            y += 10;
        };

        row("Bill No", r.client?.billNo);
        row("Village", r.client?.village);
        row("Payment Mode", r.paymentMode);
        row("Reference", r.reference);

        /* ================= TOTAL ================= */
        y += 6;
        doc.line(left, y, right, y);

        y += 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("TOTAL AMOUNT", left, y);
        doc.text(`Rs. ${formatAmount(r.amount)}`, right, y, { align: "right" });

        y += 12;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`Amount in words: ${amountToWords(r.amount)}`, left, y);

        /* ================= TERMS & CONDITIONS (NEW) ================= */
        y += 16;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Terms & Conditions", left, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(
            [
                "1. This receipt confirms payment received from the client.",
                "2. Amount once paid will not be refundable under any circumstances.",
                "3. This receipt is valid only for the transaction mentioned above.",
                "4. Payment proof attached is for reference purpose only.",
            ],
            left + 2,
            y + 8,
            { lineHeightFactor: 1.6 }
        );

        /* ================= SIGNATURE ================= */
        const signY = h - m - 30;
        doc.line(right - 80, signY, right, signY);
        doc.setFontSize(10);
        doc.text("Authorized Signature", right - 80, signY + 6);

        doc.text(
            "Thank you for your business!",
            w / 2,
            h - m - 10,
            { align: "center" }
        );

        /* ================= PAGE 2 : PAYMENT PROOF ================= */
        if (r.imageUrl) {
            doc.addPage();

            doc.setLineWidth(0.8);
            doc.rect(m, m, w - m * 2, h - m * 2);

            drawCompanyHeader(doc, left, right);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.text("PAYMENT PROOF", w / 2, 72, { align: "center" });
            doc.line(left, 76, right, 76);

            let py = 90;

            if (!isPdfFile(r.imageUrl)) {
                const imgBase64 = await loadImageAsBase64(r.imageUrl);

                if (imgBase64) {
                    doc.rect(left, py, 120, 80);
                    doc.addImage(imgBase64, "JPEG", left + 2, py + 2, 116, 76);
                } else {
                    doc.text("Unable to load payment proof image.", left, py + 10);
                }
            } else {
                doc.setFontSize(12);
                doc.text("Payment proof is provided as a PDF document.", left, py);

                doc.setTextColor(0, 0, 255);
                doc.textWithLink(
                    "Click here to open payment proof PDF",
                    left,
                    py + 12,
                    { url: r.imageUrl }
                );
                doc.setTextColor(0, 0, 0);
            }
        }

        doc.save(`client-receipt-${safeText(r.clientName)}.pdf`);
        window.open(doc.output("bloburl"), "_blank");
    } catch (err) {
        console.error(err);
        toast.error("Failed to generate client receipt");
    }
};
