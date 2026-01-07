// lib/pdf/client-invoice.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ClientInvoiceData {
  invoiceNo: string;
  invoiceDate: string;

  clientName: string;
  billTo: string; // Full multi-line address
  contactNo?: string;
  state?: string;
  gstin?: string;

  description: string; // Required from dropdown
  hsn: string; // Required from dropdown

  gstPercent: number; // 0 for fisheries
  taxableValue: number;

  // Optional (we will compute if missing)
  gstAmount?: number;
  totalAmount?: number;

  paymentMode?: string; // Optional – only show if exists
  placeOfSupply?: string;
}

type Doc = InstanceType<typeof jsPDF>;

export type ClientInvoiceAssets = {
  logoDataUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  qrDataUrl?: string;
  signatureDataUrl?: string;
};

/* ---------------- COMPANY DETAILS ---------------- */
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
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100)
      return (b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "")).trim();
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred " +
        (n % 100 ? inWords(n % 100) : "")
      ).trim();
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand " +
        (n % 1000 ? inWords(n % 1000) : "")
      ).trim();
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh " +
        (n % 100000 ? inWords(n % 100000) : "")
      ).trim();
    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore " +
      (n % 10000000 ? inWords(n % 10000000) : "")
    ).trim();
  };

  if (num <= 0) return "INR Zero Only";
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

  const fmt: "PNG" | "JPEG" = dataUrl.startsWith("data:image/png")
    ? "PNG"
    : "JPEG";

  let width = logoWidth ?? maxW;
  let height = logoHeight ?? maxH;

  if (typeof Image !== "undefined" && (!width || !height)) {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = dataUrl;
    });
    width = img.width;
    height = img.height;
  }

  const ratio = width / height;
  let targetW = maxW;
  let targetH = maxH;

  if (targetW / targetH > ratio) targetW = targetH * ratio;
  else targetH = targetW / ratio;

  const targetX = x + (maxW - targetW) / 2;
  const targetY = y + (maxH - targetH) / 2;

  try {
    doc.addImage(dataUrl, fmt, targetX, targetY, targetW, targetH);
  } catch {
    // ignore
  }
}

/* ---------------- AutoTable BLACK/WHITE THEME ---------------- */
const BW_TABLE = {
  styles: {
    fontSize: 7.6,
    cellPadding: 1.5,
    lineWidth: 0.35,
    textColor: 0,
    lineColor: 0,
    fillColor: 255,
  },
  headStyles: {
    fontStyle: "bold" as const,
    halign: "center" as const,
    textColor: 0,
    lineColor: 0,
    fillColor: 255,
  },
  bodyStyles: {
    textColor: 0,
    lineColor: 0,
    fillColor: 255,
  },
  footStyles: {
    fontStyle: "bold" as const,
    textColor: 0,
    lineColor: 0,
    fillColor: 255,
  },
};

