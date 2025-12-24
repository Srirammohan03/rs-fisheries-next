import jsPDF from "jspdf";

type CompanyInfo = {
  name: string;
  addressLines: string[];
  phone?: string;
  email?: string;
  website?: string;
};

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
    email: "hr@rsfisheries.com", // Updated to HR email
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

  // Checks if we have space; if not, adds footer and new page
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - bottomMargin) {
      addFooter();
      doc.addPage();
      y = topMargin;
      drawHeaderCompact();
    }
  };

  // ===== COLORS =====
  // Ocean/Marine Blue Theme
  const ACCENT = { r: 0, g: 85, b: 128 };
  const SOFT_BG = { r: 240, g: 248, b: 255 }; // Alice Blue
  const BORDER = 200;

  // ===== HEADER =====
  const logoSize = 40;
  const logoX = marginL;
  const logoY = topMargin;

  const drawHeader = () => {
    // 1. Logo Placeholder
    try {
      doc.addImage("/favicon.jpg", "JPEG", logoX, logoY, logoSize, logoSize);
    } catch (e) {
      // Fallback: Blue Rounded Box
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
    }

    // 2. Company Details
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
      `Ph: ${company.phone} | Email: ${company.email}`,
      pageW - marginR,
      cy,
      { align: "right" }
    );

    // 3. Title Strip
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

  // ===== UI COMPONENT HELPERS =====

  // Section Header
  const sectionCard = (title: string) => {
    ensureSpace(15);
    doc.setFillColor(SOFT_BG.r, SOFT_BG.g, SOFT_BG.b);
    doc.rect(marginL, y, contentW, 9, "F");

    // Accent line
    doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.rect(marginL, y, 4, 9, "F");

    fontBold(10);
    doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.text(title.toUpperCase(), marginL + 8, y + 6);
    doc.setTextColor(0);
    y += 13;
  };

  // Draw box outline
  const drawBox = (x: number, yy: number, w: number, h: number) => {
    doc.setDrawColor(BORDER);
    doc.setLineWidth(0.3);
    doc.rect(x, yy, w, h);
  };

  // Label + Box
  const inputBox = (x: number, w: number, label: string, h = 9) => {
    setLabel();
    doc.setTextColor(80);
    doc.text(label, x, y + 3);
    drawBox(x, y + 4, w, h);
    doc.setTextColor(0); // reset
  };

  // 2 Columns
  const twoCol = (l1: string, l2: string) => {
    ensureSpace(14);
    const gap = 5;
    const w = (contentW - gap) / 2;
    inputBox(marginL, w, l1);
    inputBox(marginL + w + gap, w, l2);
    y += 14;
  };

  // 3 Columns
  const threeCol = (l1: string, l2: string, l3: string) => {
    ensureSpace(14);
    const gap = 4;
    const w = (contentW - gap * 2) / 3;
    inputBox(marginL, w, l1);
    inputBox(marginL + w + gap, w, l2);
    inputBox(marginL + (w + gap) * 2, w, l3);
    y += 14;
  };

  // 4 Columns (Good for small data like blood group/sizes)
  const fourCol = (l1: string, l2: string, l3: string, l4: string) => {
    ensureSpace(14);
    const gap = 3;
    const w = (contentW - gap * 3) / 4;
    inputBox(marginL, w, l1);
    inputBox(marginL + w + gap, w, l2);
    inputBox(marginL + (w + gap) * 2, w, l3);
    inputBox(marginL + (w + gap) * 3, w, l4);
    y += 14;
  };

  const fullWidth = (label: string, height = 10) => {
    ensureSpace(height + 5);
    inputBox(marginL, contentW, label, height);
    y += height + 5;
  };

  // Checkbox Grid
  const checkboxGrid = (items: string[], cols = 3) => {
    ensureSpace(Math.ceil(items.length / cols) * 8 + 5);
    const colW = contentW / cols;
    let cx = marginL;
    let cy = y;

    setBody();
    items.forEach((item, i) => {
      // Box
      doc.setDrawColor(150);
      doc.rect(cx, cy, 4, 4);
      // Text
      doc.text(item, cx + 6, cy + 3.5);

      cx += colW;
      if ((i + 1) % cols === 0) {
        cx = marginL;
        cy += 7;
      }
    });
    y = cy + 10;
  };

  // Table Generator
  const table = (headers: string[], widths: number[], rows = 3) => {
    const rowH = 9;
    const headH = 8;
    ensureSpace(headH + rows * rowH + 5);

    let x = marginL;
    // Header
    doc.setFillColor(230, 230, 230);
    doc.rect(marginL, y, contentW, headH, "F");
    fontBold(9);
    headers.forEach((h, i) => {
      doc.text(h, x + 2, y + 5.5);
      x += widths[i];
    });
    y += headH;

    // Rows
    for (let r = 0; r < rows; r++) {
      x = marginL;
      fontRegular(9);
      doc.setDrawColor(210);
      doc.rect(marginL, y, contentW, rowH); // Row border
      // Vertical lines
      widths.forEach((w) => {
        doc.line(x + w, y, x + w, y + rowH);
        x += w;
      });
      y += rowH;
    }
    y += 6;
  };

  // ===== BUILD FORM CONTENT =====
  drawHeader();

  // 1. OFFICE USE
  sectionCard("Official Use Only");
  threeCol("Employee ID", "Date of Joining", "Department");
  threeCol(
    "Designation",
    "Work Location / Unit",
    "Shift Type (Gen/Rotational)"
  );

  // 2. PERSONAL DETAILS
  sectionCard("Personal Details");

  // Photo Logic
  const photoW = 40;
  const photoH = 50;
  drawBox(pageW - marginR - photoW, y, photoW, photoH);
  setSmall();
  doc.setTextColor(150);
  doc.text("Paste Passport", pageW - marginR - photoW + 10, y + 20);
  doc.text("Size Photo Here", pageW - marginR - photoW + 10, y + 25);
  doc.setTextColor(0);

  const formW = contentW - photoW - 5;
  inputBox(marginL, formW, "Full Name (As per Aadhaar/Passport):");
  y += 14;
  inputBox(marginL, formW, "Father's / Husband's Name:");
  y += 14;

  // Split the width next to photo
  const halfW = (formW - 5) / 2;
  inputBox(marginL, halfW, "Date of Birth");
  inputBox(marginL + halfW + 5, halfW, "Blood Group");
  y += 14;

  // Move past photo
  if (y < topMargin + 18 + 50) y = topMargin + 18 + 50 + 10; // Simple collision avoidance fallback

  fourCol("Gender", "Marital Status", "Nationality", "Religion");
  twoCol("Aadhaar Number", "PAN Number");
  threeCol("Mobile No (Self)", "Mobile No (Family/Alt)", "Email ID");
  fullWidth("Current Residential Address:", 14);
  fullWidth("Permanent Address:", 14);

  // 3. HEALTH & HYGIENE (CRITICAL FOR FISH EXPORT)
  sectionCard("Health & Hygiene (HACCP / Food Safety Compliance)");
  setSmall();
  doc.setTextColor(100);
  doc.text(
    "Mandatory for all employees handling marine products as per Export Inspection Agency (EIA) norms.",
    marginL,
    y - 2
  );
  doc.setTextColor(0);

  // Health Checklist
  checkboxGrid(
    [
      "No Infectious Disease",
      "No Skin Diseases / Wounds",
      "No Seafood Allergies",
      "Typhoid Vaccinated",
      "Hepatitis Vaccinated",
      "Tetanus Shot Taken",
    ],
    3
  );

  twoCol("Any history of major illness?", "Identification Marks");

  // 4. PPE & PHYSICAL STANDARDS
  sectionCard("PPE Sizing & Physical Standards");
  // Important for procuring Gumboots, Aprons, Gloves
  fourCol(
    "Height (cm)",
    "Weight (kg)",
    "Shoe Size (For Gumboots)",
    "T-Shirt/Apron Size"
  );
  twoCol(
    "Willing to work in Cold Storage (-20°C)?",
    "Swimming Skills (Yes/No)"
  );

  // 5. BANKING
  sectionCard("Bank & Statutory Details");
  twoCol("Bank Name", "Branch Name");
  threeCol("Account Number", "IFSC Code", "UAN (PF) Number");
  twoCol("ESI Number", "Nominee Name & Relation");

  // 6. FAMILY
  sectionCard("Family Details");
  table(
    ["Name", "Relationship", "Age/DOB", "Occupation", "Contact No"],
    [55, 30, 25, 35, 35],
    3
  );

  // 7. EXPERIENCE
  sectionCard("Previous Employment (If Applicable)");
  table(
    ["Company Name", "Designation", "From", "To", "Salary (CTC)"],
    [55, 40, 25, 25, 35],
    2
  );

  // 8. REFERENCES
  sectionCard("References (Not Relatives)");
  table(
    ["Name", "Organization / Designation", "Contact Number", "Place"],
    [50, 60, 40, 30],
    2
  );

  // 9. CHECKLIST
  sectionCard("Document Submission Checklist");
  checkboxGrid(
    [
      "Aadhaar Card Copy",
      "PAN Card Copy",
      "Bank Passbook/Cheque",
      "Education Certificates",
      "Experience Letters",
      "Medical Fitness Cert.",
      "Vaccination Record",
      "Photos (4 Copies)",
      "Police Verification",
    ],
    3
  );

  // 10. DECLARATION
  doc.addPage(); // Force declaration to new page for cleanliness
  y = topMargin;
  drawHeaderCompact();

  sectionCard("Declaration & Acceptance of Food Safety Policy");

  const declarationText = [
    "1. I hereby declare that the information provided is true and correct. I understand that false information is grounds for immediate termination.",
    "2. FOOD SAFETY: I agree to abide by all Personal Hygiene, GMP, and HACCP policies of RS-Fisheries. I will report any illness, skin injury, or diarrhea immediately to the supervisor before entering the processing hall.",
    "3. I consent to undergo medical examinations (swab tests/stool tests) as required by EIA/MPEDA regulations.",
    "4. I am willing to work in rotational shifts and cold storage environments as per company requirements.",
    "5. I agree to return all PPE (Gumboots, Aprons, Caps) provided by the company upon resignation.",
    "6. I authorize RS-Fisheries to conduct background verification regarding my education and criminal record.",
  ];

  doc.setDrawColor(180);
  doc.rect(marginL, y, contentW, 75); // Box for declaration

  let dy = y + 8;
  fontRegular(10);
  declarationText.forEach((line) => {
    const splitText = doc.splitTextToSize(line, contentW - 10);
    doc.text(splitText, marginL + 5, dy);
    dy += splitText.length * 5 + 3;
  });

  y += 85;

  // Signatures
  const sigW = 70;

  // Employee
  doc.line(marginL, y, marginL + sigW, y);
  fontBold(10);
  doc.text("Employee Signature", marginL, y + 5);
  fontRegular(9);
  doc.text("Date:", marginL, y + 12);

  // HR
  doc.line(pageW - marginR - sigW, y, pageW - marginR, y);
  fontBold(10);
  doc.text("HR Manager / Authorized Signatory", pageW - marginR, y + 5, {
    align: "right",
  });
  fontRegular(9);
  doc.text("Date:", pageW - marginR, y + 12, { align: "right" });

  // Save
  addFooter();
  doc.save("RS-Fisheries_Joining_Form.pdf");
};
