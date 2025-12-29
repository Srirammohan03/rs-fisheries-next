// lib/pdf/vendor-invoice.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ---------------- TYPES ---------------- */

export interface VendorInvoiceData {
    invoiceNo: string;
    invoiceDate: string;

    vendorName: string;
    vendorAddress?: string;

    description?: string;
    hsn: string;
    gstPercent: number;

    taxableValue: number;
    gstAmount: number;
    totalAmount: number;

    // Optional fields (not used now but kept for compatibility)
    irn?: string;
    ackNo?: string;
    ackDate?: string;
    referenceNo?: string;
}

type Doc = InstanceType<typeof jsPDF>;

/* ---------------- HARDCODED COMMON COMPANY DATA ---------------- */

const COMPANY_DETAILS = {
    billTo: `RS Fisheries Pvt. Ltd.
Plot No. 45, Industrial Area Phase II
Hyderabad, Telangana - 500072
GSTIN: 36AAAAA0000A1Z5
State: Telangana, Code: 36
Email: accounts@rsfisheries.com
Phone: +91 40 1234 5678`,

    shipTo: `RS Fisheries Pvt. Ltd.
Cold Storage Facility
Near Fish Market, Kukatpally
Hyderabad, Telangana - 500072
GSTIN: 36AAAAA0000A1Z5
State: Telangana, Code: 36`,

    companyPAN: "AAAAA0000A",
    bankName: "HDFC Bank",
    bankAccNo: "50200012345678",
    bankIFSC: "HDFC0000123",
    bankBranch: "Jubilee Hills Branch, Hyderabad",

    irn: "dummy-irn-1234567890",
    ackNo: "dummy-ack-0987654321",
    ackDate: "2025-12-26",
};

/* ---------------- HELPERS ---------------- */

const money = (n?: number) =>
    (n ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

function amountToWords(num: number): string {
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (!num || num === 0) return "INR Zero Only";

    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return (b[Math.floor(n / 10)] + " " + a[n % 10]).trim();
        if (n < 1000) return a[Math.floor(n / 100)] + " Hundred " + inWords(n % 100);
        if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand " + inWords(n % 1000);
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh " + inWords(n % 100000);
        return inWords(Math.floor(n / 10000000)) + " Crore " + inWords(n % 10000000);
    };

    return `INR ${inWords(Math.floor(num))} Only`;
}

function setOuterLine(doc: Doc) { doc.setLineWidth(0.45); }
function setInnerLine(doc: Doc) { doc.setLineWidth(0.25); }

function rectOuter(doc: Doc, x: number, y: number, w: number, h: number) {
    setOuterLine(doc);
    doc.rect(x, y, w, h);
}

function lineInner(doc: Doc, x1: number, y1: number, x2: number, y2: number) {
    setInnerLine(doc);
    doc.line(x1, y1, x2, y2);
}

function textBox(
    doc: Doc,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    fontSize = 8,
    lineH = 3.8
) {
    const pad = 2.2;
    doc.setFontSize(fontSize);
    const maxW = w - pad * 2;
    const lines = doc.splitTextToSize((text || "").replace(/\r/g, ""), maxW);
    const startY = y + pad + fontSize * 0.45;

    lines.forEach((line: string, i: number) => {
        const yy = startY + i * lineH;
        if (yy < y + h - pad) {
            doc.text(line, x + pad, yy);
        }
    });
}

function metaCell(
    doc: Doc,
    label: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number
) {
    const pad = 2.2;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    const content = value ? `${label} : ${value}` : `${label} :`;
    const lineY = y + pad + h / 2 + 1;
    doc.text(content, x + pad, lineY);
}

/* ---------------- CORE RENDER ---------------- */

