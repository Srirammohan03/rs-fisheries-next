import jsPDF from "jspdf";

type CompanyInfo = {
  name: string;
  addressLines: string[];
  phone?: string;
  email?: string;
  website?: string;
};

/**
 * ✅ This PDF keeps your existing header/logo/design
 * ✅ Removes extra sections (health, PPE, family, etc.)
 * ✅ ONLY includes fields that match your Zod schema
 * ✅ Proper alignment + auto page breaks + footer
 * ✅ Blank form (boxes only) — you can later print values if needed
 */
export const generateJoiningFormPDF = () => {
  // Initialize PDF (Portrait, mm, A4)
  const doc = new jsPDF("p", "mm", "a4");

  // ===== PAGE CONSTANTS =====
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  const topMargin = 15;
  const bottomMargin = 15;

  let y = topMargin;

  // ===== COMPANY CONFIG =====
  const company: CompanyInfo = {
    name: "RS-FISHERIES",
    addressLines: [
      "D.No 26-2-1272, Shankaran Colony",
      "Near Ayyappa Temple, GNT Road",
      "Nellore - 524004 (Andhra Pradesh)",
    ],
    phone: "+91 98765 43210",
    email: "hr@rsfisheries.com",
    website: "www.rsfisheries.com",
  };

  // ===== STYLES & FONT HELPERS =====
  const fontRegular = (size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
  };
  const fontBold = (size = 10) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
  };

  const setBody = () => fontRegular(10);
  const setLabel = () => fontBold(9);
  const setSmall = () => fontRegular(8);

  // ===== COLORS =====
  const ACCENT = { r: 0, g: 85, b: 128 };
  const SOFT_BG = { r: 240, g: 248, b: 255 }; // Alice Blue
  const BORDER = 200;

  // ===== FOOTER =====
  const addFooter = () => {
    const footerY = pageH - bottomMargin + 4;
    doc.setDrawColor(220);
    doc.line(marginL, footerY - 5, pageW - marginR, footerY - 5);
    setSmall();
    doc.setTextColor(120);
    doc.text("Confidential | Property of RS-Fisheries", marginL, footerY);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - marginR, footerY, {
      align: "right",
    });
    doc.setTextColor(0);
  };

  // Checks if we have space; if not, adds footer and new page
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - bottomMargin) {
      addFooter();
      doc.addPage();
      y = topMargin;
      drawHeaderCompact();
    }
  };

  // ===== HEADER =====
  const logoSize = 40;
  const logoX = marginL;
  const logoY = topMargin;

  const drawHeader = () => {
    // Logo
    try {
      // IMPORTANT: this must exist in your project public folder or served path
      doc.addImage("/favicon.jpg", "JPEG", logoX, logoY, logoSize, logoSize);
    } catch {
      // fallback logo box
      doc.setDrawColor(ACCENT.r, ACCENT.g, ACCENT.b);
      doc.setFillColor(245, 250, 255);
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, "FD");
      fontBold(14);
      doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
      doc.text("RS", logoX + logoSize / 2, logoY + logoSize / 2, {
        align: "center",
      });
      setSmall();
      doc.text("FISHERIES", logoX + logoSize / 2, logoY + logoSize / 2 + 5, {
        align: "center",
      });
      doc.setTextColor(0);
    }

    // Company Details (right)
    const rightBlockX = logoX + logoSize + 5;
    fontBold(16);
    doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.text(company.name, pageW - marginR, logoY + 8, { align: "right" });

    doc.setTextColor(60);
    setSmall();
    let cy = logoY + 14;
    company.addressLines.forEach((line) => {
      doc.text(line, pageW - marginR, cy, { align: "right" });
      cy += 4;
    });
    doc.text(
      `Ph: ${company.phone ?? ""} | Email: ${company.email ?? ""}`,
      pageW - marginR,
      cy,
      { align: "right" }
    );

    // Title Strip
    y = logoY + logoSize + 6;
    doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.rect(marginL, y, contentW, 12, "F");
    fontBold(12);
    doc.setTextColor(255, 255, 255);
    doc.text("EMPLOYEE JOINING & COMPLIANCE FORM", pageW / 2, y + 8, {
      align: "center",
    });
    doc.setTextColor(0);
    y += 18;
  };

  const drawHeaderCompact = () => {
    doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.rect(marginL, topMargin, contentW, 2, "F");
    fontBold(9);
    doc.setTextColor(150);
    doc.text(`${company.name} - Joining Form`, pageW - marginR, topMargin + 6, {
      align: "right",
    });
    doc.setTextColor(0);
    y = topMargin + 10;
  };

  // ===== UI HELPERS =====

  const sectionCard = (title: string) => {
    ensureSpace(15);
    doc.setFillColor(SOFT_BG.r, SOFT_BG.g, SOFT_BG.b);
    doc.rect(marginL, y, contentW, 9, "F");

    doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.rect(marginL, y, 4, 9, "F");

    fontBold(10);
    doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.text(title.toUpperCase(), marginL + 8, y + 6);
    doc.setTextColor(0);
    y += 13;
  };

  const drawBox = (x: number, yy: number, w: number, h: number) => {
    doc.setDrawColor(BORDER);
    doc.setLineWidth(0.3);
    doc.rect(x, yy, w, h);
  };

  const inputBox = (x: number, w: number, label: string, h = 9) => {
    setLabel();
    doc.setTextColor(80);
    doc.text(label, x, y + 3);
    drawBox(x, y + 4, w, h);
    doc.setTextColor(0);
  };

  const twoCol = (l1: string, l2: string) => {
    ensureSpace(14);
    const gap = 5;
    const w = (contentW - gap) / 2;
    inputBox(marginL, w, l1);
    inputBox(marginL + w + gap, w, l2);
    y += 14;
  };

  const threeCol = (l1: string, l2: string, l3: string) => {
    ensureSpace(14);
    const gap = 4;
    const w = (contentW - gap * 2) / 3;
    inputBox(marginL, w, l1);
    inputBox(marginL + w + gap, w, l2);
    inputBox(marginL + (w + gap) * 2, w, l3);
    y += 14;
  };

  const fullWidth = (label: string, height = 10) => {
    ensureSpace(height + 5);
    inputBox(marginL, contentW, label, height);
    y += height + 5;
  };

  // Document placeholder blocks
  const docPlaceholder = (label: string) => {
    ensureSpace(22);
    setLabel();
    doc.setTextColor(80);
    doc.text(label, marginL, y + 3);
    drawBox(marginL, y + 5, contentW, 14);
    setSmall();
    doc.setTextColor(140);
    doc.text("Paste/Attach Here", marginL + 2, y + 13);
    doc.setTextColor(0);
    y += 22;
  };

  // ===== BUILD FORM CONTENT =====
  drawHeader();

  // ✅ 1) OFFICE INFORMATION (matches schema)
  sectionCard("Office Information");
  threeCol("Date of Joining (DOJ)", "Department", "Designation");
  threeCol("Basic Salary", "HRA (Optional)", "Gross Salary");
  threeCol(
    "Conveyance Allowance (Optional)",
    "Special Allowance (Optional)",
    "Annual CTC"
  );
  twoCol("Work Location (Optional)", "Shift Type (Optional)");

  // ✅ 2) PERSONAL INFORMATION (matches schema)
  sectionCard("Personal Information");

  // Passport photo box (still present like your PDF)
  ensureSpace(60);
  const photoW = 40;
  const photoH = 50;
  drawBox(pageW - marginR - photoW, y, photoW, photoH);
  setSmall();
  doc.setTextColor(150);
  doc.text("Paste Passport", pageW - marginR - photoW + 10, y + 20);
  doc.text("Photo Here", pageW - marginR - photoW + 12, y + 25);
  doc.setTextColor(0);

  const formW = contentW - photoW - 5;
  inputBox(marginL, formW, "Full Name");
  y += 14;
  inputBox(marginL, formW, "Father's Name");
  y += 14;

  const halfW = (formW - 5) / 2;
  inputBox(marginL, halfW, "Date of Birth (DOB)");
  inputBox(marginL + halfW + 5, halfW, "Gender (Male/Female/Other)");
  y += 14;

  // Ensure below the photo
  const photoBottom = topMargin + 18 + 50 + 10;
  if (y < photoBottom) y = photoBottom;

  threeCol("Aadhaar Number", "PAN Number", "Marital Status (Optional)");
  threeCol("Mobile", "Alternate Mobile (Optional)", "Email");
  twoCol("Nationality (Optional)", " ");
  fullWidth("Current Address", 14);
  fullWidth("Permanent Address", 14);

  // ✅ 3) BANK DETAILS (matches schema)
  sectionCard("Bank Details");
  twoCol("Bank Name", "Branch Name");
  threeCol("Account Number", "IFSC Code", " ");

  // ✅ 5) SIGNATURE
  sectionCard("Declaration");
  ensureSpace(55);

  doc.setDrawColor(180);
  doc.rect(marginL, y, contentW, 30);
  fontRegular(10);
  doc.setTextColor(60);
  doc.text(
    "I hereby declare that the information provided is true and correct.",
    marginL + 5,
    y + 12
  );
  doc.setTextColor(0);
  y += 40;

  const sigW = 70;

  // Employee Signature
  doc.line(marginL, y, marginL + sigW, y);
  fontBold(10);
  doc.text("Employee Signature", marginL, y + 5);
  fontRegular(9);
  doc.text("Date:", marginL, y + 12);

  // HR Signature
  doc.line(pageW - marginR - sigW, y, pageW - marginR, y);
  fontBold(10);
  doc.text("HR Manager / Authorized Signatory", pageW - marginR, y + 5, {
    align: "right",
  });
  fontRegular(9);
  doc.text("Date:", pageW - marginR, y + 12, { align: "right" });

  addFooter();
  doc.save("RS-Fisheries_Joining_Form.pdf");
};
