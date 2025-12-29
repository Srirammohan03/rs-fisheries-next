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

import { VendorInvoiceModal } from "./components/invoice/VendorInvoiceModal";
import { ClientInvoiceModal } from "./components/invoice/ClientInvoiceModal";

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

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className={cn(
        "w-full grid grid-cols-2 gap-2",
        "sm:w-auto sm:inline-flex sm:items-center sm:gap-1 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-gray-100 sm:p-1 sm:shadow-sm sm:backdrop-blur"
      )}
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
  const mobileLabel =
    value === "vendor"
      ? "Vendor"
      : value === "client"
      ? "Client"
      : value === "employee"
      ? "Employee"
      : "Packing";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onClick(value)}
      className={cn(
        "relative w-full rounded-xl px-3 py-2 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#139BC3]/35",
        isActive
          ? "bg-white text-[#139BC3] shadow-sm ring-1 ring-[#139BC3]/25"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
        "sm:w-auto sm:bg-transparent sm:ring-0 sm:px-4 sm:py-2",
        isActive
          ? "sm:bg-white sm:text-[#139BC3] sm:shadow-sm sm:border sm:border-slate-200"
          : "sm:text-slate-600 sm:hover:bg-slate-50"
      )}
    >
      <span className="flex items-center justify-center sm:justify-start gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="sm:hidden">{mobileLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      <span
        className={cn(
          "pointer-events-none absolute inset-x-3 -bottom-[8px] h-[2px] rounded-full transition-opacity hidden sm:block",
          isActive ? "bg-[#139BC3] opacity-100" : "opacity-0"
        )}
      />
    </button>
  );
}

