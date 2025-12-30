// lib/pdf/client-invoice.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ---------------- TYPES ---------------- */

export interface ClientInvoiceData {
  invoiceNo: string;
  invoiceDate: string;

  clientName: string;
  billTo?: string;
  shipTo?: string;

  description?: string;
  hsn: string;

  gstPercent: number;
  taxableValue: number;
  gstAmount: number;
  totalAmount: number;

  referenceNo?: string;
  placeOfSupply?: string;
  contactNo?: string;
  state?: string;
  gstin?: string;

  paymentMode?: string;

  // Optional IRN (not used in design to match vendor)
  irn?: string;
  ackNo?: string;
  ackDate?: string;
}

type Doc = InstanceType<typeof jsPDF>;

export type ClientInvoiceAssets = {
  /** Must be DataURL: data:image/jpeg;base64,... or data:image/png;base64,... */
  logoDataUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  qrDataUrl?: string;
  signatureDataUrl?: string;
};

/* ---------------- COMPANY (EDIT HERE) ---------------- */

const COMPANY = {
  name: "RS FISHERIES PVT LTD",
  title: "Tax Invoice",
  addressLine: "Hyderabad, Telangana - 500072",

  phone: "+91 40 1234 5678",
  email: "accounts@rsfisheries.com",
  gstin: "36AAAAA0000A1Z5",
  state: "Telangana",
  placeOfSupplyDefault: "Telangana",

  bankName: "HDFC BANK LIMITED, JUBILEE HILLS ROAD",
  bankAccNo: "7541050000423",
  bankIfsc: "ICIC0007541",
  accountHolder: "RS FISHERIES PVT LTD",

  defaultPaymentMode: "Credit",
};

/* ---------------- HELPERS ---------------- */

const money = (n?: number) =>
  (n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function safeDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN");
}

function amountToWords(num: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (!num || num === 0) return "INR Zero Only";

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return (b[Math.floor(n / 10)] + " " + a[n % 10]).trim();
    if (n < 1000) return (a[Math.floor(n / 100)] + " Hundred " + inWords(n % 100)).trim();
    if (n < 100000) return (inWords(Math.floor(n / 1000)) + " Thousand " + inWords(n % 1000)).trim();
    if (n < 10000000) return (inWords(Math.floor(n / 100000)) + " Lakh " + inWords(n % 100000)).trim();
    return (inWords(Math.floor(n / 10000000)) + " Crore " + inWords(n % 10000000)).trim();
  };

  return `INR ${inWords(Math.floor(num))} Only`;
}

function setBlack(doc: Doc) {
  doc.setDrawColor(0);
  doc.setTextColor(0);
}

function rect(doc: Doc, x: number, y: number, w: number, h: number, lw = 0.35) {
  setBlack(doc);
  doc.setLineWidth(lw);
  doc.rect(x, y, w, h);
}

function hLine(doc: Doc, x1: number, x2: number, y: number, lw = 0.25) {
  setBlack(doc);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

function vLine(doc: Doc, x: number, y1: number, y2: number, lw = 0.25) {
  setBlack(doc);
  doc.setLineWidth(lw);
  doc.line(x, y1, x, y2);
}

function textBox(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize = 8,
  lineH = 3.4,
  bold = false
) {
  const pad = 2;
  doc.setFont("Helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);

  const maxW = w - pad * 2;
  const lines = doc.splitTextToSize((text || "").replace(/\r/g, ""), maxW);
  const startY = y + pad + fontSize * 0.45;

  lines.forEach((line: string, i: number) => {
    const yy = startY + i * lineH;
    if (yy < y + h - pad) doc.text(line, x + pad, yy);
  });
}

function oneLineClamp(doc: Doc, text: string, x: number, y: number, maxW: number, fontSize = 7.2) {
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(fontSize);

  let t = text ?? "";
  if (doc.getTextWidth(t) <= maxW) {
    doc.text(t, x, y);
    return;
  }

  const ell = "…";
  let lo = 0;
  let hi = t.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const test = t.slice(0, mid) + ell;
    if (doc.getTextWidth(test) <= maxW) lo = mid + 1;
    else hi = mid;
  }

  t = t.slice(0, Math.max(0, lo - 1)) + ell;
  doc.text(t, x, y);
}

function detectImageFormat(dataUrl: string): "PNG" | "JPEG" | null {
  if (!dataUrl.startsWith("data:image/")) return null;
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  return null;
}

function detectImageFormatFromContent(dataUrl: string): "PNG" | "JPEG" | null {
  if (!dataUrl.startsWith("data:image/")) return null;
  const parts = dataUrl.split(',');
  if (parts.length < 2) return null;
  const base64 = parts[1];

  // Decode first few bytes
  let bin = '';
  try {
    bin = atob(base64.slice(0, 32));
  } catch {
    return null;
  }

  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }

  // PNG signature
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    return "PNG";
  }

  // JPEG signature
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "JPEG";
  }

  return null;
}

