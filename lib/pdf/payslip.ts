// lib/pdf/payslip.ts
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
import { EmployeeReceipt } from "../receipts";

export const generatePayslipPDF = async (receipt: EmployeeReceipt): Promise<void> => {
  try {
    const r = receipt;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const left = margin + 6;
    const right = pageWidth - margin - 6;

    /* ================= PAGE BORDER ================= */
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    /* ================= LOAD LOGO ================= */
    let logoDataUrl: string | null = null;
    try {
      logoDataUrl = await loadImageAsBase64("/assets/favicon.png"); // Place your logo here
    } catch (e) {
      console.warn("Logo failed to load:", e);
    }

    /* ================= HEADER ================= */
    await drawCompanyHeader(doc, left, right, logoDataUrl);

    /* ================= TITLE ================= */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("EMPLOYEE PAYSLIP", pageWidth / 2, 72, { align: "center" });

    doc.setLineWidth(0.4);
    doc.line(left, 76, right, 76);

    /* ================= META ================= */
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Employee Name: ${safeText(r.employeeName)}`, left, 86);
    doc.text(`Date: ${formatDate(r.date)}`, right, 86, { align: "right" });

    /* ================= EMPLOYEE DETAILS ================= */
    let y = 96;
    const labelGap = 50;

    const detailRow = (label: string, value?: string | null | number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(label, left, y);

      doc.setFont("helvetica", "bold");
      doc.text(safeText(String(value)), left + labelGap, y);
      y += 10;
    };

    detailRow("Role / Designation", r.employee?.designation ?? "—");
    detailRow("Payment Mode", r.paymentMode ?? "—");
    detailRow("Reference", r.reference ?? "—");

    /* ================= EARNINGS SECTION ================= */
    y += 8;
    doc.setLineWidth(0.4);
    doc.line(left, y, right, y);

    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("EARNINGS", left, y);

    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Basic Salary", left, y);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${formatAmount(r.amount)}`, right, y, { align: "right" });

    /* ================= NET PAY ================= */
    y += 15;
    doc.setLineWidth(0.6);
    doc.line(left, y, right, y);

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("NET PAY", left, y);
    doc.text(`Rs. ${formatAmount(r.amount)}`, right, y, { align: "right" });

    /* ================= AMOUNT IN WORDS ================= */
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Amount in words: ${amountToWords(r.amount)}`, left, y);

    /* ================= TERMS & CONDITIONS ================= */
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Terms & Conditions", left, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const terms = [
      "1. This payslip is issued for salary payment only.",
      "2. Salary once paid will not be refundable under any circumstances.",
    ];
    doc.text(terms, left + 2, y + 8, { lineHeightFactor: 1.6 });

    /* ================= FOOTER ================= */
    const signY = pageHeight - margin - 30;
    doc.setLineWidth(0.4);
    doc.line(right - 80, signY, right, signY);
    doc.setFontSize(10);
    doc.text("Authorized Signature", right - 80, signY + 6);

    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your service!", pageWidth / 2, pageHeight - margin - 10, {
      align: "center",
    });

    // Save and open
    doc.save(`payslip-${safeText(r.employeeName)}.pdf`);
    window.open(doc.output("bloburl"), "_blank");
  } catch (err) {
    console.error("Failed to generate payslip:", err);
    toast.error("Failed to generate payslip");
  }
};