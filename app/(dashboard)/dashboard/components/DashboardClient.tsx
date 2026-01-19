// app/(dashboard)/dashboard/components/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { DashboardMetrics } from "@/lib/dashboard";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Truck,
  Wallet,
  PieChart as PieIcon,
  Activity,
  Fish,
  CalendarIcon,
  Download,
  Trash2,
} from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

type LoadingItem = {
  id?: string;
  varietyCode: string;
  noTrays: number;
  trayKgs?: number;
  loose: number;
  totalKgs: number;
  pricePerKg: number;
  totalPrice: number;
};

type DispatchCharge = {
  type?: string;
  label?: string | null;
  amount: number;
};

type PackingAmount = {
  id?: string;
  totalAmount: number;
};

type DispatchBreakdown = {
  iceCooling: number;
  transportCharges: number;
  otherCharges?: Array<{ label?: string; amount?: number }>;
  dispatchChargesTotal: number;
};
type VendorPayment = {
  id: string;
  vendorId: string;
  vendorKey?: string | null;
  vendorName: string;
  source: "farmer" | "agent";
  date: string;
  amount: number;
  paymentMode: string;
  isInstallment: boolean;
  installments?: number | null;
  installmentNumber?: number | null;
  createdAt: string;
  sourceRecordId: string;
};

type FarmerLoading = {
  id: string;
  billNo: string;
  FarmerName: string;
  date: string;
  village?: string;
  vehicleNo?: string;
  tripStatus?: string;

  totalTrays: number;
  totalLooseKgs: number;
  totalKgs: number;

  totalPrice: number;
  dispatchChargesTotal: number;
  packingAmountTotal: number;
  grandTotal: number;

  items: LoadingItem[];
};

type AgentLoading = {
  id: string;
  billNo: string;
  agentName: string;
  date: string;
  village?: string;
  vehicleNo?: string;
  tripStatus?: string;

  totalTrays: number;
  totalLooseKgs: number;
  totalKgs: number;

  totalPrice: number;
  dispatchChargesTotal: number;
  packingAmountTotal: number;
  grandTotal: number;

  items: LoadingItem[];
};

type ClientLoading = {
  id: string;
  clientId?: string;
  clientName: string;
  billNo: string;
  date: string;
  fishCode?: string;
  village?: string;
  vehicleNo?: string;
  tripStatus?: string;

  totalTrays: number;
  totalLooseKgs: number;
  totalTrayKgs?: number;
  totalKgs: number;

  totalPrice: number;
  dispatchChargesTotal: number;
  packingAmountTotal: number;
  grandTotal: number;

  items: LoadingItem[];
  dispatchCharges?: DispatchCharge[];
  packingAmounts?: PackingAmount[];
  dispatchBreakdown?: DispatchBreakdown;

  packingDone?: boolean;
  dispatchDone?: boolean;
};

type ClientPayment = {
  id: string;
  clientId: string; // IMPORTANT: In your sample this equals loading.id
  clientDetailsId?: string;
  clientKey?: string;
  clientName: string;
  date: string;
  amount: number;
  paymentMode: string;
  isInstallment: boolean;
  installments?: number | null;
  installmentNumber?: number | null;
  createdAt: string;
};

