// lib/pdf-utils.ts
import jsPDF from "jspdf";

export const safeText = (v?: string | null): string => v ?? "—";

export const formatDate = (date?: string | Date | null): string => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN");
};

export const formatAmount = (value?: number | null): string => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export const amountToWords = (amount?: number | null): string => {
    const num = Math.floor(Number(amount) || 0);
    if (num === 0) return "Zero only";

    const words = require("number-to-words");
    return (
        words.toWords(num).replace(/^\w/, (c: string) => c.toUpperCase()) + " only"
    );
};

// Async header — supports logo via base64
export const drawCompanyHeader = async (
    doc: jsPDF,
    left: number,
    right: number,
    logoDataUrl?: string | null
): Promise<void> => {
    if (logoDataUrl) {
        try {
            const format = logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
            doc.addImage(logoDataUrl, format, left, 18, 30, 30);
        } catch (e) {
            console.warn("Failed to render logo:", e);
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RS FISHERIES PVT LTD", right, 24, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
        [
            "Hyderabad, Telangana - 500072",
            "Phone: +91 40 1234 5678",
            "Email: accounts@rsfisheries.com",
        ],
        right,
        30,
        { align: "right", lineHeightFactor: 1.45 }
    );
};

export const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;

        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

export const isPdfFile = (url: string): boolean =>
    url.toLowerCase().endsWith(".pdf");