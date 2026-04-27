"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import {
  ArrowLeft,
  Info,
  MapPin,
  Phone,
  TrendingUp,
  Calendar,
  Truck,
  Package,
  History,
  FileText,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Agent, AgentPaymentRecord } from "../types/type";

// --- Page Component ---
const AgentViewPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const { data, isLoading, isError, error } = useQuery<
    Agent & { payments?: AgentPaymentRecord[] },
    AxiosError
  >({
    queryKey: ["agent", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/agent/${id}`);
      return data.data; // Includes agentLoadings and payments
    },
    enabled: !!id,
  });

  const agentLoadings = data?.agentLoadings || [];
  const agentPayments = data?.payments || [];

  // Formatting helpers
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val);

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getLoadingBillAmount = (loading: any) => {
    const grandTotal = Number(loading.grandTotal || 0);

    if (grandTotal > 0) {
      return grandTotal;
    }

    const itemTotal = (loading.items || []).reduce(
      (sum: number, item: any) => sum + Number(item.totalPrice || 0),
      0,
    );
    const dispatchCharges = Number(loading.dispatchChargesTotal || 0);
    const packingCharges = Number(loading.packingAmountTotal || 0);

    return itemTotal + dispatchCharges + packingCharges;
  };

  type AgentLedgerEntry = {
    id: string;
    date: string;
    billNo?: string;
    invoiceNo?: string;
    billAmount: number;
    paymentAmount: number;
    paymentMode?: string;
    debit: number;
    credit: number;
    balance: number;
    type: "bill" | "payment";
  };

  const ledgerRows = useMemo<AgentLedgerEntry[]>(() => {
    const entries: AgentLedgerEntry[] = [];

    agentLoadings.forEach((loading: any) => {
      const amount = getLoadingBillAmount(loading);
      entries.push({
        id: loading.id,
        date: loading.date,
        billNo: loading.billNo,
        invoiceNo: undefined,
        billAmount: amount,
        paymentAmount: 0,
        paymentMode: undefined,
        debit: amount,
        credit: 0,
        balance: 0,
        type: "bill",
      });
    });

    agentPayments.forEach((payment) => {
      const amount = Number(payment.amount || 0);
      const invoiceNo = payment.vendorInvoice?.[0]?.invoiceNo;

      entries.push({
        id: payment.id,
        date: payment.date,
        billNo: undefined,
        invoiceNo,
        billAmount: 0,
        paymentAmount: amount,
        paymentMode: payment.paymentMode,
        debit: 0,
        credit: amount,
        balance: 0,
        type: "payment",
      });
    });

    entries.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      if (a.type === b.type) return 0;
      return a.type === "bill" ? -1 : 1;
    });

    let runningBalance = 0;
    return entries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        balance: runningBalance,
      };
    });
  }, [agentLoadings, agentPayments]);

  // Filter ledger rows by date range
  const filteredLedgerRows = useMemo<AgentLedgerEntry[]>(() => {
    return ledgerRows.filter((row) => {
      const rowDate = new Date(row.date);
      if (fromDate) {
        const from = new Date(fromDate);
        if (rowDate < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (rowDate > to) return false;
      }
      return true;
    });
  }, [ledgerRows, fromDate, toDate]);

  const totalLedgerBillAmount = agentLoadings.reduce(
    (sum, loading) => sum + getLoadingBillAmount(loading),
    0,
  );

  const totalLedgerPaymentAmount = agentPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const totalLedgerPending = totalLedgerBillAmount - totalLedgerPaymentAmount;

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState error={error} />;

  const agent = data!;
  const totalLoadings = agentLoadings.length;

  const sortedLoadings = [...agentLoadings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const lastLoadingDate =
    sortedLoadings.length > 0 ? sortedLoadings[0].date : null;

  const handleDownloadLedger = () => {
    // Calculate totals for filtered data
    const filteredBillAmount = filteredLedgerRows.reduce(
      (sum, row) => sum + row.debit,
      0,
    );
    const filteredPaymentAmount = filteredLedgerRows.reduce(
      (sum, row) => sum + row.credit,
      0,
    );
    const filteredPending = filteredBillAmount - filteredPaymentAmount;

    // Prepare data for Excel - matching your desired format
    const sheetData = filteredLedgerRows.map((row) => ({
      Date: formatDate(row.date),
      "Invoice / Bill No": row.billNo ?? row.invoiceNo ?? "-",
      "Bill Amount": row.billAmount || 0,
      Payment: row.paymentAmount || 0,
      "Payment Mode": row.paymentMode ?? "-",
      Debit: row.debit || 0,
      Credit: row.credit || 0,
      "Closing Balance": row.balance || 0,
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(sheetData, {
      header: [
        "Date",
        "Invoice / Bill No",
        "Bill Amount",
        "Payment",
        "Payment Mode",
        "Debit",
        "Credit",
        "Closing Balance",
      ],
    });

    // Add TOTAL row at the bottom
    const totalRow = {
      Date: "TOTAL",
      "Invoice / Bill No": "",
      "Bill Amount": filteredBillAmount,
      Payment: filteredPaymentAmount,
      "Payment Mode": "",
      Debit: filteredBillAmount,
      Credit: filteredPaymentAmount,
      "Closing Balance": filteredPending,
    };

    XLSX.utils.sheet_add_json(ws, [totalRow], {
      origin: -1,
      skipHeader: true,
    });

    // === STYLING & FORMATTING ===
    const range = XLSX.utils.decode_range(ws["!ref"]!);

    // Make header bold
    for (let C = range.s.c; C <= range.e.c; C++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[headerCell]) continue;
      ws[headerCell].s = {
        font: { bold: true },
        alignment: { horizontal: "center" },
        fill: { fgColor: { rgb: "E2E8F0" } }, // Light gray background
      };
    }

    // Format currency columns (Bill Amount, Payment, Debit, Credit, Closing Balance)
    const currencyColumns = [
      "Bill Amount",
      "Payment",
      "Debit",
      "Credit",
      "Closing Balance",
    ];
    const colIndices = {
      Date: 0,
      "Invoice / Bill No": 1,
      "Bill Amount": 2,
      Payment: 3,
      "Payment Mode": 4,
      Debit: 5,
      Credit: 6,
      "Closing Balance": 7,
    };

    for (let R = 1; R <= range.e.r; R++) {
      // Start from row 1 (data rows)
      currencyColumns.forEach((colName) => {
        const colIdx = colIndices[colName as keyof typeof colIndices];
        const cellRef = XLSX.utils.encode_cell({ r: R, c: colIdx });
        const cell = ws[cellRef];
        if (cell && typeof cell.v === "number") {
          cell.t = "n"; // number type
          cell.z = "₹ #,##0"; // Indian Rupee format with comma
          cell.s = {
            alignment: { horizontal: "right" },
          };
        }
      });

      // Make TOTAL row bold
      if (R === range.e.r) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[cellRef]) {
            ws[cellRef].s = {
              font: { bold: true },
              alignment: { horizontal: "right" },
            };
          }
        }
        // Center "TOTAL" text
        if (ws["A" + (R + 1)]) {
          ws["A" + (R + 1)].s = {
            font: { bold: true },
            alignment: { horizontal: "center" },
          };
        }
      }
    }

    // Auto-adjust column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 18 }, // Invoice / Bill No
      { wch: 14 }, // Bill Amount
      { wch: 12 }, // Payment
      { wch: 12 }, // Payment Mode
      { wch: 14 }, // Debit
      { wch: 14 }, // Credit
      { wch: 16 }, // Closing Balance
    ];
    ws["!cols"] = colWidths;

    // Create workbook and download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agent Ledger");

    const safeName = agent.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    XLSX.writeFile(
      wb,
      `agent_ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {agent.name}
              </h1>
              <Badge variant={agent.isActive ? "default" : "secondary"}>
                {agent.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">Agent Registry Information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/agent/${id}/edit`)}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Loadings"
          value={String(totalLoadings)}
          subText="Recorded counts"
          icon={<TrendingUp className="text-green-500" />}
        />
        <StatCard
          title="Last Loading"
          value={lastLoadingDate ? formatDate(lastLoadingDate) : "No activity"}
          subText="Most recent shipment"
          icon={<Calendar className="text-blue-500" />}
        />
        <StatCard
          title="Status"
          value={agent.isActive ? "Active" : "Inactive"}
          subText="Current availability"
          icon={<Info className="text-purple-500" />}
        />
        <StatCard
          title="Contact"
          value={agent.phone}
          subText="Direct phone line"
          icon={<Phone className="text-orange-500" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-[300px] grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="loadings">Loadings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" /> Agent Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-y-6">
                <DetailItem
                  label="Full Address / Location"
                  value={agent.address}
                  fullWidth
                  icon={<MapPin className="h-4 w-4" />}
                />
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Phone" value={agent.phone} />
                  <DetailItem
                    label="Registered At"
                    value={formatDate(agent.createdAt)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Activity Snapshot</p>
                  <p className="text-xs text-muted-foreground">
                    This agent has handled {totalLoadings} loadings to date.
                    They are currently marked as{" "}
                    {agent.isActive ? "Active" : "Inactive"}.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Last Profile Update</span>
                  <span>
                    {agent.updatedAt ? formatDate(agent.updatedAt) : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="grid gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <History className="h-5 w-5" /> Ledger
                </h2>
                <p className="text-sm text-muted-foreground">
                  Date-wise bill totals, payments and pending balances.
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-2 items-end">
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <Button className="self-start" onClick={handleDownloadLedger}>
                  <Download className="w-4 h-4 mr-2" /> Download Ledger
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent>
                  <p className="text-xs uppercase text-muted-foreground">
                    Grand Total
                  </p>
                  <p className="text-2xl font-semibold mt-3">
                    {formatCurrency(totalLedgerBillAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs uppercase text-muted-foreground">
                    Paid
                  </p>
                  <p className="text-2xl font-semibold text-emerald-600 mt-3">
                    {formatCurrency(totalLedgerPaymentAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs uppercase text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl font-semibold text-red-600 mt-3">
                    {formatCurrency(totalLedgerPending)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-background">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Invoice / Bill</th>
                    <th className="px-4 py-3 text-right">Bill Amount</th>
                    <th className="px-4 py-3 text-right">Payment</th>
                    <th className="px-4 py-3 text-right">Mode</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLedgerRows.length > 0 ? (
                    filteredLedgerRows.map((row) => (
                      <tr
                        key={`${row.type}-${row.id}`}
                        className="hover:bg-muted/10"
                      >
                        <td className="px-4 py-3 font-medium">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-4 py-3">
                          {row.billNo ?? row.invoiceNo ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.billAmount > 0
                            ? formatCurrency(row.billAmount)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">
                          {row.paymentAmount > 0
                            ? formatCurrency(row.paymentAmount)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.paymentMode ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.credit > 0 ? formatCurrency(row.credit) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(row.balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-sm text-muted-foreground"
                      >
                        No ledger entries available for this agent yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Loadings Tab */}
        <TabsContent value="loadings" className="space-y-4">
          {agentLoadings.length > 0 ? (
            agentLoadings.map((loading: any) => (
              <Card
                key={loading.id}
                className="overflow-hidden border-l-4 border-l-primary"
              >
                <div className="bg-muted/30 p-4 border-b flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">
                        Bill #{loading.billNo}
                      </span>
                      <Badge variant="outline" className="bg-background">
                        {loading.tripStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{" "}
                        {formatDate(loading.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />{" "}
                        {loading.vehicle?.vehicleNumber ||
                          loading.vehicleNo ||
                          "Vehicle not assigned"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Grand Total</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(getLoadingBillAmount(loading))}
                    </p>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-medium">Variety</th>
                          <th className="px-4 py-3 font-medium text-right">
                            Trays
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Loose
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Total Weight
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {loading.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/10">
                            <td className="px-4 py-3 font-medium">
                              {item.varietyCode}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.noTrays}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.loose}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {item.totalKgs}kg
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/5 p-3 flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>
                      Total Trays: <strong>{loading.totalTrays}</strong>
                    </span>
                    <span>
                      Total Weight: <strong>{loading.totalKgs}kg</strong>
                    </span>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title="No Loadings Found"
              desc="This agent has no associated loading records yet."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Sub-components ---

function StatCard({
  title,
  value,
  subText,
  icon,
}: {
  title: string;
  value: string;
  subText: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">{title}</p>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground uppercase mt-1">
            {subText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({
  label,
  value,
  fullWidth = false,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`${fullWidth ? "col-span-2" : "col-span-1"} space-y-1`}>
      <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-sm font-medium leading-relaxed">{value || "—"}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

function ErrorState({ error }: { error: any }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4 text-center">
      <h2 className="text-xl font-bold">
        {axios.isAxiosError(error)
          ? error.response?.data?.message || "Agent not found"
          : error.message || "Something went wrong"}
      </h2>
      <Button onClick={() => window.history.back()}>Go Back</Button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <div className="bg-muted p-3 rounded-full mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="text-sm max-w-xs">{desc}</p>
    </div>
  );
}

export default AgentViewPage;
