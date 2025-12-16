import jsPDF from "jspdf";

interface VendorInvoiceData {
    invoiceNo: string;
    invoiceDate: string;
    vendorName: string;
    billTo: string;
    shipTo: string;
    hsn: string;
    gstPercent: number;
    taxableValue: number;
    gstAmount: number;
    totalAmount: number;
}

const formatMoney = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

export function generateVendorInvoicePDF(
    JsPDF: typeof jsPDF,
    data: VendorInvoiceData
) {
    const doc = new JsPDF("p", "mm", "a4");
    const margin = 12;
    let y = 15;

    doc.setFontSize(16).setFont("Helvetica", "bold");
    doc.text("TAX INVOICE", 105, y, { align: "center" });

    y += 10;
    doc.setFontSize(10).setFont("Helvetica", "normal");
    doc.text(`Invoice No: ${data.invoiceNo}`, margin, y);
    doc.text(`Date: ${new Date(data.invoiceDate).toLocaleDateString("en-IN")}`, 150, y);

    y += 6;
    doc.line(margin, y, 200, y);
    y += 6;

    doc.setFont("Helvetica", "bold");
    doc.text("Bill To:", margin, y);
    doc.text("Ship To:", 110, y);

    doc.setFont("Helvetica", "normal");
    y += 5;
    doc.text(data.billTo || "—", margin, y);
    doc.text(data.shipTo || "—", 110, y);

    y += 20;

    doc.setFont("Helvetica", "bold");
    doc.text("HSN:", margin, y);
    doc.text("Taxable:", 70, y);
    doc.text("GST:", 120, y);
    doc.text("Total:", 160, y);

    doc.setFont("Helvetica", "normal");
    y += 6;
    doc.text(data.hsn, margin, y);
    doc.text(formatMoney(data.taxableValue), 70, y);
    doc.text(formatMoney(data.gstAmount), 120, y);
    doc.text(formatMoney(data.totalAmount), 160, y);

    y += 20;
    doc.setFont("Helvetica", "bold");
    doc.text(`Grand Total: ₹ ${formatMoney(data.totalAmount)}`, margin, y);

    doc.setFontSize(8).setFont("Helvetica", "normal");
    doc.text("This is a computer generated invoice", 105, 290, { align: "center" });

    doc.save(`Invoice_${data.invoiceNo}.pdf`);
}
