"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  History,
  Info,
  MapPin,
  Phone,
  Mail,
  Banknote,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Calendar,
  Truck,
  Package,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Client, ClientPayment } from "../types/type";

// --- Page Component ---
const ClientViewPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/client/${id}`);
      return data.data as Client;
    },
    enabled: !!id,
  });

  const loadings = data?.loadings ?? [];
  const payments = data?.payments ?? [];

  const lastLoading = useMemo(() => {
    return [...loadings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
  }, [loadings]);

  const getLoadingBillAmount = (loading: any) => {
    const grandTotal = Number(loading.grandTotal || 0);
    if (grandTotal > 0) return grandTotal;

    const itemTotal = (loading.items || []).reduce(
      (sum: number, item: any) => sum + Number(item.totalPrice || 0),
      0,
    );
    const dispatchCharges = Number(loading.dispatchChargesTotal || 0);
    const packingCharges = Number(loading.packingAmountTotal || 0);

    return itemTotal + dispatchCharges + packingCharges;
  };

  type ClientLedgerEntry = {
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

  const ledgerRows = useMemo<ClientLedgerEntry[]>(() => {
    const entries: ClientLedgerEntry[] = [];

    loadings.forEach((loading) => {
      const amount = getLoadingBillAmount(loading);
      entries.push({
        id: loading.billNo,
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

    payments.forEach((payment) => {
      const amount = Number(payment.amount || 0);
      entries.push({
        id: payment.id,
        date: payment.date,
        billNo: undefined,
        invoiceNo: payment.clientInvoice?.invoiceNo ?? payment.client?.billNo,
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
  }, [loadings, payments]);

  // Filter ledger rows by date range
  const filteredLedgerRows = useMemo<ClientLedgerEntry[]>(() => {
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

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState error={error} />;

  const client = data!;

  const totalLedgerBillAmount = loadings.reduce(
    (sum, loading) => sum + getLoadingBillAmount(loading),
    0,
  );
  const totalLedgerPaymentAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const totalLedgerPending = Math.max(
    0,
    totalLedgerBillAmount - totalLedgerPaymentAmount,
  );

  // Formatting helpers
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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

    // Prepare data in exact column order matching your Excel image
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

    const ws = XLSX.utils.json_to_sheet(sheetData);

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

    // ====================== EXCEL FORMATTING ======================

    // Make header row bold with background
    const range = XLSX.utils.decode_range(ws["!ref"]!);

    for (let C = 0; C <= range.e.c; C++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[headerCell]) {
        ws[headerCell].s = {
          font: { bold: true, color: { rgb: "000000" } },
          alignment: { horizontal: "center", vertical: "center" },
          fill: { fgColor: { rgb: "E2E8F0" } }, // Light gray background
        };
      }
    }

    // Format all amount columns (Bill Amount, Payment, Debit, Credit, Closing Balance)
    const amountColumns = [2, 3, 5, 6, 7]; // 0-based indices: Bill Amount, Payment, Debit, Credit, Closing Balance

    for (let R = 1; R <= range.e.r; R++) {
      amountColumns.forEach((colIdx) => {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: colIdx });
        const cell = ws[cellAddress];

        if (cell && typeof cell.v === "number") {
          cell.t = "n";
          cell.z = "₹ #,##0"; // Indian Rupee format with comma separator
          cell.s = {
            alignment: { horizontal: "right" },
          };
        }
      });

      // Make TOTAL row bold and highlighted
      if (R === range.e.r) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true },
              alignment: { horizontal: C === 0 ? "center" : "right" },
            };
          }
        }
      }
    }

    // Set column widths for clean professional look
    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Invoice / Bill No
      { wch: 15 }, // Bill Amount
      { wch: 14 }, // Payment
      { wch: 14 }, // Payment Mode
      { wch: 15 }, // Debit
      { wch: 15 }, // Credit
      { wch: 16 }, // Closing Balance
    ];

    // Create workbook and trigger download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Ledger");

    const safeName = (client.partyName || "client")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase()
      .slice(0, 40);

    XLSX.writeFile(
      wb,
      `client_ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
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
                {client.partyName}
              </h1>
              <Badge variant={client.isActive ? "default" : "secondary"}>
                {client.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {client.partyGroup || "General Client"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/client/${id}/edit`)}
          >
            Edit Profile
          </Button>
          {/* <Button>Create New Invoice</Button> */}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending Balance"
          value={formatCurrency(client.pendingBalance ?? 0)}
          subText="Pending Balance"
          icon={
            client.pendingBalance && client.pendingBalance > 0 ? (
              <TrendingDown className="text-red-500" />
            ) : (
              <TrendingUp className="text-green-500" />
            )
          }
        />
        <StatCard
          title="Total Loadings"
          value={String(client.loadings?.length ?? 0)}
          subText="Recorded counts"
          icon={<CreditCard className="text-blue-500" />}
        />
        <StatCard
          title="Last Loading"
          // value={lastLoading?.billNo ?? "No loadings"}
          // subText={lastLoading ? formatDate(lastLoading.date) : "Not available"}
          value={lastLoading ? formatDate(lastLoading.date) : "Not available"}
          subText={lastLoading ? `Bill #${lastLoading.billNo}` : "No loadings"}
          icon={<ShieldCheck className="text-purple-500" />}
        />
        <StatCard
          title="Contact"
          value={client.phone || "No phone"}
          subText={client.email || "No email provided"}
          icon={<Phone className="text-orange-500" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="banking">Banking</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="loadings">Loadings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" /> Detailed Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-6">
                <DetailItem
                  label="Full Address"
                  value={client.billingAddress}
                  fullWidth
                  icon={<MapPin className="h-4 w-4" />}
                />
                <DetailItem label="State" value={client.state} />
                <DetailItem
                  label="Credit Limit"
                  value={formatCurrency(client.creditLimit || 0)}
                />
                <DetailItem
                  label="Opening Balance"
                  value={formatCurrency(client.openingBalance)}
                />
                <DetailItem label="Reference No" value={client.referenceNo} />
                <DetailItem
                  label="Payment Terms"
                  value={client.paymentdetails || "Standard terms apply"}
                  fullWidth
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-full">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-sm truncate">
                    {client.email || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-full">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{client.phone}</span>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Added on: {new Date(client.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Banking Tab */}
        <TabsContent value="banking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Bank Account Details
              </CardTitle>
              <CardDescription>
                Primary bank information for settlements
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailItem label="Bank Name" value={client.bankName} />
              <DetailItem label="Account Number" value={client.accountNumber} />
              <DetailItem label="IFSC Code" value={client.ifsc} />
              <DetailItem
                label="Branch Address"
                value={client.bankAddress}
                fullWidth
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" /> Ledger
                  </CardTitle>
                  <CardDescription>
                    Date-wise bill totals, payments and pending balances.
                  </CardDescription>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadLedger}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Ledger
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/30">
                  <CardContent>
                    <p className="text-xs uppercase text-muted-foreground">
                      Grand Total
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(totalLedgerBillAmount)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent>
                    <p className="text-xs uppercase text-muted-foreground">
                      Paid
                    </p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(totalLedgerPaymentAmount)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent>
                    <p className="text-xs uppercase text-muted-foreground">
                      Pending
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(totalLedgerPending)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {filteredLedgerRows.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">
                          Invoice / Bill
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Bill Amount
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Payment
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Mode
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Debit
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Credit
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Closing Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredLedgerRows.map((row) => (
                        <tr
                          key={`${row.type}-${row.id}`}
                          className="hover:bg-muted/10"
                        >
                          <td className="px-4 py-3">{formatDate(row.date)}</td>
                          <td className="px-4 py-3">
                            {row.billNo ?? row.invoiceNo ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {row.billAmount > 0
                              ? formatCurrency(row.billAmount)
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<Package className="h-10 w-10" />}
                  title="No Ledger Entries"
                  desc="No loadings or payments exist yet for this client."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loadings" className="space-y-4">
          {client.loadings && client.loadings.length > 0 ? (
            client.loadings.map((loading: any) => (
              <Card key={loading.billNo} className="overflow-hidden">
                <div className="bg-muted/30 p-4 border-b flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">
                        Bill #{loading.billNo}
                      </span>
                      <Badge
                        variant={
                          loading.tripStatus === "COMPLETED"
                            ? "default"
                            : "outline"
                        }
                      >
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
                      {formatCurrency(loading?.grandTotal)}
                    </p>
                  </div>
                </div>

                <CardContent className="p-0">
                  {/* Items Table */}
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
                            Total Kgs
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Rate/Kg
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Total
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
                              {item.totalKgs}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(item.pricePerKg)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(item.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/10 p-4 flex flex-wrap justify-between items-end gap-4 text-sm">
                  <div className="space-y-1 text-muted-foreground">
                    <p>
                      Started: {formatDate(loading.startedAt)} | Completed:{" "}
                      {formatDate(loading.completedAt)}
                    </p>
                    <p>
                      Total Trays: {loading.totalTrays} | Total Weight:{" "}
                      {loading.totalKgs}kg
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex justify-between gap-8">
                      <span>Subtotal (Price):</span>
                      <span>{formatCurrency(loading.totalPrice)}</span>
                    </div>
                    <div className="flex justify-between gap-8 text-muted-foreground">
                      <span>Dispatch Charges:</span>
                      <span>
                        +{formatCurrency(loading.dispatchChargesTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-8 text-muted-foreground">
                      <span>Ice:</span>
                      <span>+{formatCurrency(loading.packingAmountTotal)}</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title="No Loadings Found"
              desc="This client has no loadings associated yet."
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

function ErrorState({ error }: { error: Error | AxiosError }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-bold">
        {axios.isAxiosError(error)
          ? error.response?.data.message
          : error.message || "Client not found"}
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

export default ClientViewPage;
