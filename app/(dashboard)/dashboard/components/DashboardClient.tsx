"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

function money(n: number) {
  // ₹ format (simple)
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

// Light Blue theme (charts + UI helpers)
const CHART = {
  sales: "#2563EB", // blue-600
  purchase: "#60A5FA", // blue-400
  accent: "#0EA5E9", // sky-500 (optional)
  grid: "#E2E8F0", // slate-200
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#BFDBFE", // blue-200
  text: "#0F172A", // slate-900
  muted: "#64748B", // slate-500
  pie: ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"],
};

export default function DashboardClient({ data }: { data: DashboardMetrics }) {
  const weeklyData = data.weekly.map((d) => ({
    day: d.label,
    purchase: d.purchase,
    sales: d.sales,
  }));

  const pieData = data.topVarieties.map((v) => ({
    name: v.code,
    value: Math.round(v.kgs * 10) / 10,
  }));

  const ageingData = data.outstandingAgeing.map((a) => ({
    bucket: a.bucket,
    amount: a.amount,
  }));

  const tooltipProps = {
    contentStyle: {
      background: CHART.tooltipBg,
      borderColor: CHART.tooltipBorder,
      borderRadius: 12,
    } as const,
    labelStyle: { color: CHART.text } as const,
    itemStyle: { color: CHART.text } as const,
    cursor: { fill: "rgba(96,165,250,0.12)" }, // soft light-blue hover
  };

  return (
    <div className="space-y-6">
      {/* Today at a glance */}
      <Card className="rounded-2xl border-blue-100 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="text-slate-900">Today at a Glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi title="Sales (Today)" value={money(data.today.sales)} />
            <Kpi title="Purchase (Today)" value={money(data.today.purchase)} />
            <Kpi
              title="Pending Shipments"
              value={`${data.today.pendingShipments}`}
            />
            <Kpi title="Outstanding" value={money(data.today.outstanding)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Overview (Bar) */}
        <Card className="rounded-2xl border-blue-100 bg-blue-50/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-slate-900">Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barCategoryGap={14}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 6" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: CHART.muted }}
                  axisLine={{ stroke: CHART.grid }}
                  tickLine={{ stroke: CHART.grid }}
                />
                <YAxis
                  tick={{ fill: CHART.muted }}
                  axisLine={{ stroke: CHART.grid }}
                  tickLine={{ stroke: CHART.grid }}
                />
                <Tooltip {...tooltipProps} />
                <Bar
                  dataKey="purchase"
                  fill={CHART.purchase}
                  radius={[12, 12, 0, 0]}
                />
                <Bar
                  dataKey="sales"
                  fill={CHART.sales}
                  radius={[12, 12, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Varieties Pie */}
        <Card className="rounded-2xl border-blue-100 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-slate-900">
              Top Varieties by Qty (This week)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip {...tooltipProps} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={95}
                  innerRadius={55}
                  paddingAngle={2}
                  label
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

        {/* Sales vs Stock Movement (Line) */}
        <Card className="rounded-2xl border-blue-100 bg-blue-50/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-slate-900">
              Sales vs Stock Movement
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 6" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: CHART.muted }}
                  axisLine={{ stroke: CHART.grid }}
                  tickLine={{ stroke: CHART.grid }}
                />
                <YAxis
                  tick={{ fill: CHART.muted }}
                  axisLine={{ stroke: CHART.grid }}
                  tickLine={{ stroke: CHART.grid }}
                />
                <Tooltip {...tooltipProps} />
                <Line
                  dataKey="sales"
                  stroke={CHART.sales}
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  dataKey="purchase"
                  stroke={CHART.purchase}
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Outstanding Ageing */}
        <Card className="rounded-2xl border-blue-100 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-slate-900">Outstanding Ageing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ageingData.map((a) => (
              <div
                key={a.bucket}
                className="flex items-center justify-between rounded-xl border border-blue-100 bg-white/70 px-3 py-2"
              >
                <div className="text-sm text-slate-600">{a.bucket}</div>
                <div className="font-semibold text-slate-900">
                  {money(a.amount)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fish varieties chips */}
        <Card className="rounded-2xl border-blue-100 bg-blue-50/30 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-slate-900">Fish Varieties</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.fishVarieties.map((v) => (
              <span
                key={v.code}
                className="px-3 py-1 rounded-full border border-blue-200 bg-white/70 text-sm text-slate-800"
                title={v.name}
              >
                {v.code}
              </span>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white/70 p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="text-2xl font-semibold mt-1 text-slate-900">{value}</div>
    </div>
  );
}
