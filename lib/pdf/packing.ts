// lib/pdf/packing.ts
import jsPDF from "jspdf";
import { toast } from "sonner";

import {
    safeText,
    formatDate,
    formatAmount,
    amountToWords,
    drawCompanyHeader,
    loadImageAsBase64,
} from "@/lib/pdf-utils";
import { PackingReceipt } from "../receipts";

export const generatePackingPDF = async (receipt: PackingReceipt) => {
    try {
        const doc = new jsPDF("p", "mm", "a4");

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        const left = margin + 6;
        const right = pageWidth - margin - 6;
        const width = right - left;

        /* ================= PAGE BORDER ================= */
        doc.setLineWidth(0.8);
        doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

        /* ================= LOAD LOGO ================= */
        let logoDataUrl: string | null = null;
        try {
            logoDataUrl = await loadImageAsBase64("/assets/favicon.png"); // Change to your actual file
            if (!logoDataUrl) {
                console.warn("Logo load returned null (fetch failed or invalid image)");
            }
        } catch (e) {
            console.warn("Logo loading error:", e);
        }

        /* ================= HEADER ================= */
        await drawCompanyHeader(doc, left, right, logoDataUrl);

        /* ================= TITLE ================= */
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("PACKING AMOUNT RECEIPT", pageWidth / 2, 72, {
            align: "center",
        });

        doc.setLineWidth(0.4);
        doc.line(left, 76, right, 76);

        /* ================= META ================= */
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Bill No: ${safeText(receipt.billNo)}`, left, 86);
        doc.text(`Date: ${formatDate(receipt.date)}`, right, 86, {
            align: "right",
        });

        /* ================= DETAILS GRID ================= */
        const boxTop = 96;
        const rowH = 16;
        const rows = 4;
        const half = width / 2;
        const pad = 6;

        doc.setLineWidth(0.35);
        doc.rect(left, boxTop, width, rowH * rows);

        doc.line(left + half, boxTop, left + half, boxTop + rowH * rows);

        for (let i = 1; i < rows; i++) {
            doc.line(left, boxTop + rowH * i, right, boxTop + rowH * i);
        }

        const cell = (
            col: "L" | "R",
            row: number,
            label: string,
            value?: string | null | number
        ) => {
            const x = col === "L" ? left : left + half;
            const y = boxTop + row * rowH + 11;

            doc.setFont("helvetica", "normal");
            doc.text(label, x + pad, y);

            doc.setFont("helvetica", "bold");
            doc.text(safeText(String(value)), x + half - pad, y, { align: "right" });
        };

        cell("L", 0, "Party Name", receipt.partyName);
        cell(
            "R",
            0,
            "Mode",
            receipt.mode === "loading" ? "Loading" : "Unloading"
        );

        cell("L", 1, "Vehicle No", receipt.vehicleNo);
        cell("R", 1, "Temperature", `${receipt.temperature} °C`);

        cell("L", 2, "No. of Workers", receipt.workers);
        cell(
            "R",
            2,
            "Payment Mode",
            receipt.paymentMode === "CHEQUE" ? "Cheque" : receipt.paymentMode
        );

        cell("L", 3, "Reference", receipt.reference);

        /* ================= TOTAL ================= */
        let y = boxTop + rowH * rows + 20;
        const totalBoxHeight = 22;

        doc.setLineWidth(0.7);
        doc.rect(left, y, width, totalBoxHeight);

        const totalTextY = y + totalBoxHeight / 2 + 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("TOTAL AMOUNT", left + 10, totalTextY);

        const amount = receipt.totalAmount ?? receipt.amount ?? 0;

        doc.text(
            `Rs. ${formatAmount(amount)}`,
            right - 10,
            totalTextY,
            { align: "right" }
        );

        /* ================= AMOUNT IN WORDS ================= */
        y += totalBoxHeight + 10;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Amount in words: ${amountToWords(amount)}`,
            left,
            y
        );

        /* ================= TERMS ================= */
        y += 18;
        doc.setFont("helvetica", "bold");
        doc.text("Terms & Conditions", left, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(
            [
                "1. This receipt confirms payment towards packing",
                "2. Payment once made is non-refundable and non-adjustable under any circumstances.",
            ],
            left + 2,
            y + 8,
            { lineHeightFactor: 1.6 }
        );

        /* ================= FOOTER ================= */
        const signY = pageHeight - margin - 30;
        doc.line(right - 80, signY, right, signY);
        doc.setFontSize(10);
        doc.text("Authorized Signature", right - 80, signY + 6);

        doc.text(
            "Thank you for your business!",
            pageWidth / 2,
            pageHeight - margin - 10,
            { align: "center" }
        );

        doc.save(`packing-receipt-${safeText(receipt.billNo)}.pdf`);
        window.open(doc.output("bloburl"), "_blank");
    } catch (error) {
        console.error("Packing PDF Error:", error);
        toast.error("Failed to generate packing receipt");
    }
};