/* ================= COMMON ================= */
// lib\receipts.ts
export type Tab = "vendor" | "client" | "employee" | "packing";

export interface BaseReceipt {
  id: string;
  date: string | Date | null;
  createdAt?: string | Date;
  amount: number;
  totalAmount?: number;
  paymentMode?: string;
  reference?: string | null;
  billNo?: string;
}

/* ================= VENDOR ================= */

export interface VendorReceipt extends BaseReceipt {
  vendorId: string; // farmer:Sriram3 | agent:Nithish
  vendorName: string;
  source: "farmer" | "agent";

  referenceNo?: string | null;
  paymentRef?: string | null;

  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;
}

/* ================= CLIENT ================= */

export interface ClientReceipt extends BaseReceipt {
  clientId: string;
  clientName: string;
  imageUrl?: string | null;
  isInstallment?: boolean;

  client?: {
    billNo?: string | null;
    village?: string | null;
  };
}

/* ================= EMPLOYEE ================= */

export interface EmployeeReceipt extends BaseReceipt {
  employeeName: string;
  paymentMode: "CASH" | "AC" | "UPI" | "CHEQUE";
  reference?: string | null;
  employee?: {
    fullName?: string | null;
    designation?: string | null;
  };
}

/* ================= PACKING ================= */

export interface PackingReceipt extends BaseReceipt {
  mode: "loading" | "unloading";
  workers: number;
  temperature: number;
  partyName?: string | null;
  vehicleNo?: string | null;
}

/* ================= UNION ================= */

export type Receipt =
  | VendorReceipt
  | ClientReceipt
  | EmployeeReceipt
  | PackingReceipt;
