// app/(dashboard)/receipts/page.tsx
"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { IndianRupee, Calendar, User, Package, FileText } from "lucide-react";
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
// import { generatePackingPDF } from "@/lib/pdf/packing";
// import { generatePayslipPDF } from "@/lib/pdf/payslip";

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

export default function ReceiptsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vendor");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const safeText = (value?: string | null) => value ?? "—";

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
      } catch (err) {
        console.error(err);
        setReceipts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeTab]);
  const formatAmount = (value: number) =>
    value.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const amountToWords = (amount: number) => {
    const words = require("number-to-words");
    return (
      words.toWords(amount).replace(/^\w/, (c: string) => c.toUpperCase()) +
      " only"
    );
  };

  const handleGenerate = (receipt: Receipt) => {
    switch (activeTab) {
      case "packing":
        return generatePackingPDF(receipt as PackingReceipt);

      case "employee":
        return generatePayslipPDF(receipt as EmployeeReceipt);

      case "client":
        return generateClientReceiptPDF(receipt as ClientReceipt);

      // case "client":
      //   return generateClientPDF(receipt);

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Receipts</h1>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <CardCustom title={getTitle()}>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading...
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No receipts found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 px-4 font-medium">Date</th>
                  <th className="pb-3 px-4 font-medium">Party</th>
                  <th className="pb-3 px-4 font-medium">Details</th>
                  <th className="pb-3 px-4 text-right font-medium">Amount</th>
                  <th className="pb-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-muted/50 transition"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(r.date || r.createdAt)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium">{getPartyName(r)}</div>
                      {activeTab === "packing" && r.billNo && (
                        <div className="text-xs font-medium text-blue-600 mt-1">
                          Bill: {r.billNo}
                        </div>
                      )}
                      {activeTab === "packing" &&
                        (r as PackingReceipt).mode && (
                          <div className="text-xs text-muted-foreground capitalize mt-1">
                            {(r as PackingReceipt).mode}
                          </div>
                        )}
                    </td>
                    <td className="py-4 px-4">
                      {activeTab === "packing" ? (
                        <>
                          <div className="text-xs text-muted-foreground">
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
                            {r.reference && ` | Ref: ${r.reference}`}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Workers: {(r as PackingReceipt).workers} | Temp:{" "}
                            {(r as PackingReceipt).temperature}°C
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {r.paymentMode || "—"}
                          {r.reference && (
                            <span className="block mt-1">
                              Ref: {r.reference}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 text-lg font-bold text-green-600">
                        <IndianRupee className="w-5 h-5" />
                        {formatCurrency(r.amount || r.totalAmount || 0)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleGenerate(r)}
                      >
                        <FileText className="w-4 h-4" />
                        {getActionLabel()}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 pt-6 border-t">
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold">
                  Total ({receipts.length} receipts)
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardCustom>
    </div>
  );
}