async function addImageSafe(
  doc: Doc,
  dataUrl: string | undefined,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  logoWidth?: number,
  logoHeight?: number
) {
  if (!dataUrl) return;

  let fmt = detectImageFormatFromContent(dataUrl);
  if (!fmt) fmt = detectImageFormat(dataUrl);
  if (!fmt) return;

  let width = logoWidth;
  let height = logoHeight;

  if (width === undefined || height === undefined || width <= 0 || height <= 0) {
    // Load image to get dimensions
    const imgProps = await new Promise<{ width: number, height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = dataUrl;
    });
    width = imgProps.width;
    height = imgProps.height;
  }

  // Calculate fitting size preserving aspect ratio
  let targetW = maxW;
  let targetH = maxH;
  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (targetW / targetH > ratio) {
      targetW = targetH * ratio;
    } else {
      targetH = targetW / ratio;
    }
  }

  const targetX = x + (maxW - targetW) / 2;
  const targetY = y + (maxH - targetH) / 2;

  try {
    doc.addImage(dataUrl, fmt, targetX, targetY, targetW, targetH);
  } catch (e) {
    console.error('Failed to add image:', e);
    // Optionally try the other format as fallback
    const altFmt = fmt === 'JPEG' ? 'PNG' : 'JPEG';
    try {
      doc.addImage(dataUrl, altFmt, targetX, targetY, targetW, targetH);
    } catch {
      // Ignore
    }
  }
}

/* ---------------- CORE RENDER ---------------- */

