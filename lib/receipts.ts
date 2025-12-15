// types/receipts.ts

export type Tab = "vendor" | "client" | "employee" | "packing";

export interface BaseReceipt {
    id: string;
    date: string | Date | null;
    createdAt?: string;
    amount: number;
    totalAmount?: number;
    paymentMode?: string;
    reference?: string | null;
    billNo?: string;
}

/* ================= VENDOR ================= */
export interface VendorReceipt extends BaseReceipt {
    vendorName: string;
    source?: string;
}

/* ================= CLIENT ================= */
export interface ClientReceipt extends BaseReceipt {
    clientName: string;
}

/* ================= EMPLOYEE ================= */
export interface EmployeeReceipt extends BaseReceipt {
    employeeName: string;
    paymentMode: "CASH" | "AC" | "UPI" | "CHEQUE";
    reference?: string | null;
    user?: {
        name?: string | null;
        role?: string | null;
    };
}

/* ================= PACKING ================= */
export interface PackingReceipt extends BaseReceipt {
    mode: "loading" | "unloading";
    workers: number;
    temperature: number;
    partyName?: string | null;
    vehicleNo?: string | null;
    paymentMode?: string;
    reference?: string | null;
}

/* ================= UNION ================= */
export type Receipt =
    | VendorReceipt
    | ClientReceipt
    | EmployeeReceipt
    | PackingReceipt;


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
