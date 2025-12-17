// app/(dashboard)/receipts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Calendar, User, Package, FileText } from "lucide-react";
import { toast } from "sonner";

import type {
  Tab,
  Receipt,
  VendorReceipt,
  ClientReceipt,
  EmployeeReceipt,
  PackingReceipt,
} from "../../../lib/receipts";

import { generatePackingPDF } from "@/lib/pdf/packing";
import { generatePayslipPDF } from "@/lib/pdf/payslip";
import { generateClientReceiptPDF } from "@/lib/pdf/clientslip";
import { VendorInvoiceModal } from "./components/invoice/VendorInvoiceModal";

const formatCurrency = (amt: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amt);

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN");
};

type TabId = Tab;

function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-gray-100 p-1 shadow-sm backdrop-blur"
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  activeValue,
  onClick,
  icon: Icon,
  label,
}: {
  value: TabId;
  activeValue: TabId;
  onClick: (v: TabId) => void;
  icon: any;
  label: string;
}) {
  const isActive = value === activeValue;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onClick(value)}
      className={[
        "relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#139BC3]/35",
        isActive
          ? "bg-white text-[#139BC3] shadow-sm border border-slate-200"
          : "text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span
        className={[
          "pointer-events-none absolute inset-x-3 -bottom-[8px] h-[2px] rounded-full transition-opacity",
          isActive ? "bg-[#139BC3] opacity-100" : "opacity-0",
        ].join(" ")}
      />
    </button>
  );
}

