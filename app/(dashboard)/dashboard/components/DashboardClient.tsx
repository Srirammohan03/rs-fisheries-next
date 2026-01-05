// app/(dashboard)/dashboard/components/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
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

/* ---------------- Styling constants ---------------- */
const THEME = "#139BC3";

const CHART = {
  sales: THEME,
  purchase: "#60A5FA",
  grid: "#E2E8F0",
  muted: "#64748B",
  pie: [THEME, "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"],
};

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function qty(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n);
}

/* ---------------- Tooltips ---------------- */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {money(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{payload[0].name}</p>
        <p style={{ color: payload[0].fill }}>{qty(payload[0].value)} kgs</p>
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
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: "brand" | "green" | "red";
  sub?: string;
}) {
  const ring =
    tone === "green"
      ? "rgba(34,197,94,.18)"
      : tone === "red"
      ? "rgba(239,68,68,.18)"
      : "rgba(19,155,195,.18)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-slate-600">{title}</p>
              <p className="mt-2 text-xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                {value}
              </p>
              {sub ? (
                <p className="mt-2 text-xs text-slate-500 line-clamp-1">
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
              style={{ backgroundColor: ring }}
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
const PRESETS = [
  {
    label: "Today",
    get: () => {
      const d = new Date();
      return { from: startOfDay(d), to: endOfDay(d) } as DateRange;
    },
  },
  {
    label: "Last 7 days",
    get: () => {
      const to = new Date();
      const from = subDays(to, 6);
      return { from: startOfDay(from), to: endOfDay(to) } as DateRange;
    },
  },
  {
    label: "Last 30 days",
    get: () => {
      const to = new Date();
      const from = subDays(to, 29);
      return { from: startOfDay(from), to: endOfDay(to) } as DateRange;
    },
  },
  {
    label: "Last 90 days",
    get: () => {
      const to = new Date();
      const from = subDays(to, 89);
      return { from: startOfDay(from), to: endOfDay(to) } as DateRange;
    },
  },
];

function formatRange(r: DateRange) {
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
        <Button variant="outline" className="w-[280px] justify-start">
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
                setDraft(r || { from: undefined, to: undefined })
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

      const json = await res.json();

      if (json.success) {
        setDeleteStatus("success");
        setDeleteMessage(
          `Variety ${varietyToDelete.code} deleted successfully`
        );
        router.refresh(); // Refresh server data
        // Close dialog after short delay
        setTimeout(() => {
          setDeleteDialogOpen(false);
          setVarietyToDelete(null);
        }, 1500);
      } else {
        setDeleteStatus("error");
        setDeleteMessage(json.message || "Failed to delete variety");
      }
    } catch (err) {
      setDeleteStatus("error");
      setDeleteMessage("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
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

  const handleExport = async () => {
    const wb = XLSX.utils.book_new();

    const [former, agent, client] = await Promise.all([
      fetch("/api/former-loading").then((res) =>
        res.json().then((j) => j.data || [])
      ),
      fetch("/api/agent-loading").then((res) =>
        res.json().then((j) => j.data || [])
      ),
      fetch("/api/client-loading").then((res) =>
        res.json().then((j) => j.data || [])
      ),
    ]);

    const formerSheet = XLSX.utils.json_to_sheet(
      former.flatMap((f: any) =>
        (f.items || []).map((it: any) => ({
          Type: "Former",
          BillNo: f.billNo,
          Date: f.date,
          FarmerName: f.FarmerName || "",
          Village: f.village,
          VarietyCode: it.varietyCode,
          NoTrays: it.noTrays,
          TrayKgs: it.trayKgs,
          Loose: it.loose,
          TotalKgs: it.totalKgs,
          PricePerKg: it.pricePerKg,
          TotalPrice: it.totalPrice,
        }))
      )
    );
    XLSX.utils.book_append_sheet(wb, formerSheet, "Former Loadings");

    const agentSheet = XLSX.utils.json_to_sheet(
      agent.flatMap((a: any) =>
        (a.items || []).map((it: any) => ({
          Type: "Agent",
          BillNo: a.billNo,
          Date: a.date,
          AgentName: a.agentName,
          Village: a.village,
          VarietyCode: it.varietyCode,
          NoTrays: it.noTrays,
          TrayKgs: it.trayKgs,
          Loose: it.loose,
          TotalKgs: it.totalKgs,
          PricePerKg: it.pricePerKg,
          TotalPrice: it.totalPrice,
        }))
      )
    );
    XLSX.utils.book_append_sheet(wb, agentSheet, "Agent Loadings");

    const clientSheet = XLSX.utils.json_to_sheet(
      client.flatMap((c: any) =>
        (c.items || []).map((it: any) => ({
          Type: "Client",
          BillNo: c.billNo,
          Date: c.date,
          ClientName: c.clientName,
          Village: c.village,
          VarietyCode: it.varietyCode,
          NoTrays: it.noTrays,
          TrayKgs: it.trayKgs,
          Loose: it.loose,
          TotalKgs: it.totalKgs,
          PricePerKg: it.pricePerKg,
          TotalPrice: it.totalPrice,
        }))
      )
    );
    XLSX.utils.book_append_sheet(wb, clientSheet, "Client Loadings");

    XLSX.writeFile(wb, "RS-Fisheries_All_Loadings.xlsx");
  };

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

  const tooltipProps = { content: <CustomTooltip /> };

  const ageingTotal = ageingData.reduce((s, a) => s + a.amount, 0);
  const ageingSafeTotal = ageingTotal > 0 ? ageingTotal : 1;

  return (
    <AnimatePresence>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Quick view of sales, purchases, movement & outstanding
            </p>
          </div>
          <div className="flex items-center gap-2">
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

          <DateRangePicker value={range} onApply={applyRangeToUrl} />
        </motion.div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* Dynamic tone for Sales card */}
          {(() => {
            const hasSales = data.today.sales > 0;
            const purchaseExceedsDispatch =
              data.today.purchase > data.today.outstanding;

            const salesTone =
              hasSales && !purchaseExceedsDispatch ? "green" : "red";

            return (
              <KpiCard
                title="Sales"
                value={money(data.today.sales)}
                tone={salesTone}
                icon={
                  salesTone === "green" ? (
                    <TrendingUp className="text-green-600 w-6 h-6" />
                  ) : (
                    <TrendingDown className="text-red-600 w-6 h-6" />
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

          <KpiCard
            title="Dispatch"
            value={money(data.today.outstanding)}
            tone="red"
            icon={<Wallet className="text-red-600 w-6 h-6" />}
            sub="Receivable (selected range)"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 items-stretch">
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
                      tickFormatter={(value) => money(value).replace("₹", "")}
                    />
                    <Tooltip {...tooltipProps} />
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
                      label={({ value }) => qty(value)}
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
                  <AreaChart
                    data={movementData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="salesWave"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={CHART.sales}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART.sales}
                          stopOpacity={0.05}
                        />
                      </linearGradient>

                      <linearGradient
                        id="purchaseWave"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={CHART.purchase}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART.purchase}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid stroke={CHART.grid} strokeDasharray="4 6" />
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
                      tickFormatter={(v) => money(v).replace("₹", "")}
                    />

                    <Tooltip {...tooltipProps} />
                    <Legend verticalAlign="top" height={36} />

                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke="none"
                      fill="url(#salesWave)"
                    />
                    <Area
                      type="monotone"
                      dataKey="purchase"
                      name="Stock Movement"
                      stroke="none"
                      fill="url(#purchaseWave)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

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

          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* HEADER */}
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

              {/* CONTENT */}
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
                        {/* CODE */}
                        <span className="font-semibold text-slate-800">
                          {v.code}
                        </span>

                        {/* DELETE */}
                        <button
                          onClick={() => openDeleteDialog(v)}
                          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:text-red-600 focus:outline-none"
                          aria-label={`Delete ${v.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {/* SINGLE TOOLTIP */}
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
