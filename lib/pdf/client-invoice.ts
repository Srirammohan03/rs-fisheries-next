import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ClientInvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  clientName: string;
  billTo: string;
  shipTo: string;
  description?: string;
  hsn: string;
  gstPercent: number;
  taxableValue: number;
  gstAmount: number;
  totalAmount: number;
}

type Doc = InstanceType<typeof jsPDF>;

const RED: [number, number, number] = [200, 0, 0];

const COMPANY = {
  seller: `RS Fisheries Pvt. Ltd.
Plot No. 45, Industrial Area Phase II
Hyderabad, Telangana - 500072
GSTIN: 36AAAAA0000A1Z5
State: Telangana, Code: 36`,
  pan: "AAAAA0000A",
  bank: `Company's Bank Details
Bank Name : HDFC Bank
A/c No. : 50200012345678
Branch & IFS Code : Jubilee Hills Branch, Hyderabad
HDFC0000123`,
};

const money = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

const amountToWords = (num: number) =>
  `INR ${num.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })} Only`;

function rect(doc: Doc, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h);
}

function textBox(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  size = 8
) {
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, w - 4);
  let yy = y + 6;
  lines.forEach((l: string) => {
    if (yy < y + h - 2) {
      doc.text(l, x + 2, yy);
      yy += 4;
    }
  });
}

export async function generateClientInvoicePDF(
  JsPDF: typeof jsPDF,
  data: ClientInvoiceData
) {
  const doc = new JsPDF("p", "mm", "a4");
  doc.setTextColor(0);

  const L = 10;
  const R = 200;
  const W = R - L;
  let y = 10;

  // HEADER
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INVOICE", 105, y, { align: "center" });

  y += 6;
  doc.setFontSize(9);
  doc.text("(ORIGINAL FOR RECIPIENT)", 105, y, { align: "center" });

  y += 8;

  // SELLER + META
  rect(doc, L, y, W, 30);
  textBox(doc, COMPANY.seller, L, y, 110, 30, 9);

  textBox(
    doc,
    `Invoice No. : ${data.invoiceNo}
Dated : ${new Date(data.invoiceDate).toLocaleDateString("en-IN")}`,
    L + 112,
    y,
    78,
    30,
    9
  );

  y += 34;

  // SHIP / BILL
  rect(doc, L, y, W, 32);
  textBox(doc, `Consignee (Ship to)\n${data.shipTo}`, L, y, 95, 32);
  textBox(doc, `Buyer (Bill to)\n${data.billTo}`, L + 95, y, 95, 32);

  y += 36;

  // ITEMS TABLE — RED BORDERS, NO COLOR
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: {
      fontSize: 8,
      textColor: 0,
      lineColor: RED,
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: false,
      textColor: 0,
      lineColor: RED,
      lineWidth: 0.4,
      fontStyle: "bold",
    },
    bodyStyles: {
      lineColor: RED,
    },
    head: [
      [
        "Sl.No.",
        "Description of Goods",
        "HSN/SAC",
        "Quantity",
        "Rate",
        "Amount",
      ],
    ],
    body: [
      [
        "1",
        data.description || "fish",
        data.hsn,
        "1 KGS",
        money(data.taxableValue),
        money(data.taxableValue),
      ],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // TOTAL
  doc.setFont("Helvetica", "bold");
  doc.text("Total", 130, y);
  doc.text(`₹ ${money(data.totalAmount)}`, R - 2, y, { align: "right" });

  y += 8;

  // AMOUNT IN WORDS
  rect(doc, L, y, W, 14);
  textBox(
    doc,
    `Amount Chargeable (in words)\n${amountToWords(data.totalAmount)}`,
    L,
    y,
    W,
    14
  );

  y += 20;

  // TAX SUMMARY (0%)
  rect(doc, L, y, W, 20);
  textBox(
    doc,
    `HSN/SAC   Taxable Value   IGST Rate   IGST Amount   Total Tax Amount
${data.hsn}   ${money(data.taxableValue)}   0%   0.00   0.00`,
    L,
    y,
    W,
    20
  );

  y += 24;

  // FOOTER
  rect(doc, L, y, W, 40);
  textBox(
    doc,
    `Company's PAN : ${COMPANY.pan}

Declaration
We declare that this invoice shows the actual price of the goods described and
that all particulars are true and correct.

Customer's Seal and Signature`,
    L,
    y,
    95,
    40
  );

  textBox(doc, COMPANY.bank, L + 95, y, 95, 40);

  doc.setFontSize(8);
  doc.text("This is a Computer Generated Invoice", 105, 292, {
    align: "center",
  });

  const blob = new Blob([doc.output("arraybuffer")], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice_${data.invoiceNo}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