type ApiResponse<T> = { data?: T } | T;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed: ${url}`);
  const json: unknown = await res.json();
  if (isObj(json) && "data" in json) return (json as { data: T }).data;
  return json as T;
}

/* ---------------- Styling constants ---------------- */
const THEME = "#139BC3";

const CHART = {
  sales: THEME,
  purchase: "#60A5FA",
  grid: "#E2E8F0",
  muted: "#64748B",
  pie: [THEME, "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"],
};

function money(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function qty(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(
    Number(n || 0)
  );
}

/* ---------------- Tooltips ---------------- */
type RechartsTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    fill?: string;
  }>;
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: RechartsTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {money(entry.value ?? 0)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: RechartsTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{payload[0]?.name}</p>
        <p style={{ color: payload[0]?.fill }}>
          {qty(payload[0]?.value ?? 0)} kgs
        </p>
      </div>
    );
  }
  return null;
};

/* ---------------- KPI Card ---------------- */
function Spark({ tone = "brand" }: { tone?: "brand" | "green" | "red" }) {
  const bg =
    tone === "green"
      ? "rgba(34,197,94,.12)"
      : tone === "red"
      ? "rgba(239,68,68,.12)"
      : "rgba(19,155,195,.12)";
  return (
    <div
      className="h-1 w-10 rounded-full"
      style={{
        backgroundColor: bg,
        boxShadow: "0 10px 18px rgba(15,23,42,.06)",
      }}
    />
  );
}

function KpiCard({
  title,
  value,
  icon,
  tone = "brand",
  sub,
  variant = "default", // ✅ NEW
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: "brand" | "green" | "red";
  sub?: string;
  variant?: "default" | "danger"; // ✅ NEW
}) {
  const ring =
    tone === "green"
      ? "rgba(34,197,94,.18)"
      : tone === "red"
      ? "rgba(239,68,68,.18)"
      : "rgba(19,155,195,.18)";

  const isDanger = variant === "danger";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <Card
        className={[
          "rounded-2xl border shadow-sm hover:shadow-md transition-shadow",
          isDanger
            ? "border-red-200 bg-red-50" // ✅ whole card becomes red-ish
            : "border-slate-200 bg-white", // ✅ normal white
        ].join(" ")}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={
                  isDanger
                    ? "text-xs sm:text-sm text-red-700"
                    : "text-xs sm:text-sm text-slate-600"
                }
              >
                {title}
              </p>

              <p
                className={[
                  "mt-2 text-xl sm:text-3xl font-extrabold tabular-nums",
                  isDanger ? "text-red-900" : "text-slate-900",
                ].join(" ")}
              >
                {value}
              </p>

              {sub ? (
                <p
                  className={
                    isDanger
                      ? "mt-2 text-xs text-red-700/80 line-clamp-1"
                      : "mt-2 text-xs text-slate-500 line-clamp-1"
                  }
                >
                  {sub}
                </p>
              ) : (
                <div className="mt-3">
                  <Spark tone={tone} />
                </div>
              )}
            </div>

            <div
              className="h-11 w-11 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: isDanger ? "rgba(239,68,68,.16)" : ring,
              }}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ---------------- Date Picker ---------------- */
const PRESETS: Array<{ label: string; get: () => DateRange }> = [
  {
    label: "Today",
    get: () => {
      const d = new Date();
      return { from: startOfDay(d), to: endOfDay(d) };
    },
  },
  {
    label: "Last 7 days",
    get: () => {
      const to = new Date();
      const from = subDays(to, 6);
      return { from: startOfDay(from), to: endOfDay(to) };
    },
  },
  {
    label: "Last 30 days",
    get: () => {
      const to = new Date();
      const from = subDays(to, 29);
      return { from: startOfDay(from), to: endOfDay(to) };
    },
  },
  {
    label: "Last 90 days",
    get: () => {
      const to = new Date();
      const from = subDays(to, 89);
      return { from: startOfDay(from), to: endOfDay(to) };
    },
  },
];

function formatRange(r: DateRange): string {
  if (!r.from) return "Select date range";
  const a = format(r.from, "dd MMM yyyy");
  const b = r.to ? format(r.to, "dd MMM yyyy") : a;
  return `${a} → ${b}`;
}

function DateRangePicker({
  value,
  onApply,
}: {
  value: DateRange;
  onApply: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);

  useEffect(() => setDraft(value), [value]);

  const apply = () => {
    if (draft.from && !draft.to) onApply({ from: draft.from, to: draft.from });
    else onApply(draft);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* ✅ Responsive button */}
        <Button variant="outline" className="w-full sm:w-[280px] justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRange(value)}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col md:flex-row">
          <div className="border-b md:border-r md:border-b-0 border-slate-200 p-3">
            <div className="text-xs font-semibold text-slate-500 px-2 py-2">
              Quick ranges
            </div>

            <div className="space-y-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDraft(p.get())}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 px-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(value);
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={apply}
                style={{ backgroundColor: THEME, color: "white" }}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="p-3">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={draft}
              onSelect={(r) =>
                setDraft(r ?? { from: undefined, to: undefined })
              }
              initialFocus
            />
            <div className="mt-2 text-xs text-slate-500 px-2">
              Selected:{" "}
              <span className="text-slate-900">{formatRange(draft)}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Age Row ---------------- */
function AgeRow({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-sm font-bold text-slate-900 tabular-nums">
          {value}
        </div>
      </div>

      <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(pct * 100)}%`,
            backgroundColor: "rgba(239,68,68,.65)",
          }}
        />
      </div>
    </div>
  );
}