export default function ReceiptsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("vendor");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const [openInvoice, setOpenInvoice] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorReceipt | null>(
    null
  );

  const [invoiceMap, setInvoiceMap] = useState<Record<string, boolean>>({});

  const isVendorReceipt = (r: Receipt): r is VendorReceipt =>
    (r as VendorReceipt).vendorId !== undefined;

  const tabs = [
    { id: "vendor" as const, label: "Vendor Receipt", icon: User },
    { id: "client" as const, label: "Client Receipt", icon: User },
    { id: "employee" as const, label: "Employee Receipt", icon: User },
    { id: "packing" as const, label: "Packing Receipt", icon: Package },
  ];

  const apiMap: Record<Tab, string> = {
    vendor: "/api/payments/vendor",
    client: "/api/payments/client",
    employee: "/api/payments/employee",
    packing: "/api/payments/packing-amount",
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(apiMap[activeTab]);
        if (!res.ok) throw new Error("Failed to load");

        const json = await res.json();
        const rawData = json.payments || json.records || json.data || [];

        const data: Receipt[] = rawData.map((item: any) => ({
          ...item,
          date: item.date || item.createdAt || new Date(),
        }));

        setReceipts(data);

        // build invoice map for vendor only
        if (activeTab === "vendor") {
          const map: Record<string, boolean> = {};
          await Promise.all(
            data.map(async (r: any) => {
              const x = await fetch(
                `/api/invoices/vendor/by-payment?paymentId=${r.id}`
              );
              map[r.id] = x.ok;
            })
          );
          setInvoiceMap(map);
        } else {
          setInvoiceMap({});
        }
      } catch (err) {
        console.error(err);
        setReceipts([]);
        setInvoiceMap({});
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab]);

  const handleGenerate = (receipt: Receipt) => {
    switch (activeTab) {
      case "packing":
        return generatePackingPDF(receipt as PackingReceipt);
      case "employee":
        return generatePayslipPDF(receipt as EmployeeReceipt);
      case "client":
        return generateClientReceiptPDF(receipt as ClientReceipt);
      case "vendor":
        toast.error("Please edit and save invoice before generating PDF");
        return;
      default:
        toast.error("Invalid receipt type");
    }
  };

  const getActionLabel = (): string => {
    if (activeTab === "vendor") return "Generate Invoice";
    if (activeTab === "employee") return "Generate Payslip";
    return "Generate Receipt";
  };

  const getTitle = () => {
    const map: Record<Tab, string> = {
      vendor: "Vendor Payment Receipts",
      client: "Client Payment Receipts",
      employee: "Employee Salary Receipts",
      packing: "Packing Amount Receipts",
    };
    return map[activeTab];
  };

  const total = receipts.reduce(
    (sum, r) => sum + (r.amount || r.totalAmount || 0),
    0
  );

  const getPartyName = (r: Receipt) => {
    if (activeTab === "vendor") return (r as VendorReceipt).vendorName || "—";
    if (activeTab === "client") return (r as ClientReceipt).clientName || "—";
    if (activeTab === "employee")
      return (r as EmployeeReceipt).employeeName || "—";
    if (activeTab === "packing") return (r as PackingReceipt).partyName || "—";
    return "—";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Receipts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and generate receipts & invoices
          </p>
        </div>

        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              activeValue={activeTab}
              onClick={setActiveTab}
              icon={t.icon}
              label={t.label}
            />
          ))}
        </TabsList>
      </header>

      {/* Content */}
      <CardCustom title={getTitle()}>
        {loading ? (
          <div className="py-14 text-center text-slate-500">Loading...</div>
        ) : receipts.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            No receipts found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[900px] rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur border-b border-slate-200">
                  <tr className="text-left">
                    <th className="py-4 px-4 font-semibold text-slate-700">
                      Date
                    </th>
                    <th className="py-4 px-4 font-semibold text-slate-700">
                      Party
                    </th>
                    <th className="py-4 px-4 font-semibold text-slate-700">
                      Details
                    </th>
                    <th className="py-4 px-4 text-right font-semibold text-slate-700">
                      Amount
                    </th>
                    <th className="py-4 px-4 text-right font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {receipts.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(r.date || r.createdAt)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">
                          {getPartyName(r)}
                        </div>

                        {activeTab === "packing" && r.billNo && (
                          <div className="text-xs font-semibold text-[#139BC3] mt-1">
                            Bill: {r.billNo}
                          </div>
                        )}

                        {activeTab === "packing" &&
                          (r as PackingReceipt).mode && (
                            <div className="text-xs text-slate-500 capitalize mt-1">
                              {(r as PackingReceipt).mode}
                            </div>
                          )}
                      </td>

                      <td className="py-4 px-4">
                        {activeTab === "packing" ? (
                          <>
                            <div className="text-xs text-slate-600">
                              Payment:{" "}
                              {r.paymentMode === "CASH"
                                ? "Cash"
                                : r.paymentMode === "AC"
                                ? "A/C Transfer"
                                : r.paymentMode === "UPI"
                                ? "UPI/PhonePe"
                                : r.paymentMode === "CHEQUE"
                                ? "Cheque"
                                : "N/A"}
                              {r.reference && (
                                <span className="text-slate-500">
                                  {" "}
                                  | Ref: {r.reference}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Workers: {(r as PackingReceipt).workers} | Temp:{" "}
                              {(r as PackingReceipt).temperature}°C
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-600">
                            {r.paymentMode || "—"}
                            {r.reference && (
                              <span className="block mt-1 text-slate-500">
                                Ref: {r.reference}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="text-lg font-extrabold text-emerald-600">
                          {formatCurrency(r.amount || r.totalAmount || 0)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {activeTab === "vendor" && isVendorReceipt(r) ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                              onClick={() => {
                                setSelectedVendor(r);
                                setOpenInvoice(true);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                              Edit Invoice
                            </Button>

                            <Button
                              size="sm"
                              className="gap-2 bg-[#139BC3] text-white hover:bg-[#1088AA] disabled:opacity-20"
                              disabled={!invoiceMap[r.id]}
                              onClick={async () => {
                                const res = await fetch(
                                  `/api/invoices/vendor/by-payment?paymentId=${r.id}`
                                );

                                if (!res.ok) {
                                  toast.error("Invoice not found");
                                  return;
                                }

                                const { invoice } = await res.json();

                                const { jsPDF } = await import("jspdf");
                                await import("jspdf-autotable");
                                const { generateVendorInvoicePDF } =
                                  await import("@/lib/pdf/vendor-invoice");

                                generateVendorInvoicePDF(jsPDF, {
                                  ...invoice,
                                  items: [
                                    {
                                      varietyCode: invoice.source,
                                      billNo: invoice.invoiceNo,
                                      totalKgs: 1,
                                      totalPrice: invoice.taxableValue,
                                    },
                                  ],
                                });
                              }}
                            >
                              <FileText className="w-4 h-4" />
                              Generate Invoice
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-slate-200  bg-[#139BC3] text-white hover:bg-[#1088AA] hover:text-white"
                              onClick={() => handleGenerate(r)}
                            >
                              <FileText className="w-4 h-4" />
                              {getActionLabel()}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex justify-between items-center">
                <p className="text-base font-semibold text-slate-700">
                  Total ({receipts.length} receipts)
                </p>
                <p className="text-3xl font-extrabold text-emerald-600">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardCustom>

      {/* Vendor invoice modal */}
      {openInvoice && selectedVendor && (
        <VendorInvoiceModal
          open={openInvoice}
          vendorId={selectedVendor.vendorId}
          vendorName={selectedVendor.vendorName}
          source={selectedVendor.source as "farmer" | "agent"}
          paymentId={selectedVendor.id}
          onClose={() => setOpenInvoice(false)}
          onSaved={() => {
            setOpenInvoice(false);
            setInvoiceMap((prev) => ({
              ...prev,
              [selectedVendor.id]: true,
            }));
          }}
        />
      )}
    </div>
  );
}
