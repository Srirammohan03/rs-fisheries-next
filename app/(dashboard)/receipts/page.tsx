"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, User, FileText, Search } from "lucide-react";
import { toast } from "sonner";

import type {
  Receipt,
  ClientReceipt,
  EmployeeReceipt,
} from "../../../lib/receipts";
import { generatePayslipPDF } from "@/lib/pdf/payslip";
import { ClientInvoiceModal } from "./components/invoice/ClientInvoiceModal";

const formatCurrency = (amt: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amt);

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-IN");
};

type TabId = "client" | "employee";

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
  const [activeTab, setActiveTab] = useState<TabId>("client");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  const [openClientInvoice, setOpenClientInvoice] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientReceipt | null>(
    null
  );

  const [invoiceMap, setInvoiceMap] = useState<Record<string, boolean>>({});

  const tabs = [
    { id: "client" as const, label: "Client Receipt", icon: User },
    { id: "employee" as const, label: "Employee Receipt", icon: User },
  ];

  const apiMap: Record<TabId, string> = {
    client: "/api/payments/client",
    employee: "/api/payments/employee",
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let url = apiMap[activeTab];

        const params = new URLSearchParams();
        if (dateFrom) params.append("from", dateFrom);
        if (dateTo) params.append("to", dateTo);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load");

        const json = await res.json();
        const rawData = json?.data?.payments || json.records || json.data || [];
        const normalized: Receipt[] = rawData.map((item: any) => ({
          ...item,
          date: item.date || item.createdAt || new Date(),
        }));

        normalized.sort(
          (a: any, b: any) =>
            new Date(b.date || b.createdAt).getTime() -
            new Date(a.date || a.createdAt).getTime()
        );

        setReceipts(normalized);

        if (activeTab === "client") {
          const map: Record<string, boolean> = {};
          await Promise.all(
            normalized.map(async (r: any) => {
              const endpoint = `/api/invoices/client/by-payment?paymentId=${r.id}`;
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
        toast.error("Failed to load receipts");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, dateFrom, dateTo, search]);

  const getTitle = () => {
    const map: Record<TabId, string> = {
      client: "Client Payment Receipts",
      employee: "Employee Salary Receipts",
    };
    return map[activeTab];
  };

  const getPartyName = (r: Receipt) => {
    if (activeTab === "client") return (r as ClientReceipt).clientName || "—";
    if (activeTab === "employee")
      return (r as EmployeeReceipt).employeeName || "—";
    return "—";
  };

  const filteredReceipts = useMemo(() => {
    const q = search.trim().toLowerCase();

    const fromTs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const toTs = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

    const inRange = (d: any) => {
      const dt = new Date(d || new Date());
      const ts = dt.getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    };

    const matchSearch = (r: Receipt) => {
      if (!q) return true;
      const party = (getPartyName(r) || "").toLowerCase();
      const mode = String((r as any).paymentMode || "").toLowerCase();
      const ref = String(
        (r as any).reference || (r as any).referenceNo || ""
      ).toLowerCase();
      return party.includes(q) || mode.includes(q) || ref.includes(q);
    };

    const out = receipts.filter((r: any) => {
      const d = r.date || r.createdAt;
      return inRange(d) && matchSearch(r);
    });

    out.sort(
      (a: any, b: any) =>
        new Date(b.date || b.createdAt).getTime() -
        new Date(a.date || a.createdAt).getTime()
    );

    return out;
  }, [receipts, search, dateFrom, dateTo, activeTab]);

  const totalPages = Math.ceil(filteredReceipts.length / PAGE_SIZE);
  const paginatedReceipts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredReceipts.slice(start, start + PAGE_SIZE);
  }, [filteredReceipts, page]);

  const handleGenerateInvoice = async (r: any) => {
    const res = await fetch(
      `/api/invoices/client/by-payment?paymentId=${r.id}`
    );
    if (!res.ok) {
      toast.error("Invoice not found");
      return;
    }

    const json = await res.json();
    const invoice = json?.invoice;
    const payment = json?.payment;

    const clientRes = await fetch(`/api/client/${payment.clientDetailsId}`);
    const clientData = await clientRes.json();
    const client = clientData?.data;

    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const LOGO_PATH = "/assets/favicon.png";
    const { generateClientInvoicePDF, loadImageAsDataUrl } = await import(
      "@/lib/pdf/client-invoice"
    );

    let logoDataUrl: string | undefined;
    try {
      logoDataUrl = await loadImageAsDataUrl(LOGO_PATH);
    } catch (e) {
      console.error("Failed to load logo:", e);
    }

    const baseAmount = Number(invoice?.taxableValue ?? 0);

    await generateClientInvoicePDF(
      jsPDF,
      {
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.invoiceDate || new Date().toISOString(),
        clientName: payment?.clientName || "Client",
        billTo: invoice.billTo,
        contactNo: client?.phone,
        state: client?.state,
        gstin: client?.gstin,
        description: invoice.description,
        hsn: invoice.hsn,
        gstPercent: 0,
        taxableValue: baseAmount,
        gstAmount: 0,
        totalAmount: baseAmount,
        paymentMode: payment?.paymentMode,
        placeOfSupply: client?.state,
      },
      { logoDataUrl }
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Receipts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and generate client invoices & employee payslips
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

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
        <div className="sm:col-span-3">
          <Label htmlFor="from">From Date</Label>
          <Input
            id="from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="sm:col-span-3">
          <Label htmlFor="to">To Date</Label>
          <Input
            id="to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="sm:col-span-4">
          <Label htmlFor="search">Search</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by party, reference, mode..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="sm:col-span-2 flex gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setSearch("");
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <CardCustom title={getTitle()}>
        {loading ? (
          <div className="py-14 text-center text-slate-500">Loading...</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            No receipts found
          </div>
        ) : (
          <div className="space-y-5">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[800px] rounded-2xl border border-slate-200 bg-white">
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
                    {paginatedReceipts.map((r: any) => (
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
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-xs text-slate-600">
                            {r.paymentMode || "—"}
                            {(r.reference || r.referenceNo) && (
                              <span className="block mt-1 text-slate-500">
                                Ref: {r.reference || r.referenceNo}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="text-lg font-extrabold text-emerald-600">
                            {formatCurrency(r.amount || 0)}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {activeTab === "client" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  setSelectedClient(r as ClientReceipt);
                                  setOpenClientInvoice(true);
                                }}
                              >
                                <FileText className="w-4 h-4" />
                                Edit Invoice
                              </Button>

                              <Button
                                size="sm"
                                className="gap-2 bg-[#139BC3] text-white hover:bg-[#1088AA] disabled:opacity-20"
                                disabled={!invoiceMap[r.id]}
                                onClick={() => handleGenerateInvoice(r)}
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
                                onClick={() =>
                                  generatePayslipPDF(r as EmployeeReceipt)
                                }
                              >
                                <FileText className="w-4 h-4" />
                                Generate Payslip
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900">
                    {(page - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-medium text-slate-900">
                    {Math.min(page * PAGE_SIZE, filteredReceipts.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900">
                    {filteredReceipts.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <Button
                        key={p}
                        size="sm"
                        variant={page === p ? "default" : "outline"}
                        onClick={() => setPage(p)}
                        className={page === p ? "bg-[#139BC3] text-white" : ""}
                      >
                        {p}
                      </Button>
                    )
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardCustom>

      {/* ✅ Modal */}
      {openClientInvoice && selectedClient ? (
        <ClientInvoiceModal
          open={openClientInvoice}
          clientDetailsId={(selectedClient as any).clientDetailsId}
          clientName={selectedClient.clientName}
          paymentId={selectedClient.id}
          onClose={() => setOpenClientInvoice(false)}
          onSaved={() => {
            setOpenClientInvoice(false);
            setInvoiceMap((prev) => ({ ...prev, [selectedClient.id]: true }));
          }}
        />
      ) : null}
    </div>
  );
}