/* ---------------- CORE RENDER ---------------- */
async function renderClientInvoice(
  doc: Doc,
  data: ClientInvoiceData,
  assets?: ClientInvoiceAssets
) {
  const L = 12;
  const R = 198;
  const W = R - L;

  // Robust values
  const taxable = Number(data.taxableValue || 0);
  const gstPercent = Number(data.gstPercent || 0);

  const computedGst = +((taxable * gstPercent) / 100).toFixed(2);
  const computedTotal = +(taxable + computedGst).toFixed(2);

  const gst = Number.isFinite(data.gstAmount ?? NaN)
    ? Number(data.gstAmount)
    : computedGst;

  const total = Number.isFinite(data.totalAmount ?? NaN)
    ? Number(data.totalAmount)
    : computedTotal;

  const roundedTotal = Math.round(total);
  const roundOff = +(roundedTotal - total).toFixed(2);

  const description =
    (data.description || "").trim() || "Supply of Fresh Fish";
  const hsn = (data.hsn || "").trim() || "0302";

  /* ---------------- TITLE ---------------- */
  setBlack(doc);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text(COMPANY.title, (L + R) / 2, 14, { align: "center" });

  /* ---------------- HEADER ---------------- */
  let y = 18;
  const headerH = 24;
  rect(doc, L, y, W, headerH);

  const logoAreaW = 26;
  const rightAreaW = 62;
  const centerAreaW = W - logoAreaW - rightAreaW;

  const logoX = L;
  const centerX = L + logoAreaW;
  const rightX = centerX + centerAreaW;

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

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text(COMPANY.name, centerX + centerAreaW / 2, y + 9, {
    align: "center",
  });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(COMPANY.addressLine, centerX + centerAreaW / 2, y + 14, {
    align: "center",
  });

  const pad = 2;
  doc.setFontSize(7.2);
  doc.text(`Phone: ${COMPANY.phone}`, rightX + pad, y + 7.0);
  doc.text(`Email: ${COMPANY.email}`, rightX + pad, y + 10.6);
  doc.text(`GSTIN: ${COMPANY.gstin}`, rightX + pad, y + 14.2);
  doc.text(`State: ${COMPANY.state}`, rightX + pad, y + 17.8);

  y += headerH;

  /* ---------------- BILL TO + INVOICE DETAILS ---------------- */
  const topRowH = 26;
  rect(doc, L, y, W, topRowH);

  const billW = 112;
  vLine(doc, L + billW, y, y + topRowH);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("Bill To:", L + 2, y + 6);

  doc.setFont("Helvetica", "normal");
  textBox(doc, data.billTo, L, y + 6, billW, topRowH - 6, 7.4, 3.4);

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

  /* ---------------- ITEMS TABLE ---------------- */
  autoTable(doc, {
    startY: y,
    theme: "grid",
    tableWidth: W,
    margin: { left: L },
    ...BW_TABLE,
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 66 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
    },
    head: [
      [
        "#",
        "Description",
        "HSN / SAC",
        "Quantity",
        "Price / Unit (Rs.)",
        "GST (Rs.)",
        "Amount (Rs.)",
      ],
    ],
    body: [
      [
        "1",
        description, // ✅ always non-empty now
        hsn,
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

  /* ---------------- TAX SUMMARY + PAYMENT + TOTALS ---------------- */
  const lowerH = 38;
  rect(doc, L, y, W, lowerH);

  const leftLowerW = 112;
  vLine(doc, L + leftLowerW, y, y + lowerH);

  const taxTitleH = 7;
  hLine(doc, L, L + leftLowerW, y + taxTitleH);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("Tax Summary:", L + 2, y + 5);

  const taxTableY = y + taxTitleH;

  autoTable(doc, {
    startY: taxTableY,
    theme: "grid",
    margin: { left: L },
    tableWidth: leftLowerW,
    styles: {
      ...BW_TABLE.styles,
      fontSize: 7.0,
      cellPadding: 1.2,
    },
    headStyles: { ...BW_TABLE.headStyles },
    bodyStyles: { ...BW_TABLE.bodyStyles },
    footStyles: { ...BW_TABLE.footStyles },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: 44, halign: "right" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 26, halign: "right" },
    },
    head: [["HSN / SAC", "Taxable amount (Rs.)", "Rate (%)", "Amt (Rs.)"]],
    body: [[hsn, money(taxable), `${gstPercent}%`, money(gst)]],
    foot: [["TOTAL", money(taxable), "", money(gst)]],
  });

  // Payment Details (only show if mode exists)
  const lastTaxY = (doc as any).lastAutoTable.finalY as number;
  const paymentBoxTop = lastTaxY + 1.5;
  const paymentBoxH = Math.max(0, y + lowerH - paymentBoxTop);

  if (paymentBoxH > 6 && (data.paymentMode || "").trim()) {
    hLine(doc, L, L + leftLowerW, paymentBoxTop);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.6);
    doc.text("Payment Details:", L + 2, paymentBoxTop + 5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.2);
    doc.text(`Mode: ${data.paymentMode}`, L + 26, paymentBoxTop + 10);
  }

  // Right totals panel
  const rightX2 = L + leftLowerW;
  const row1H = 12;
  const row2H = 14;
  const row3H = lowerH - row1H - row2H;

  hLine(doc, rightX2, R, y + row1H);
  hLine(doc, rightX2, R, y + row1H + row2H);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.0);
  doc.text("Sub Total", rightX2 + 2, y + 4.5);
  doc.text(`Rs. ${money(total)}`, R - 3, y + 4.5, { align: "right" });

  doc.text("Round Off", rightX2 + 2, y + 8.5);
  doc.text(
    `${roundOff >= 0 ? "" : "-"}Rs. ${money(Math.abs(roundOff))}`,
    R - 3,
    y + 8.5,
    { align: "right" }
  );

  doc.setFont("Helvetica", "bold");
  doc.text("Total", rightX2 + 2, y + 11.3);
  doc.text(`Rs. ${money(roundedTotal)}`, R - 3, y + 11.3, { align: "right" });

  const wordsY = y + row1H;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.0);
  doc.text("Invoice amount in Words:", rightX2 + 2, wordsY + 4.6);

  doc.setFont("Helvetica", "normal");
  textBox(
    doc,
    amountToWords(roundedTotal),
    rightX2,
    wordsY + 5.2,
    R - rightX2,
    row2H - 5,
    6.9,
    3.2
  );

  const r3Y = y + row1H + row2H;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.0);
  doc.text("Received", rightX2 + 2, r3Y + 5.0);
  doc.text("0.00", R - 3, r3Y + 5.0, { align: "right" });

  doc.text("Balance", rightX2 + 2, r3Y + 9.0);
  doc.text(`Rs. ${money(total)}`, R - 3, r3Y + 9.0, { align: "right" });

  y += lowerH;

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

  /* ---------------- FOOTER ---------------- */
  const footerH = 28;
  rect(doc, L, y, W, footerH);

  const bankW = 112;
  vLine(doc, L + bankW, y, y + footerH);
  const rightMid = L + bankW + (W - bankW) / 2;
  vLine(doc, rightMid, y, y + footerH);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("Bank Details:", L + 2, y + 5);

  const bankText = `Name : ${COMPANY.bankName}
Account No. : ${COMPANY.bankAccNo}
IFSC code : ${COMPANY.bankIfsc}
Account holder's name : ${COMPANY.accountHolder}`;

  if (assets?.qrDataUrl) {
    await addImageSafe(doc, assets.qrDataUrl, L + 2, y + 7, 18, 18);
    textBox(doc, bankText, L + 20, y + 5, bankW - 20, footerH - 5, 7.0, 3.1);
  } else {
    textBox(doc, bankText, L, y + 5, bankW, footerH - 5, 7.0, 3.1);
  }

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text("Customer Seal & Signature", L + bankW + 2, y + 6);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(`For ${COMPANY.name}:`, rightMid + 2, y + 6);

  await addImageSafe(doc, assets?.signatureDataUrl, rightMid + 8, y + 9, 40, 12);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text("Authorized Signatory", rightMid + (W - bankW) / 4, y + footerH - 5, {
    align: "center",
  });

  doc.setFontSize(7.2);
  doc.text("This is a Computer Generated Invoice", (L + R) / 2, 292, {
    align: "center",
  });
}

/* ---------------- EXPORTS ---------------- */
export async function buildClientInvoicePDF(
  JsPDF: typeof jsPDF,
  data: ClientInvoiceData,
  assets?: ClientInvoiceAssets
) {
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

export async function loadImageAsDataUrl(path: string): Promise<string> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Image not found: ${path}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
