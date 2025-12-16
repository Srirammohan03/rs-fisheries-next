// lib\invoicePdf.ts
"use client";

import jsPDF from "jspdf";

export type InvoiceItem = {
    description: string;
    hsn?: string;
    qty: number;
    rate: number;
    amount: number;
};

export type InvoicePayload = {
    partyName?: string;
    partyAddress?: string;
    date?: string; // ISO
    items: InvoiceItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
};

/**
 * reserveInvoice -> POSTs to /api/invoices to reserve a number & create DB record.
 * Returns { invoiceNumber, invoice }
 */
async function reserveInvoice(payload: InvoicePayload) {
    const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error("Failed to reserve invoice: " + text);
    }
    return res.json();
}

/**
 * generateInvoicePdf: create a formatted invoice PDF and prompt download / open.
 * Uses a simple layout similar to your design: header, party block, table with HSN, totals.
 */
export async function generateInvoicePdf(payload: InvoicePayload) {
    // reserve invoice in DB & get invoice number
    const res = await reserveInvoice(payload);
    const invoiceNumber: string = res.invoiceNumber;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const margin = 14;
    let y = 18;

    // Header
    doc.setFontSize(20);
    doc.text("RS Fisheries", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNumber}`, margin, y);
    doc.text(`Date: ${new Date(payload.date ?? Date.now()).toLocaleDateString("en-IN")}`, pageWidth - margin, y, { align: "right" });
    y += 8;

    // Party block
    doc.setFontSize(11);
    doc.text("Bill To:", margin, y);
    doc.setFontSize(10);
    const partyLines = (payload.partyName ? [payload.partyName] : []).concat(
        (payload.partyAddress ?? "").split("\n")
    );
    partyLines.forEach((ln) => {
        y += 5;
        doc.text(ln, margin, y);
    });

    // Table header
    y += 12;
    const tableX = margin;
    const colDescW = 90;
    const colHsnW = 25;
    const colQtyW = 20;
    const colRateW = 30;
    const colAmtW = 30;
    const rowH = 8;

    doc.setFontSize(10);
    doc.setDrawColor(0);
    doc.rect(tableX - 2, y - 6, pageWidth - margin * 2 + 4, rowH, "S"); // header box
    doc.text("Description of Goods", tableX, y);
    doc.text("HSN/SAC", tableX + colDescW + 6, y);
    doc.text("Qty", tableX + colDescW + colHsnW + 12, y);
    doc.text("Rate", tableX + colDescW + colHsnW + colQtyW + 16, y);
    doc.text("Amount", pageWidth - margin - 8, y, { align: "right" });

    // Items
    y += 6;
    doc.setLineWidth(0.2);
    payload.items.forEach((it, idx) => {
        const rowY = y + rowH * idx;
        // draw row border
        doc.rect(tableX - 2, rowY - 2, pageWidth - margin * 2 + 4, rowH, "S");

        // description wrap
        const descX = tableX;
        const descMaxWidth = colDescW;
        const descLines = doc.splitTextToSize(it.description, descMaxWidth);
        doc.text(descLines, descX, rowY + 4 - rowH / 2);

        // HSN
        doc.text(it.hsn ?? "-", tableX + colDescW + 6, rowY + 4 - rowH / 2);

        // qty
        doc.text(String(it.qty), tableX + colDescW + colHsnW + 12, rowY + 4 - rowH / 2);

        // rate
        doc.text(it.rate.toFixed(2), tableX + colDescW + colHsnW + colQtyW + 16, rowY + 4 - rowH / 2);

        // amount aligned right
        doc.text(it.amount.toFixed(2), pageWidth - margin, rowY + 4 - rowH / 2, { align: "right" });
    });

    y = y + rowH * payload.items.length + 12;

    // Totals box
    const totalsX = pageWidth - margin - 70;
    doc.setFontSize(10);
    doc.text("Subtotal", totalsX, y);
    doc.text(payload.subtotal.toFixed(2), pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.text("Tax", totalsX, y);
    doc.text(payload.taxAmount.toFixed(2), pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.setFontSize(12);
    doc.text("Total", totalsX, y);
    doc.text(payload.total.toFixed(2), pageWidth - margin, y, { align: "right" });

    // Footer / in words (basic)
    y += 12;
    doc.setFontSize(9);
    doc.text(`Amount (in words): ₹ ${toIndianWords(Math.round(payload.total))} only`, margin, y);

    // Save & open
    const filename = `Invoice-${invoiceNumber}.pdf`;
    doc.save(filename);
    // open in new tab - get blob and create object URL
    const blob = doc.output("blob") as Blob;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
}

/** Helper: convert numbers to base Indian words (simple) */
function toIndianWords(n: number): string {
    // basic implementation — for production use a library (e.g., 'number-to-words' with custom formatter)
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if (n === 0) return "Zero";
    function upToThousand(num: number) {
        let str = "";
        if (num >= 100) {
            str += ones[Math.floor(num / 100)] + " Hundred ";
            num = num % 100;
        }
        if (num >= 20) {
            str += tens[Math.floor(num / 10)] + " " + ones[num % 10] + " ";
        } else if (num > 0) {
            str += ones[num] + " ";
        }
        return str.trim();
    }
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const rest = n;
    const parts = [];
    if (crore) parts.push(`${upToThousand(crore)} Crore`);
    if (lakh) parts.push(`${upToThousand(lakh)} Lakh`);
    if (thousand) parts.push(`${upToThousand(thousand)} Thousand`);
    if (rest) parts.push(upToThousand(rest));
    return parts.join(" ").trim();
}
