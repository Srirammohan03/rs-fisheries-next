import * as z from "zod";

export enum GstType {
  REGISTERED = "REGISTERED",
  UNREGISTERED = "UNREGISTERED",
  CONSUMER = "CONSUMER",
}

export enum BalanceType {
  RECEIVABLE = "RECEIVABLE",
  PAYABLE = "PAYABLE",
}

// --- Regex Patterns ---
const PHONE_REGEX = /^[6-9]\d{9}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;

// --- Zod Schema ---
export const clientSchema = z.object({
  // Basic Info
  partyName: z.string().min(1, "Party name is required"),
  partyGroup: z.string().optional(),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(PHONE_REGEX, "Invalid phone number (10 digits starting with 6-9)"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  gstType: z.nativeEnum(GstType, {
    error: () => ({ message: "GST Type is required" }),
  }),
  gstin: z
    .string()
    .regex(GSTIN_REGEX, "Invalid GSTIN format")
    .optional()
    .or(z.literal("")),
  state: z.string().optional(),

  billingAddress: z.string().min(1, "Billing address is required"),
  openingBalance: z.coerce
    .number({ error: "Must be a number" })
    .min(0, { message: "Opening balance cannot be negative" })
    .default(0),
  balanceType: z.nativeEnum(BalanceType),
  creditLimit: z.coerce
    .number()
    .min(0, { message: "Credit limit cannot be negative" })
    .optional(),
  referenceNo: z.string().optional(),
  accountNumber: z
    .string()
    .min(1, "Account Number is required")
    .min(9, "Account No. too short")
    .max(18, "Account No. too long")
    .regex(/^\d+$/, "Account number must contain only digits"),
  ifsc: z
    .string()
    .regex(IFSC_REGEX, "Invalid IFSC Code (e.g., SBIN0123456)")
    .optional()
    .or(z.literal("")),
  bankName: z.string().optional(),
  bankAddress: z.string().optional(),
  paymentdetails: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

export interface Client extends ClientFormValues {
  id: string;
  createdAt: string;
  updatedAt?: string;
  payments?: ClientPayment[];
  loadings?: ClientLoading[];
}

export interface ClientPayment {
  clientKey: string;
  clientName: string;
  date: string; // ISO string
  amount: number;
  paymentMode: "CASH" | "AC" | "UPI" | "CHEQUE";
  isInstallment: boolean;
  client: {
    billNo: string;
  };
}

export interface ClientLoading {
  billNo: string;
  date: string; // ISO string
  vehicle: null;
  tripStatus: "RUNNING" | "COMPLETED" | "CANCELLED";
  vehicleNo: string;
  startedAt: string; // ISO string
  completedAt: string | null;
  totalTrays: number;
  totalLooseKgs: number;
  totalTrayKgs: number;
  totalKgs: number;
  totalPrice: number;
  dispatchChargesTotal: number;
  packingAmountTotal: number;
  grandTotal: number;
  items: LoadingItem[];
}

export interface LoadingItem {
  varietyCode: string;
  noTrays: number;
  trayKgs: number;
  loose: number;
  totalKgs: number;
  pricePerKg: number;
  totalPrice: number;
}