async function renderClientInvoice(doc: Doc, data: ClientInvoiceData, assets?: ClientInvoiceAssets) {
  const L = 12;
  const R = 198;
  const W = R - L;

  // Totals (ALWAYS consistent)
  // CLIENT INVOICES: Force 0% GST and Total = Taxable Amount (as per your requirement)
  const taxable = Number(data.taxableValue || 0);
  const gst = 0;                    // Always 0
  const total = taxable;            // Total must equal taxable (payment amount)
  const roundedTotal = Math.round(total);
  const roundOff = +(roundedTotal - total).toFixed(2);

  /* ---------------- TITLE ---------------- */
  setBlack(doc);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text(COMPANY.title, (L + R) / 2, 14, { align: "center" });

  /* ---------------- HEADER (NO INNER BORDERS) ---------------- */
  let y = 18;
  const headerH = 24;
  rect(doc, L, y, W, headerH);

  // layout areas (no dividing lines drawn)
  const logoAreaW = 26;
  const rightAreaW = 62;
  const centerAreaW = W - logoAreaW - rightAreaW;

  const logoX = L;
  const centerX = L + logoAreaW;
  const rightX = centerX + centerAreaW;

  // Logo
  await addImageSafe(
    doc,
    assets?.logoDataUrl,
    logoX,
    y,
    logoAreaW,
    headerH,
    assets?.logoWidth,
    assets?.logoHeight
  );

  // Company center
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text(COMPANY.name, centerX + centerAreaW / 2, y + 9, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(COMPANY.addressLine, centerX + centerAreaW / 2, y + 14, { align: "center" });

  // Right info (clamped)
  const pad = 2;
  const maxW = rightAreaW - pad * 2;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.2);
  oneLineClamp(doc, `Phone: ${COMPANY.phone}`, rightX + pad, y + 7.0, maxW, 7.2);
  oneLineClamp(doc, `Email: ${COMPANY.email}`, rightX + pad, y + 10.6, maxW, 7.2);
  oneLineClamp(doc, `GSTIN: ${COMPANY.gstin}`, rightX + pad, y + 14.2, maxW, 7.2);
  oneLineClamp(doc, `State: ${COMPANY.state}`, rightX + pad, y + 17.8, maxW, 7.2);

  y += headerH;

  /* ---------------- BILL TO + INVOICE DETAILS ---------------- */
  const topRowH = 26;
  rect(doc, L, y, W, topRowH);

  const billW = 112;
  vLine(doc, L + billW, y, y + topRowH);

  // Bill To
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("Bill To:", L + 2, y + 6);

  doc.setFont("Helvetica", "normal");
  const billToText = [
    data.clientName || "",
    data.billTo || "",
    data.shipTo ? `Ship To: ${data.shipTo}` : "",
    data.contactNo ? `Contact No: ${data.contactNo}` : "",
    data.state ? `State: ${data.state}` : "",
    data.gstin ? `GSTIN: ${data.gstin}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  textBox(doc, billToText, L, y + 6, billW, topRowH - 6, 7.4, 3.4);

  // Invoice Details (single clean block – no overlay)
  const invX = L + billW;
  const invW = W - billW;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("Invoice Details:", invX + 2, y + 6);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.2);

  const invBlock = [
    `Invoice No: ${data.invoiceNo}`,
    `Date: ${safeDate(data.invoiceDate)}`,
    `Place Of Supply: ${data.placeOfSupply ?? COMPANY.placeOfSupplyDefault}`,
  ].join("\n");

  textBox(doc, invBlock, invX, y + 6, invW, topRowH - 6, 7.2, 3.6);

  y += topRowH + 4;

  /* ---------------- ITEMS TABLE (perfect width) ---------------- */
  // Sum widths = 186 (W) exactly
  autoTable(doc, {
    startY: y,
    theme: "grid",
    tableWidth: W,
    margin: { left: L, right: 210 - R },
    styles: {
      fontSize: 7.6,
      cellPadding: 1.5,
      lineWidth: 0.35,
      lineColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    headStyles: {
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.35,
      lineColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 66 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
    },
    head: [["#", "Item name", "HSN / SAC", "Quantity", "Price / Unit (Rs.)", "GST (Rs.)", "Amount (Rs.)"]],
    body: [
      [
        "1",
        data.description || "Goods / Service",
        data.hsn,
        "1",
        money(taxable),
        money(gst),
        money(total),
      ],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 2;

  /* ---------------- TOTAL STRIP ---------------- */
  rect(doc, L, y, W, 8);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Total", L + 60, y + 5.6);
  doc.text(`Rs. ${money(total)}`, R - 4, y + 5.6, { align: "right" });

  y += 10;

  /* ---------------- TAX SUMMARY + TOTALS (fix words row) ---------------- */
  const lowerH = 38; // increased so "Words" never clips
  rect(doc, L, y, W, lowerH);

  const leftLowerW = 112;
  vLine(doc, L + leftLowerW, y, y + lowerH);

  // Left title
  const taxTitleH = 7;
  hLine(doc, L, L + leftLowerW, y + taxTitleH);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("Tax Summary:", L + 2, y + 5);

  // Tax table inside left
  const taxTableY = y + taxTitleH;
  autoTable(doc, {
    startY: taxTableY,
    theme: "grid",
    margin: { left: L },
    tableWidth: leftLowerW,
    styles: {
      fontSize: 7.0,
      cellPadding: 1.2,
      lineWidth: 0.35,
      lineColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    headStyles: {
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.35,
      lineColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: 44, halign: "right" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 26, halign: "right" },
    },
    head: [["HSN / SAC", "Taxable amount (Rs.)", "Rate (%)", "Amt (Rs.)"]],
    body: [[data.hsn, money(taxable), `${gst.toFixed(0)}%`, money(gst)]],
    foot: [["TOTAL", money(taxable), "", money(gst)]],
  });

  // Right totals panel
  const rightX2 = L + leftLowerW;

  const row1H = 12;
  const row2H = 14; // bigger for words
  const row3H = lowerH - row1H - row2H;

  hLine(doc, rightX2, R, y + row1H);
  hLine(doc, rightX2, R, y + row1H + row2H);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.0);

  doc.text("Sub Total", rightX2 + 2, y + 4.5);
  doc.text(`Rs. ${money(total)}`, R - 3, y + 4.5, { align: "right" });

  doc.text("Round Off", rightX2 + 2, y + 8.5);
  doc.text(`${roundOff >= 0 ? "" : "-"}Rs. ${money(Math.abs(roundOff))}`, R - 3, y + 8.5, { align: "right" });

  doc.setFont("Helvetica", "bold");
  doc.text("Total", rightX2 + 2, y + 11.3);
  doc.text(`Rs. ${money(roundedTotal)}`, R - 3, y + 11.3, { align: "right" });

  // Words
  const wordsY = y + row1H;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.0);
  doc.text("Invoice amount in Words:", rightX2 + 2, wordsY + 4.6);

  doc.setFont("Helvetica", "normal");
  textBox(doc, amountToWords(roundedTotal), rightX2, wordsY + 5.2, R - rightX2, row2H - 5, 6.9, 3.2);

  // Received/Balance
  const r3Y = y + row1H + row2H;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.0);

  doc.text("Received", rightX2 + 2, r3Y + 5.0);
  doc.text("0.00", R - 3, r3Y + 5.0, { align: "right" });

  doc.text("Balance", rightX2 + 2, r3Y + 9.0);
  doc.text(`Rs. ${money(total)}`, R - 3, r3Y + 9.0, { align: "right" });

  y += lowerH;

  /* ---------------- PAYMENT MODE ---------------- */
  const payH = 10;
  rect(doc, L, y, W, payH);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("Payment Mode:", L + 2, y + 6);
  doc.setFont("Helvetica", "normal");
  doc.text(data.paymentMode || COMPANY.defaultPaymentMode, L + 30, y + 6);
  y += payH;

  /* ---------------- TERMS ---------------- */
  const termsH = 12;
  rect(doc, L, y, W, termsH);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("Terms & Conditions:", L + 2, y + 5);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text("Thanks for doing business with us!", L + 2, y + 10);
  y += termsH;

  /* ---------------- FOOTER (Bank | Customer Sign | Company Sign) ---------------- */
  const footerH = 28;
  rect(doc, L, y, W, footerH);

  const bankW = 112;
  const rightFooterW = W - bankW;

  vLine(doc, L + bankW, y, y + footerH);
  const rightMid = L + bankW + rightFooterW / 2;
  vLine(doc, rightMid, y, y + footerH);

  // Bank Details (no big blank space)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("Bank Details:", L + 2, y + 5);

  const bankText = `Name : ${COMPANY.bankName}
Account No. : ${COMPANY.bankAccNo}
IFSC code : ${COMPANY.bankIfsc}
Account holder's name : ${COMPANY.accountHolder}`;

  if (assets?.qrDataUrl) {
    addImageSafe(doc, assets.qrDataUrl, L + 2, y + 7, 18, 18);
    textBox(doc, bankText, L + 20, y + 5, bankW - 20, footerH - 5, 7.0, 3.1);
  } else {
    textBox(doc, bankText, L, y + 5, bankW, footerH - 5, 7.0, 3.1);
  }

  // Customer sign box
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text("Customer Seal & Signature", L + bankW + 2, y + 6);

  // Company sign box
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(`For ${COMPANY.name}:`, rightMid + 2, y + 6);

  // Optional signature
  addImageSafe(doc, assets?.signatureDataUrl, rightMid + 8, y + 9, 40, 12);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text("Authorized Signatory", rightMid + (rightFooterW / 2) / 2, y + footerH - 5, { align: "center" });

  // Bottom note
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text("This is a Computer Generated Invoice", (L + R) / 2, 292, { align: "center" });
}

/* ---------------- EXPORTS ---------------- */

export async function buildClientInvoicePDF(JsPDF: typeof jsPDF, data: ClientInvoiceData, assets?: ClientInvoiceAssets) {
  const doc = new JsPDF("p", "mm", "a4");
  await renderClientInvoice(doc, data, assets);
  return doc.output("arraybuffer");
}

export async function generateClientInvoicePDF(
  JsPDF: typeof jsPDF,
  data: ClientInvoiceData,
  assets?: ClientInvoiceAssets
) {
  const buf = await buildClientInvoicePDF(JsPDF, data, assets);
  const blob = new Blob([buf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice_${data.invoiceNo}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/* ---------------- CLIENT HELPER ----------------
   Put your file here:
   ✅ public/favicon.jpg
   Then load it using: loadImageAsDataUrl("/favicon.jpg")
------------------------------------------------ */

export async function loadImageAsDataUrl(path: string): Promise<string> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Image not found: ${path}`);
  const blob = await res.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}