/* ---------------- Main Dashboard ---------------- */
export default function DashboardClient({
  data,
  initialFrom,
  initialTo,
  initialAgg,
}: {
  data: DashboardMetrics;
  initialFrom: string;
  initialTo: string;
  initialAgg: "day" | "week" | "month";
}) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [varietyToDelete, setVarietyToDelete] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [deleteMessage, setDeleteMessage] = useState("");

  const openDeleteDialog = (variety: { code: string; name: string }) => {
    setVarietyToDelete(variety);
    setDeleteStatus("idle");
    setDeleteMessage("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!varietyToDelete) return;

    setIsDeleting(true);
    setDeleteStatus("idle");

    try {
      const res = await fetch("/api/fish-varieties", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: varietyToDelete.code }),
      });

      const json: unknown = await res.json();

      if (isObj(json) && (json as { success?: boolean }).success) {
        setDeleteStatus("success");
        setDeleteMessage(
          `Variety ${varietyToDelete.code} deleted successfully`
        );
        router.refresh();
        setTimeout(() => {
          setDeleteDialogOpen(false);
          setVarietyToDelete(null);
        }, 1500);
      } else {
        const msg =
          isObj(json) &&
          typeof (json as { message?: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Failed to delete variety";
        setDeleteStatus("error");
        setDeleteMessage(msg);
      }
    } catch {
      setDeleteStatus("error");
      setDeleteMessage("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // range + agg
  const safeFrom = new Date(initialFrom);
  const safeTo = new Date(initialTo);

  const [range, setRange] = useState<DateRange>(() => ({
    from: startOfDay(
      Number.isNaN(safeFrom.getTime()) ? subDays(new Date(), 6) : safeFrom
    ),
    to: endOfDay(Number.isNaN(safeTo.getTime()) ? new Date() : safeTo),
  }));

  const [agg, setAgg] = useState<"day" | "week" | "month">(initialAgg);

  useEffect(() => {
    const f = new Date(initialFrom);
    const t = new Date(initialTo);
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime())) {
      setRange({ from: startOfDay(f), to: endOfDay(t) });
    }
  }, [initialFrom, initialTo]);

  const applyRangeToUrl = (r: DateRange) => {
    if (!r.from) return;

    const from = startOfDay(r.from);
    const to = endOfDay(r.to ?? r.from);

    const next = new URLSearchParams(searchParams.toString());
    next.set("from", from.toISOString());
    next.set("to", to.toISOString());

    router.push(`${pathname}?${next.toString()}`);
  };

  const applyAggToUrl = (newAgg: "day" | "week" | "month") => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("agg", newAgg);
    router.push(`${pathname}?${next.toString()}`);
    setAgg(newAgg);
  };

  /* ---------------- ✅ Export: Farmer + Agent + Client + Payments ---------------- */
  const handleExport = async () => {
    try {
      const [farmer, agent, clientLoadings, clientPayments, vendorPayments] =
        await Promise.all<[unknown, unknown, unknown, unknown, unknown]>([
          fetchJson<unknown>("/api/former-loading"),
          fetchJson<unknown>("/api/agent-loading"),
          fetchJson<unknown>("/api/client-loading"),
          fetchJson<unknown>("/api/payments/client"),
          fetchJson<unknown>("/api/payments/vendor"),
        ]);

      const farmerRows = Array.isArray(farmer)
        ? (farmer as FarmerLoading[])
        : [];
      const agentRows = Array.isArray(agent) ? (agent as AgentLoading[]) : [];

      const clientRows = Array.isArray(clientLoadings)
        ? (clientLoadings as ClientLoading[])
        : [];

      const clientPaymentRows = Array.isArray(clientPayments)
        ? (clientPayments as ClientPayment[])
        : [];

      const vendorPaymentRows = Array.isArray(vendorPayments)
        ? (vendorPayments as VendorPayment[])
        : [];

      const farmerPay = vendorPaymentRows.filter((p) => p.source === "farmer");
      const agentPay = vendorPaymentRows.filter((p) => p.source === "agent");

      const wb = new ExcelJS.Workbook();
      wb.creator = "RS Fisheries";
      wb.created = new Date();

      // ✅ Farmer + Agent (same like client style with payments & balance)
      buildVendorWithPaymentsSheetExcelJS(
        wb,
        farmerRows,
        farmerPay,
        "Farmer Loadings + Payments",
        "Farmer"
      );

      buildVendorWithPaymentsSheetExcelJS(
        wb,
        agentRows,
        agentPay,
        "Agent Loadings + Payments",
        "Agent"
      );

      // ✅ Client (keep your existing)
      buildClientWithPaymentsSheetExcelJS(wb, clientRows, clientPaymentRows);

      const buf = await wb.xlsx.writeBuffer();

      saveAs(
        new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `RS-Fisheries_Loadings_${format(new Date(), "dd-MM-yyyy")}.xlsx`
      );
    } catch (e) {
      console.error(e);
      alert("Export failed. Please try again.");
    }
  };

  // charts data
  const weeklyData = useMemo(
    () =>
      data.weekly.map((d) => ({
        day: d.label,
        purchase: d.purchase,
        sales: d.sales,
      })),
    [data.weekly]
  );

  const movementData = useMemo(
    () =>
      data.movement.map((d) => ({
        day: d.label,
        purchase: d.purchase,
        sales: d.sales,
      })),
    [data.movement]
  );

  const pieData = useMemo(
    () =>
      data.topVarieties.map((v) => ({
        name: v.code,
        value: v.kgs,
      })),
    [data.topVarieties]
  );

  const ageingData = useMemo(
    () => data.outstandingAgeing,
    [data.outstandingAgeing]
  );

  const ageingTotal = ageingData.reduce((s, a) => s + a.amount, 0);
  const ageingSafeTotal = ageingTotal > 0 ? ageingTotal : 1;

  return (
    <AnimatePresence>
      <div className="space-y-4 sm:space-y-6">
        {/* ✅ Responsive Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Dashboard
              </h1>
              <p className="text-sm text-slate-500">
                Quick view of sales, purchases, movement & outstanding
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={agg === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => applyAggToUrl("day")}
              >
                Daily
              </Button>
              <Button
                variant={agg === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => applyAggToUrl("week")}
              >
                Weekly
              </Button>
              <Button
                variant={agg === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => applyAggToUrl("month")}
              >
                Monthly
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="w-full sm:w-auto">
              <DateRangePicker value={range} onApply={applyRangeToUrl} />
            </div>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Loadings
            </Button>
          </div>
        </motion.div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {(() => {
            const sales = Number(data.today.sales || 0);
            const purchase = Number(data.today.purchase || 0);

            const isLowSales = sales === 0 || sales < purchase;

            const salesTone: "green" | "red" = isLowSales ? "red" : "green";

            return (
              <KpiCard
                title="Dispatch"
                value={money(sales)}
                tone={salesTone}
                variant={isLowSales ? "danger" : "default"} // ✅ card background
                icon={
                  isLowSales ? (
                    <TrendingDown className="text-red-600 w-6 h-6" />
                  ) : (
                    <TrendingUp className="text-green-600 w-6 h-6" />
                  )
                }
                sub="Total sales value (selected range)"
              />
            );
          })()}

          <KpiCard
            title="Purchase"
            value={money(data.today.purchase)}
            tone="brand"
            icon={<ShoppingCart style={{ color: THEME }} className="w-6 h-6" />}
            sub="Total purchase value (selected range)"
          />

          <KpiCard
            title="Shipments"
            value={data.today.pendingShipments.toString()}
            tone="brand"
            icon={<Truck style={{ color: THEME }} className="w-6 h-6" />}
            sub="Count (selected range)"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 items-stretch">
          {/* Overview */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 px-4 sm:px-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 text-base sm:text-lg">
                    Overview
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Sales vs Purchase (selected range)
                  </p>
                </div>
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(19,155,195,.10)" }}
                >
                  <Activity style={{ color: THEME }} />
                </div>
              </CardHeader>
              <CardContent className="px-2 sm:px-6 h-[230px] sm:h-[310px] lg:h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyData}
                    barCategoryGap={isMobile ? 10 : 14}
                  >
                    <CartesianGrid stroke={CHART.grid} strokeDasharray="4 6" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: CHART.muted, fontSize: 11 }}
                      axisLine={{ stroke: CHART.grid }}
                      tickLine={{ stroke: CHART.grid }}
                      interval={isMobile ? 1 : 0}
                      tickMargin={8}
                      minTickGap={8}
                    />
                    <YAxis
                      tick={{ fill: CHART.muted, fontSize: 11 }}
                      axisLine={{ stroke: CHART.grid }}
                      tickLine={{ stroke: CHART.grid }}
                      width={isMobile ? 26 : 34}
                      tickFormatter={(value) =>
                        money(Number(value)).replace("₹", "")
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar
                      dataKey="purchase"
                      fill={CHART.purchase}
                      radius={[12, 12, 0, 0]}
                      name="Purchase"
                    />
                    <Bar
                      dataKey="sales"
                      fill={CHART.sales}
                      radius={[12, 12, 0, 0]}
                      name="Sales"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Varieties */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 px-4 sm:px-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 text-base sm:text-lg">
                    Top Varieties
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    By quantity (selected range)
                  </p>
                </div>
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(19,155,195,.10)" }}
                >
                  <PieIcon style={{ color: THEME }} />
                </div>
              </CardHeader>

              <CardContent className="px-2 sm:px-6 h-[230px] sm:h-[310px] lg:h-[330px] flex flex-col justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<PieTooltip />} />
                    <Legend verticalAlign="bottom" height={36} />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={isMobile ? 78 : 96}
                      innerRadius={isMobile ? 46 : 56}
                      paddingAngle={2}
                      label={({ value }) => qty(Number(value))}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={CHART.pie[i % CHART.pie.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sales vs Movement */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 px-4 sm:px-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 text-base sm:text-lg">
                    Sales vs Movement
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Trend comparison (selected range)
                  </p>
                </div>
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(19,155,195,.10)" }}
                >
                  <IndianRupee style={{ color: THEME }} />
                </div>
              </CardHeader>
              <CardContent className="px-2 sm:px-6 h-[230px] sm:h-[310px] lg:h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={movementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: CHART.muted, fontSize: 11 }}
                      axisLine={{ stroke: CHART.grid }}
                      tickLine={{ stroke: CHART.grid }}
                      interval={isMobile ? 1 : 0}
                      tickMargin={8}
                    />
                    <YAxis
                      tick={{ fill: CHART.muted, fontSize: 11 }}
                      axisLine={{ stroke: CHART.grid }}
                      tickLine={{ stroke: CHART.grid }}
                      width={isMobile ? 26 : 34}
                      tickFormatter={(v) => money(Number(v)).replace("₹", "")}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke={CHART.sales}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="purchase"
                      name="Stock Movement"
                      stroke={CHART.purchase}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Outstanding Ageing */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardHeader className="pb-3 px-5 sm:px-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 text-base sm:text-lg">
                    Outstanding Ageing
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Bucket-wise (selected range)
                  </p>
                </div>

                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(239,68,68,.10)" }}
                >
                  <TrendingDown className="text-red-600" />
                </div>
              </CardHeader>

              <CardContent className="px-5 sm:px-6 pb-5">
                <div className="space-y-2">
                  {ageingData.map((a) => (
                    <AgeRow
                      key={a.bucket}
                      label={a.bucket}
                      value={money(a.amount)}
                      pct={a.amount / ageingSafeTotal}
                    />
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between font-bold">
                  <div className="text-sm text-slate-700">Total</div>
                  <div className="text-sm text-slate-900 tabular-nums">
                    {money(ageingTotal)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Fish Varieties */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 pb-2">
                <div>
                  <CardTitle className="text-base sm:text-lg text-slate-900">
                    Fish Varieties
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Available varieties in system
                  </p>
                </div>

                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-[rgba(19,155,195,0.12)]">
                  <Fish className="h-5 w-5 text-[#139BC3]" />
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-6 pb-6">
                {data.fishVarieties.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No fish varieties found.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {data.fishVarieties.map((v) => (
                      <div
                        key={v.code}
                        className="group relative flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm shadow-sm transition-all hover:border-red-300 hover:bg-red-50"
                      >
                        <span className="font-semibold text-slate-800">
                          {v.code}
                        </span>

                        <button
                          onClick={() => openDeleteDialog(v)}
                          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:text-red-600 focus:outline-none"
                          aria-label={`Delete ${v.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {v.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Fish Variety</DialogTitle>
                <DialogDescription className="pt-2">
                  Are you sure you want to delete{" "}
                  <strong>
                    {varietyToDelete?.code}{" "}
                    {varietyToDelete?.name !== varietyToDelete?.code &&
                      `- ${varietyToDelete?.name}`}
                  </strong>
                  ?
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {deleteStatus === "success" && (
                  <p className="text-green-600 text-center font-medium">
                    {deleteMessage}
                  </p>
                )}
                {deleteStatus === "error" && (
                  <p className="text-red-600 text-center font-medium">
                    {deleteMessage}
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setVarietyToDelete(null);
                    setDeleteStatus("idle");
                  }}
                  disabled={isDeleting || deleteStatus === "success"}
                >
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting || deleteStatus === "success"}
                  className="min-w-24"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AnimatePresence>
  );
}

function buildSimpleLoadingSheetExcelJS(
  wb: ExcelJS.Workbook,
  loadings: unknown[],
  sheetName: string,
  type: "farmer" | "agent"
) {
  const ws = wb.addWorksheet(sheetName);

  ws.columns = [
    {
      header: type === "farmer" ? "Farmer Name" : "Agent Name",
      key: "name",
      width: 28,
    },
    { header: "Date", key: "date", width: 14 },
    { header: "Bill No", key: "bill", width: 16 },
    { header: "Variety", key: "variety", width: 14 },
    { header: "Trays", key: "trays", width: 10 },
    { header: "Loose", key: "loose", width: 10 },
    { header: "Total Kgs", key: "kgs", width: 12 },
    { header: "Rate", key: "rate", width: 10 },
    { header: "Amount", key: "amount", width: 14 },
  ];

  // Header style
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF139BC3" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;

  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Helpers
  const moneyCell = (cell: ExcelJS.Cell) => {
    cell.numFmt = "₹#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  const centerCell = (cell: ExcelJS.Cell) => {
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };

  const applyThinBorder = (cell: ExcelJS.Cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  };

  let grandTrays = 0;
  let grandLoose = 0;
  let grandKgs = 0;
  let grandAmount = 0;

  for (const raw of loadings) {
    if (!isObj(raw)) continue;

    const l = raw as Record<string, unknown>;
    const nameKey = type === "farmer" ? "FarmerName" : "agentName";
    const name = typeof l[nameKey] === "string" ? (l[nameKey] as string) : "";

    const dateStr =
      typeof l.date === "string" ? format(new Date(l.date), "dd/MM/yyyy") : "";

    const billNo = typeof l.billNo === "string" ? (l.billNo as string) : "";

    const items = Array.isArray(l.items) ? (l.items as unknown[]) : [];

    // Bill totals from API if present (best, matches your backend)
    const billTotalTrays = typeof l.totalTrays === "number" ? l.totalTrays : 0;
    const billTotalLoose =
      typeof l.totalLooseKgs === "number" ? l.totalLooseKgs : 0;
    const billTotalKgs = typeof l.totalKgs === "number" ? l.totalKgs : 0;
    const billTotalAmount = typeof l.totalPrice === "number" ? l.totalPrice : 0;

    // Add item rows
    for (const itRaw of items) {
      if (!isObj(itRaw)) continue;
      const it = itRaw as Record<string, unknown>;

      const row = ws.addRow({
        name,
        date: dateStr,
        bill: billNo,
        variety: typeof it.varietyCode === "string" ? it.varietyCode : "",
        trays: typeof it.noTrays === "number" ? it.noTrays : 0,
        loose: typeof it.loose === "number" ? it.loose : 0,
        kgs: typeof it.totalKgs === "number" ? it.totalKgs : 0,
        rate: typeof it.pricePerKg === "number" ? it.pricePerKg : 0,
        amount: typeof it.totalPrice === "number" ? it.totalPrice : 0,
      });

      // align numeric
      centerCell(row.getCell(5));
      centerCell(row.getCell(6));
      centerCell(row.getCell(7));
      moneyCell(row.getCell(8));
      moneyCell(row.getCell(9));
    }

    // ✅ Per-bill TOTAL row
    const totalRow = ws.addRow({
      name: "",
      date: "",
      bill: "",
      variety: "TOTAL",
      trays: billTotalTrays,
      loose: billTotalLoose,
      kgs: billTotalKgs,
      rate: "",
      amount: billTotalAmount,
    });

    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    centerCell(totalRow.getCell(5));
    centerCell(totalRow.getCell(6));
    centerCell(totalRow.getCell(7));
    moneyCell(totalRow.getCell(9));

    // accumulate grand totals
    grandTrays += billTotalTrays;
    grandLoose += billTotalLoose;
    grandKgs += billTotalKgs;
    grandAmount += billTotalAmount;

    // blank spacer row
    ws.addRow({});
  }

  // ✅ Final GRAND TOTAL row (bottom)
  const grandRow = ws.addRow({
    name: "",
    date: "",
    bill: "",
    variety: "GRAND TOTAL",
    trays: grandTrays,
    loose: grandLoose,
    kgs: grandKgs,
    rate: "",
    amount: grandAmount,
  });

  grandRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  grandRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  centerCell(grandRow.getCell(5));
  centerCell(grandRow.getCell(6));
  centerCell(grandRow.getCell(7));
  moneyCell(grandRow.getCell(9));

  // Borders for all non-empty cells
  for (let row = 1; row <= ws.rowCount; row++) {
    for (let col = 1; col <= 9; col++) {
      const cell = ws.getCell(row, col);
      const v = cell.value;
      const hasValue =
        v !== null &&
        v !== undefined &&
        !(typeof v === "string" && v.trim() === "");
      if (hasValue) applyThinBorder(cell);
    }
  }
}
function buildVendorWithPaymentsSheetExcelJS(
  wb: ExcelJS.Workbook,
  loadings: Array<FarmerLoading | AgentLoading>,
  payments: VendorPayment[],
  sheetName: string,
  vendorLabel: "Farmer" | "Agent"
) {
  const ws = wb.addWorksheet(sheetName);

  ws.columns = [
    { header: "Label", key: "c1", width: 22 },
    { header: "Value", key: "c2", width: 40 },
    { header: "Label", key: "c3", width: 16 },
    { header: "Value", key: "c4", width: 20 },
    { header: "Label", key: "c5", width: 16 },
    { header: "Value", key: "c6", width: 18 },
  ];

  const THEME = "FF139BC3";
  const LIGHT = "FFF1F5F9";
  const SOFT_GREEN = "FFDCFCE7";
  const SOFT_RED = "FFFEE2E2";
  const DARK = "FF0F172A";

  const titleStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    row.alignment = { vertical: "middle", horizontal: "left" };
    row.height = 20;
  };

  const sectionStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: "FF0F172A" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    row.alignment = { vertical: "middle", horizontal: "left" };
    row.height = 18;
  };

  const tableHeaderStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
    row.alignment = { vertical: "middle", horizontal: "center" };
    row.height = 18;
  };

  const moneyCell = (cell: ExcelJS.Cell) => {
    cell.numFmt = "₹#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  const centerCell = (cell: ExcelJS.Cell) => {
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };

  const leftCell = (cell: ExcelJS.Cell) => {
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  };

  const applyThinBorder = (cell: ExcelJS.Cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  };

  // group vendor payments by loading.id using sourceRecordId
  const paymentsBySourceRecordId = new Map<string, VendorPayment[]>();
  for (const p of payments) {
    const arr = paymentsBySourceRecordId.get(p.sourceRecordId) ?? [];
    arr.push(p);
    paymentsBySourceRecordId.set(p.sourceRecordId, arr);
  }

  let r = 1;

  ws.mergeCells(`A${r}:F${r}`);
  ws.getCell(`A${r}`).value = `${vendorLabel} Loadings + Charges + Payments`;
  titleStyle(ws.getRow(r));
  r += 2;

  for (let i = 0; i < loadings.length; i++) {
    const l = loadings[i];

    const vendorName =
      vendorLabel === "Farmer"
        ? (l as FarmerLoading).FarmerName
        : (l as AgentLoading).agentName;

    // Bill title
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = `#${i + 1}  ${vendorName}  •  Bill: ${
      l.billNo
    }`;
    titleStyle(ws.getRow(r));
    r++;

    // Info row 1
    ws.getCell(`A${r}`).value = `${vendorLabel} Name`;
    ws.getCell(`B${r}`).value = vendorName;

    ws.getCell(`C${r}`).value = "Date";
    ws.getCell(`D${r}`).value = l.date
      ? format(new Date(l.date), "dd/MM/yyyy")
      : "";

    ws.getCell(`E${r}`).value = "Trip";
    ws.getCell(`F${r}`).value = l.tripStatus ?? "";

    leftCell(ws.getCell(`B${r}`));
    centerCell(ws.getCell(`D${r}`));
    centerCell(ws.getCell(`F${r}`));
    r++;

    // Info row 2
    ws.getCell(`A${r}`).value = "Village / Address";
    ws.getCell(`B${r}`).value = l.village ?? "";

    ws.getCell(`C${r}`).value = "Vehicle";
    ws.getCell(`D${r}`).value = l.vehicleNo ?? "";

    ws.getCell(`E${r}`).value = "Fish Code";
    ws.getCell(`F${r}`).value = (l as any).fishCode ?? "";

    leftCell(ws.getCell(`B${r}`));
    leftCell(ws.getCell(`D${r}`));
    centerCell(ws.getCell(`F${r}`));
    r++;

    // Items section
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = "Loading Items";
    sectionStyle(ws.getRow(r));
    r++;

    ws.getRow(r).values = [
      "",
      "Sl.No",
      "Category",
      "Trays",
      "Loose",
      "Total KGS",
    ];
    tableHeaderStyle(ws.getRow(r));
    r++;

    for (let idx = 0; idx < (l.items ?? []).length; idx++) {
      const it = l.items[idx];
      ws.getCell(`B${r}`).value = idx + 1;
      ws.getCell(`C${r}`).value = it.varietyCode ?? "";
      ws.getCell(`D${r}`).value = Number(it.noTrays ?? 0);
      ws.getCell(`E${r}`).value = Number(it.loose ?? 0);
      ws.getCell(`F${r}`).value = Number(it.totalKgs ?? 0);

      centerCell(ws.getCell(`B${r}`));
      leftCell(ws.getCell(`C${r}`));
      centerCell(ws.getCell(`D${r}`));
      centerCell(ws.getCell(`E${r}`));
      centerCell(ws.getCell(`F${r}`));
      r++;
    }

    // ✅ Bill TOTAL row (only per bill, no grand)
    ws.getCell(`C${r}`).value = "Total";
    ws.getCell(`D${r}`).value = Number(l.totalTrays ?? 0);
    ws.getCell(`E${r}`).value = Number(l.totalLooseKgs ?? 0);
    ws.getCell(`F${r}`).value = Number(l.totalKgs ?? 0);
    ws.getRow(r).font = { bold: true };
    ws.getRow(r).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: LIGHT },
    };
    r += 2;

    // Charges section
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = "Charges & Totals";
    sectionStyle(ws.getRow(r));
    r++;

    ws.getCell(`A${r}`).value = "Total Price";
    ws.getCell(`B${r}`).value = Number(l.totalPrice ?? 0);
    moneyCell(ws.getCell(`B${r}`));

    ws.getCell(`C${r}`).value = "Dispatch";
    ws.getCell(`D${r}`).value = Number(l.dispatchChargesTotal ?? 0);
    moneyCell(ws.getCell(`D${r}`));

    ws.getCell(`E${r}`).value = "Ice";
    ws.getCell(`F${r}`).value = Number(l.packingAmountTotal ?? 0);
    moneyCell(ws.getCell(`F${r}`));
    r++;

    ws.getCell(`A${r}`).value = "Grand Total";
    ws.getCell(`B${r}`).value = Number(l.grandTotal ?? 0);
    moneyCell(ws.getCell(`B${r}`));
    ws.getRow(r).font = { bold: true };
    ws.getRow(r).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0F2FE" },
    };
    r += 2;

    // Payments section
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = "Payments (Full / Installments)";
    sectionStyle(ws.getRow(r));
    r++;

    ws.getRow(r).values = [
      "",
      "Date",
      "Amount",
      "Mode",
      "Type",
      "Installment #",
    ];
    tableHeaderStyle(ws.getRow(r));
    r++;

    const pay = (paymentsBySourceRecordId.get(l.id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    let paidTotal = 0;

    if (pay.length === 0) {
      ws.mergeCells(`B${r}:F${r}`);
      ws.getCell(`B${r}`).value = "No payments found for this bill.";
      ws.getCell(`B${r}`).font = { italic: true, color: { argb: "FF64748B" } };
      r++;
    } else {
      for (const p of pay) {
        paidTotal += Number(p.amount ?? 0);

        ws.getCell(`B${r}`).value = p.date
          ? format(new Date(p.date), "dd/MM/yyyy")
          : "";
        ws.getCell(`C${r}`).value = Number(p.amount ?? 0);
        ws.getCell(`D${r}`).value = p.paymentMode ?? "";
        ws.getCell(`E${r}`).value = p.isInstallment ? "Installment" : "Full";
        ws.getCell(`F${r}`).value = p.isInstallment
          ? p.installmentNumber ?? "-"
          : "-";

        centerCell(ws.getCell(`B${r}`));
        moneyCell(ws.getCell(`C${r}`));
        centerCell(ws.getCell(`D${r}`));
        centerCell(ws.getCell(`E${r}`));
        centerCell(ws.getCell(`F${r}`));
        r++;
      }
    }

    const grand = Number(l.grandTotal ?? 0);
    const balance = Math.max(0, grand - paidTotal);

    ws.getCell(`A${r}`).value = "Paid Total";
    ws.getCell(`B${r}`).value = paidTotal;
    moneyCell(ws.getCell(`B${r}`));

    ws.getCell(`C${r}`).value = "Balance";
    ws.getCell(`D${r}`).value = balance;
    moneyCell(ws.getCell(`D${r}`));

    ws.getRow(r).font = { bold: true };
    ws.getRow(r).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: balance === 0 ? SOFT_GREEN : SOFT_RED },
    };
    r += 2;

    // separator
    ws.addRow([]);
    r++;
  }

  // borders
  for (let row = 1; row <= ws.rowCount; row++) {
    for (let col = 1; col <= 6; col++) {
      const cell = ws.getCell(row, col);
      const v = cell.value;
      const hasValue =
        v !== null &&
        v !== undefined &&
        !(typeof v === "string" && v.trim() === "");
      if (hasValue) applyThinBorder(cell);
    }
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function buildClientWithPaymentsSheetExcelJS(
  wb: ExcelJS.Workbook,
  clientLoadings: ClientLoading[],
  clientPayments: ClientPayment[]
) {
  const ws = wb.addWorksheet("Client Loadings + Payments");

  ws.columns = [
    { header: "Label", key: "c1", width: 22 },
    { header: "Value", key: "c2", width: 40 },
    { header: "Label", key: "c3", width: 16 },
    { header: "Value", key: "c4", width: 20 },
    { header: "Label", key: "c5", width: 16 },
    { header: "Value", key: "c6", width: 18 },
  ];

  const THEME = "FF139BC3";
  const LIGHT = "FFF1F5F9";
  const SOFT_GREEN = "FFDCFCE7";
  const SOFT_RED = "FFFEE2E2";
  const DARK = "FF0F172A";

  const titleStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    row.alignment = { vertical: "middle", horizontal: "left" };
    row.height = 20;
  };

  const sectionStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: "FF0F172A" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    row.alignment = { vertical: "middle", horizontal: "left" };
    row.height = 18;
  };

  const tableHeaderStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
    row.alignment = { vertical: "middle", horizontal: "center" };
    row.height = 18;
  };

  const moneyCell = (cell: ExcelJS.Cell) => {
    cell.numFmt = "₹#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  const centerCell = (cell: ExcelJS.Cell) => {
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };

  const leftCell = (cell: ExcelJS.Cell) => {
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  };

  const applyThinBorder = (cell: ExcelJS.Cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  };

  // payments grouped by loading id
  const paymentsByLoadingId = new Map<string, ClientPayment[]>();
  for (const p of clientPayments) {
    const arr = paymentsByLoadingId.get(p.clientId) ?? [];
    arr.push(p);
    paymentsByLoadingId.set(p.clientId, arr);
  }

  let r = 1;

  ws.mergeCells(`A${r}:F${r}`);
  ws.getCell(`A${r}`).value = "Client Loadings + Charges + Payments";
  titleStyle(ws.getRow(r));
  r += 2;

  for (let i = 0; i < clientLoadings.length; i++) {
    const l = clientLoadings[i];

    // Title row per bill
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = `#${i + 1}  ${l.clientName}  •  Bill: ${
      l.billNo
    }`;
    titleStyle(ws.getRow(r));
    r++;

    // Info row 1
    ws.getCell(`A${r}`).value = "Buyer Name";
    ws.getCell(`B${r}`).value = l.clientName;
    ws.getCell(`C${r}`).value = "Date";
    ws.getCell(`D${r}`).value = l.date
      ? format(new Date(l.date), "dd/MM/yyyy")
      : "";
    ws.getCell(`E${r}`).value = "Trip";
    ws.getCell(`F${r}`).value = l.tripStatus ?? "";
    leftCell(ws.getCell(`B${r}`));
    centerCell(ws.getCell(`D${r}`));
    centerCell(ws.getCell(`F${r}`));
    r++;

    // Info row 2
    ws.getCell(`A${r}`).value = "Village / Address";
    ws.getCell(`B${r}`).value = l.village ?? "";
    ws.getCell(`C${r}`).value = "Vehicle";
    ws.getCell(`D${r}`).value = l.vehicleNo ?? "";
    ws.getCell(`E${r}`).value = "Fish Code";
    ws.getCell(`F${r}`).value = l.fishCode ?? "";
    leftCell(ws.getCell(`B${r}`));
    leftCell(ws.getCell(`D${r}`));
    centerCell(ws.getCell(`F${r}`));
    r++;

    // Loading Items section
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = "Loading Items";
    sectionStyle(ws.getRow(r));
    r++;

    // Items header
    ws.getRow(r).values = [
      "",
      "Sl.No",
      "Category",
      "Trays",
      "Loose",
      "Total KGS",
    ];
    tableHeaderStyle(ws.getRow(r));
    r++;

    // Items rows
    for (let idx = 0; idx < (l.items ?? []).length; idx++) {
      const it = l.items[idx];
      ws.getCell(`B${r}`).value = idx + 1;
      ws.getCell(`C${r}`).value = it.varietyCode ?? "";
      ws.getCell(`D${r}`).value = Number(it.noTrays ?? 0);
      ws.getCell(`E${r}`).value = Number(it.loose ?? 0);
      ws.getCell(`F${r}`).value = Number(it.totalKgs ?? 0);

      centerCell(ws.getCell(`B${r}`));
      leftCell(ws.getCell(`C${r}`));
      centerCell(ws.getCell(`D${r}`));
      centerCell(ws.getCell(`E${r}`));
      centerCell(ws.getCell(`F${r}`));

      r++;
    }

    // Totals row
    ws.getCell(`C${r}`).value = "Total";
    ws.getCell(`D${r}`).value = Number(l.totalTrays ?? 0);
    ws.getCell(`E${r}`).value = Number(l.totalLooseKgs ?? 0);
    ws.getCell(`F${r}`).value = Number(l.totalKgs ?? 0);
    ws.getRow(r).font = { bold: true };
    ws.getRow(r).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: LIGHT },
    };
    r += 2;

    // Charges section
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = "Charges & Totals";
    sectionStyle(ws.getRow(r));
    r++;

    ws.getCell(`A${r}`).value = "Total Price";
    ws.getCell(`B${r}`).value = Number(l.totalPrice ?? 0);
    moneyCell(ws.getCell(`B${r}`));

    ws.getCell(`C${r}`).value = "Dispatch";
    ws.getCell(`D${r}`).value = Number(l.dispatchChargesTotal ?? 0);
    moneyCell(ws.getCell(`D${r}`));

    ws.getCell(`E${r}`).value = "Ice";
    ws.getCell(`F${r}`).value = Number(l.packingAmountTotal ?? 0);
    moneyCell(ws.getCell(`F${r}`));
    r++;

    ws.getCell(`A${r}`).value = "Grand Total";
    ws.getCell(`B${r}`).value = Number(l.grandTotal ?? 0);
    moneyCell(ws.getCell(`B${r}`));
    ws.getRow(r).font = { bold: true };
    ws.getRow(r).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0F2FE" },
    };
    r += 2;

    // Payments section
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = "Payments (Full / Installments)";
    sectionStyle(ws.getRow(r));
    r++;

    ws.getRow(r).values = [
      "",
      "Date",
      "Amount",
      "Mode",
      "Type",
      "Installment #",
    ];
    tableHeaderStyle(ws.getRow(r));
    r++;

    const pay = (paymentsByLoadingId.get(l.id) ?? []).slice().sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let paidTotal = 0;

    if (pay.length === 0) {
      ws.mergeCells(`B${r}:F${r}`);
      ws.getCell(`B${r}`).value = "No payments found for this bill.";
      ws.getCell(`B${r}`).font = { italic: true, color: { argb: "FF64748B" } };
      r++;
    } else {
      for (const p of pay) {
        paidTotal += Number(p.amount ?? 0);

        ws.getCell(`B${r}`).value = p.date
          ? format(new Date(p.date), "dd/MM/yyyy")
          : "";
        ws.getCell(`C${r}`).value = Number(p.amount ?? 0);
        ws.getCell(`D${r}`).value = p.paymentMode ?? "";
        ws.getCell(`E${r}`).value = p.isInstallment ? "Installment" : "Full";
        ws.getCell(`F${r}`).value = p.isInstallment
          ? p.installmentNumber ?? "-"
          : "-";

        centerCell(ws.getCell(`B${r}`));
        moneyCell(ws.getCell(`C${r}`));
        centerCell(ws.getCell(`D${r}`));
        centerCell(ws.getCell(`E${r}`));
        centerCell(ws.getCell(`F${r}`));

        r++;
      }
    }

    const grand = Number(l.grandTotal ?? 0);
    const balance = Math.max(0, grand - paidTotal);

    ws.getCell(`A${r}`).value = "Paid Total";
    ws.getCell(`B${r}`).value = paidTotal;
    moneyCell(ws.getCell(`B${r}`));

    ws.getCell(`C${r}`).value = "Balance";
    ws.getCell(`D${r}`).value = balance;
    moneyCell(ws.getCell(`D${r}`));

    ws.getRow(r).font = { bold: true };
    ws.getRow(r).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: balance === 0 ? SOFT_GREEN : SOFT_RED },
    };
    r += 2;

    // Blank separator
    ws.addRow([]);
    r++;
  }

  // Apply borders to non-empty cells A..F
  for (let row = 1; row <= ws.rowCount; row++) {
    for (let col = 1; col <= 6; col++) {
      const cell = ws.getCell(row, col);
      const v = cell.value;
      const hasValue =
        v !== null &&
        v !== undefined &&
        !(typeof v === "string" && v.trim() === "");
      if (hasValue) applyThinBorder(cell);
    }
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];
}