async function renderVendorInvoice(doc: Doc, data: VendorInvoiceData) {
    const L = 10;
    const R = 200;
    const W = R - L;
    const T = 10;
    const PAGE_BOTTOM = 287;

    // HEADER
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVOICE", 105, T + 6, { align: "center" });

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.text("(ORIGINAL FOR RECIPIENT)", 105, T + 10, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);

    // IRN/Ack box with hardcoded values
    const irnBoxX = L;
    const irnBoxY = T + 16;
    const irnBoxW = R - L; // Full width
    const irnBoxH = 20;
    rectOuter(doc, irnBoxX, irnBoxY, irnBoxW, irnBoxH);

    doc.setFontSize(8);
    const irnBlock = `IRN : ${COMPANY_DETAILS.irn}\nAck No. : ${COMPANY_DETAILS.ackNo}\nAck Date : ${COMPANY_DETAILS.ackDate}`;
    textBox(doc, irnBlock, irnBoxX, irnBoxY, irnBoxW, irnBoxH, 8, 4);

    // MAIN BOX
    const mainBoxY = T + 40;
    const mainBoxH = 78;
    rectOuter(doc, L, mainBoxY, W, mainBoxH);

    const leftW = 110;
    const rightX = L + leftW;
    lineInner(doc, rightX, mainBoxY, rightX, mainBoxY + mainBoxH);

    const sellerH = 26;
    const shipH = 26;
    const billH = mainBoxH - sellerH - shipH;

    const sellerY = mainBoxY;
    const shipY = mainBoxY + sellerH;
    const billY = shipY + shipH;

    lineInner(doc, L, shipY, rightX, shipY);
    lineInner(doc, L, billY, rightX, billY);

    // Seller (Vendor) Details – NO BOLD
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    const sellerLines: string[] = [];
    sellerLines.push(data.vendorName || "");
    if (data.vendorAddress) sellerLines.push(data.vendorAddress);
    textBox(doc, sellerLines.join("\n"), L, sellerY, leftW, sellerH, 9, 4);

    // HARDCODED Bill To & Ship To
    doc.setFont("Helvetica", "normal");
    textBox(doc, `Consignee (Ship to)\n${COMPANY_DETAILS.shipTo}`, L, shipY, leftW, shipH, 7.8, 3.6);
    textBox(doc, `Buyer (Bill to)\n${COMPANY_DETAILS.billTo}`, L, billY, leftW, billH, 7.8, 3.6);

    // RIGHT META GRID
    const metaX = rightX;
    const metaY = mainBoxY;
    const metaW = R - rightX;
    const metaH = mainBoxH;

    const midX = metaX + metaW * 0.56;
    lineInner(doc, midX, metaY, midX, metaY + metaH);

    const rows = 8;
    const rowH = metaH / rows;
    for (let i = 1; i < rows; i++) {
        lineInner(doc, metaX, metaY + i * rowH, R, metaY + i * rowH);
    }

    const fmtDate = data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString("en-IN") : "";

    const leftMeta: Array<[string, string]> = [
        ["Invoice No.", data.invoiceNo ?? ""],
        ["Delivery Note", ""],
        ["Reference No. & Date.", data.referenceNo ?? ""],
        ["Buyer's Order No.", ""],
        ["Dispatch Doc No.", ""],
        ["Dispatched through", ""],
        ["Bill of Lading/L-RR No.", ""],
        ["Terms of Delivery", ""],
    ];

    const rightMeta: Array<[string, string]> = [
        ["Dated", fmtDate],
        ["Mode", "Cash / Bank"],
        ["Other References", ""],
        ["Dated", ""],
        ["Delivery Note Date", ""],
        ["Destination", ""],
        ["Motor Vehicle No.", ""],
        ["", ""],
    ];

    for (let i = 0; i < rows; i++) {
        const cellY = metaY + i * rowH;
        metaCell(doc, leftMeta[i][0], leftMeta[i][1], metaX, cellY, midX - metaX, rowH);
        metaCell(doc, rightMeta[i][0], rightMeta[i][1], midX, cellY, R - midX, rowH);
    }

    // ITEMS TABLE
    const itemsStartY = mainBoxY + mainBoxH + 6;
    const items = [{
        description: data.description || "Goods / Service",
        hsn: data.hsn,
        qty: 1,
        uom: "KGS",
        rate: data.taxableValue,
        amount: data.taxableValue,
    }];

    autoTable(doc, {
        startY: itemsStartY,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.8, lineWidth: 0.45, fillColor: [255, 255, 255] },
        headStyles: { fontStyle: "bold", halign: "center", lineWidth: 0.45, fillColor: [255, 255, 255], textColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 62 },
            2: { cellWidth: 22, halign: "center" },
            3: { cellWidth: 22, halign: "right" },
            4: { cellWidth: 22, halign: "right" },
            5: { cellWidth: 20, halign: "right" },
            6: { cellWidth: 10, halign: "center" },
            7: { cellWidth: 22, halign: "right" },
        },
        head: [["Sl.No.", "Description of Goods", "HSN/SAC", "Quantity", "Rate (Incl. of Tax)", "Rate", "per", "Amount"]],
        body: items.map((it, idx) => [
            String(idx + 1),
            it.description,
            it.hsn,
            `${it.qty} ${it.uom}`,
            "",
            money(it.rate),
            it.uom,
            money(it.amount),
        ]),
    });

    let y = (doc as any).lastAutoTable.finalY + 12;
    doc.setFont("Helvetica", "bold");
    doc.text("Total", 120, y);
    doc.text(`₹ ${money(data.totalAmount)}`, R - 2, y, { align: "right" });

    y += 12;
    const wordsBoxH = 14;
    rectOuter(doc, L, y, W, wordsBoxH);
    textBox(doc, `Amount Chargeable (in words)\n${amountToWords(data.totalAmount)}`, L, y, W, wordsBoxH, 8, 4);

    y += wordsBoxH + 6;

    // Tax Table with green head
    autoTable(doc, {
        startY: y,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.8, lineWidth: 0.45, fillColor: [255, 255, 255] },
        headStyles: { fontStyle: "bold", halign: "center", lineWidth: 0.45, fillColor: [255, 255, 255], textColor: [0, 0, 0] },
        footStyles: { fontStyle: "bold", halign: "center", lineWidth: 0.45, fillColor: [255, 255, 255], textColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 35, halign: "center" },
            1: { cellWidth: 45, halign: "right" },
            2: { cellWidth: 22, halign: "center" },
            3: { cellWidth: 35, halign: "right" },
            4: { cellWidth: 35, halign: "right" },
        },
        head: [["HSN/SAC", "Taxable Value", "IGST Rate", "IGST Amount", "Total Tax Amount"]],
        body: [[data.hsn, money(data.taxableValue), "0%", "0.00", "0.00"]],
        foot: [["Total", money(data.taxableValue), "", "0.00", "0.00"]],
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Bottom Block
    const bottomBoxH = PAGE_BOTTOM - y - 8;
    rectOuter(doc, L, y, W, bottomBoxH);
    const bSplitX = L + W * 0.58;
    lineInner(doc, bSplitX, y, bSplitX, y + bottomBoxH);

    textBox(
        doc,
        `Company's PAN : ${COMPANY_DETAILS.companyPAN}\n\nDeclaration\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\n\n\nCustomer's Seal and Signature`,
        L, y, bSplitX - L, bottomBoxH, 8, 3.8
    );

    textBox(
        doc,
        `Company's Bank Details\nBank Name : ${COMPANY_DETAILS.bankName}\nA/c No. : ${COMPANY_DETAILS.bankAccNo}\nBranch & IFS Code : ${COMPANY_DETAILS.bankBranch} ${COMPANY_DETAILS.bankIFSC}\n\n\n\n\n\nAuthorised Signatory`,
        bSplitX, y, R - bSplitX, bottomBoxH, 8, 3.8
    );

    doc.setFontSize(8);
    doc.text("This is a Computer Generated Invoice", 105, 292, { align: "center" });
}

/* ---------------- EXPORTS ---------------- */

export async function buildVendorInvoicePDF(JsPDF: typeof jsPDF, data: VendorInvoiceData) {
    const doc = new JsPDF("p", "mm", "a4");
    doc.setTextColor(0);
    await renderVendorInvoice(doc, data);
    return doc.output("arraybuffer");
}

export async function generateVendorInvoicePDF(JsPDF: typeof jsPDF, data: VendorInvoiceData) {
    const buf = await buildVendorInvoicePDF(JsPDF, data);
    const blob = new Blob([buf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice_${data.invoiceNo}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
}