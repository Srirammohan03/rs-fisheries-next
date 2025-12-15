// lib/pdf-utils.ts
import jsPDF from "jspdf";

export const safeText = (v?: string | null) => v ?? "—";

export const formatDate = (date?: string | Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN");
};

export const formatAmount = (value: number) =>
    value.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const amountToWords = (amount: number) => {
    const words = require("number-to-words");
    return (
        words.toWords(amount).replace(/^\w/, (c: string) => c.toUpperCase()) +
        " only"
    );
};

export const drawCompanyHeader = (
    doc: jsPDF,
    left: number,
    right: number
) => {
    try {
        doc.addImage("/favicon.jpg", "JPEG", left, 18, 30, 30);
    } catch { }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("GODAVARI STEELS", right, 24, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
        [
            "D.No 26-2-1272, Shankaran Colony",
            "Near Ayyappa Temple, GNT Road",
            "Nellore - 524004",
            "Phone: +91 98765 43210",
            "Email: info@rsfisheries.com",
        ],
        right,
        30,
        { align: "right", lineHeightFactor: 1.45 }
    );
};
export const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;

        const blob = await res.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};
export const isPdfFile = (url: string) =>
    url.toLowerCase().endsWith(".pdf");
