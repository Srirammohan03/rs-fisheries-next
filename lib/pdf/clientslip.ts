// lib/pdf/clientslip.ts
import { toast } from "sonner";
import type { ClientReceipt } from "../receipts";

/**
 * Client Tab Action:
 * DO NOT generate receipt PDF.
 * ONLY open the uploaded proof file (image or PDF) in a new tab.
 */
export const generateClientReceiptPDF = async (receipt: ClientReceipt) => {
    try {
        const url = receipt?.imageUrl?.trim();

        if (!url) {
            toast.error("No uploaded file found for this client payment");
            return;
        }

        // Open file directly (PDF or image)
        const win = window.open(url, "_blank", "noopener,noreferrer");

        // Popup blockers case
        if (!win) {
            toast.error("Popup blocked. Please allow popups to view the file.");
        }
    } catch (err) {
        console.error(err);
        toast.error("Failed to open uploaded file");
    }
};