export default function ReceiptsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("vendor");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const [openVendorInvoice, setOpenVendorInvoice] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorReceipt | null>(
    null
  );

  const [openClientInvoice, setOpenClientInvoice] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientReceipt | null>(
    null
  );

  const [invoiceMap, setInvoiceMap] = useState<Record<string, boolean>>({});

  const isVendorReceipt = (r: Receipt): r is VendorReceipt =>
    (r as VendorReceipt).vendorId !== undefined;
  const isClientReceipt = (r: Receipt): r is ClientReceipt =>
    (r as ClientReceipt).clientId !== undefined;

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
        const rawData = json?.data?.payments || json.records || json.data || [];
        const data: Receipt[] = rawData.map((item: any) => ({
          ...item,
          date: item.date || item.createdAt || new Date(),
        }));

        setReceipts(data);

        if (activeTab === "vendor" || activeTab === "client") {
          const map: Record<string, boolean> = {};
          await Promise.all(
            data.map(async (r: any) => {
              const endpoint =
                activeTab === "vendor"
                  ? `/api/invoices/vendor/by-payment?paymentId=${r.id}`
                  : `/api/invoices/client/by-payment?paymentId=${r.id}`;

              const x = await fetch(endpoint);
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

  const getActionLabel = (): string => {
    if (activeTab === "vendor" || activeTab === "client")
      return "Generate Invoice";
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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
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

      <CardCustom title={getTitle()}>
        {loading ? (
          <div className="py-14 text-center text-slate-500">Loading...</div>
        ) : receipts.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            No receipts found
          </div>
        ) : (
          <div className="space-y-5">
            {/* MOBILE: Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {receipts.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-semibold">
                          {formatDate(r.date || r.createdAt)}
                        </span>
                      </div>

                      <div className="mt-2 font-extrabold text-slate-900 truncate">
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
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs text-slate-500">Amount</div>
                      <div className="text-lg font-extrabold text-emerald-600">
                        {formatCurrency(r.amount || r.totalAmount || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    {activeTab === "packing" ? (
                      <>
                        <div>
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
                        <div className="mt-1 text-slate-500">
                          Workers: {(r as PackingReceipt).workers} | Temp:{" "}
                          {(r as PackingReceipt).temperature}°C
                        </div>
                      </>
                    ) : (
                      <>
                        <div>{r.paymentMode || "—"}</div>
                        {r.reference && (
                          <div className="mt-1 text-slate-500">
                            Ref: {r.reference}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-4">
                    {(activeTab === "vendor" && isVendorReceipt(r)) ||
                    (activeTab === "client" && isClientReceipt(r)) ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            if (activeTab === "vendor") {
                              setSelectedVendor(r as VendorReceipt);
                              setOpenVendorInvoice(true);
                            } else if (activeTab === "client") {
                              setSelectedClient(r as ClientReceipt);
                              setOpenClientInvoice(true);
                            }
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
                            const endpoint =
                              activeTab === "vendor"
                                ? `/api/invoices/vendor/by-payment?paymentId=${r.id}`
                                : `/api/invoices/client/by-payment?paymentId=${r.id}`;

                            const res = await fetch(endpoint);
                            if (!res.ok) {
                              toast.error("Invoice not found");
                              return;
                            }

                            const { invoice } = await res.json();

                            const { jsPDF } = await import("jspdf");
                            await import("jspdf-autotable");

                            if (activeTab === "vendor") {
                              const { generateVendorInvoicePDF } = await import(
                                "@/lib/pdf/vendor-invoice"
                              );
                              generateVendorInvoicePDF(jsPDF, {
                                ...invoice,
                                description: invoice.description ?? "",
                              });
                            } else if (activeTab === "client") {
                              const { generateClientInvoicePDF } = await import(
                                "@/lib/pdf/client-invoice"
                              );
                              const baseAmount =
                                invoice.taxableValue || invoice.amount || 0;

                              generateClientInvoicePDF(jsPDF, {
                                invoiceNo: invoice.invoiceNo,
                                invoiceDate:
                                  invoice.invoiceDate ||
                                  new Date().toISOString(),
                                clientName:
                                  (r as ClientReceipt).clientName || "Client",
                                billTo: invoice.billTo,
                                shipTo: invoice.shipTo,
                                description:
                                  invoice.description || "Supply of fresh fish",
                                hsn: "0302",

                                gstPercent: 0,
                                taxableValue: baseAmount,
                                gstAmount: 0,
                                totalAmount: baseAmount,
                              });
                            }
                          }}
                        >
                          <FileText className="w-4 h-4" />
                          Generate Invoice
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-slate-200 bg-[#139BC3] text-white hover:bg-[#1088AA] hover:text-white"
                        onClick={() => {
                          if (activeTab === "packing") {
                            generatePackingPDF(r as PackingReceipt);
                          } else if (activeTab === "employee") {
                            generatePayslipPDF(r as EmployeeReceipt);
                          }
                        }}
                      >
                        <FileText className="w-4 h-4" />
                        {getActionLabel()}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP: Table */}
            <div className="hidden md:block overflow-x-auto">
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
                          {(activeTab === "vendor" && isVendorReceipt(r)) ||
                          (activeTab === "client" && isClientReceipt(r)) ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  if (activeTab === "vendor") {
                                    setSelectedVendor(r as VendorReceipt);
                                    setOpenVendorInvoice(true);
                                  } else if (activeTab === "client") {
                                    setSelectedClient(r as ClientReceipt);
                                    setOpenClientInvoice(true);
                                  }
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
                                  const endpoint =
                                    activeTab === "vendor"
                                      ? `/api/invoices/vendor/by-payment?paymentId=${r.id}`
                                      : `/api/invoices/client/by-payment?paymentId=${r.id}`;

                                  const res = await fetch(endpoint);
                                  if (!res.ok) {
                                    toast.error("Invoice not found");
                                    return;
                                  }

                                  const { invoice } = await res.json();

                                  const { jsPDF } = await import("jspdf");
                                  await import("jspdf-autotable");

                                  if (activeTab === "vendor") {
                                    const { generateVendorInvoicePDF } =
                                      await import("@/lib/pdf/vendor-invoice");
                                    generateVendorInvoicePDF(jsPDF, {
                                      ...invoice,
                                      description: invoice.description ?? "",
                                    });
                                  } else if (activeTab === "client") {
                                    const { generateClientInvoicePDF } =
                                      await import("@/lib/pdf/client-invoice");
                                    generateClientInvoicePDF(jsPDF, {
                                      invoiceNo: invoice.invoiceNo,
                                      invoiceDate:
                                        invoice.invoiceDate ||
                                        new Date().toISOString(),
                                      clientName:
                                        (r as ClientReceipt).clientName ||
                                        "Client",
                                      billTo: invoice.billTo,
                                      shipTo: invoice.shipTo,
                                      description:
                                        invoice.description ||
                                        "Supply of fresh fish",
                                      hsn: "0302",
                                      gstPercent: 0,
                                      taxableValue:
                                        invoice.taxableValue ||
                                        invoice.amount ||
                                        0,
                                      gstAmount:
                                        invoice.taxableValue || invoice.amount,
                                      totalAmount:
                                        (invoice.taxableValue ||
                                          invoice.amount ||
                                          0) * 1.05,
                                    });
                                  }
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
                                className="gap-2 border-slate-200 bg-[#139BC3] text-white hover:bg-[#1088AA] hover:text-white"
                                onClick={() => {
                                  if (activeTab === "packing") {
                                    generatePackingPDF(r as PackingReceipt);
                                  } else if (activeTab === "employee") {
                                    generatePayslipPDF(r as EmployeeReceipt);
                                  }
                                }}
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
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <p className="text-base font-semibold text-slate-700">
                  Total ({receipts.length} receipts)
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardCustom>

      {openVendorInvoice && selectedVendor && (
        <VendorInvoiceModal
          open={openVendorInvoice}
          vendorId={selectedVendor.vendorId}
          vendorName={selectedVendor.vendorName}
          source={selectedVendor.source as "farmer" | "agent"}
          paymentId={selectedVendor.id}
          onClose={() => setOpenVendorInvoice(false)}
          onSaved={() => {
            setOpenVendorInvoice(false);
            setInvoiceMap((prev) => ({
              ...prev,
              [selectedVendor.id]: true,
            }));
          }}
        />
      )}

      {openClientInvoice && selectedClient && (
        <ClientInvoiceModal
          open={openClientInvoice}
          clientId={selectedClient.clientId}
          clientName={selectedClient.clientName}
          paymentId={selectedClient.id}
          onClose={() => setOpenClientInvoice(false)}
          onSaved={() => {
            setOpenClientInvoice(false);
            setInvoiceMap((prev) => ({
              ...prev,
              [selectedClient.id]: true,
            }));
          }}
        />
      )}
    </div>
  );
}
