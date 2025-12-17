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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

const CHART = {
  sales: "#139BC3",
  purchase: "#60A5FA",
  grid: "#E2E8F0",
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#E2E8F0",
  text: "#0F172A",
  muted: "#64748B",
  pie: ["#139BC3", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"],
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
      boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
    } as const,
    labelStyle: { color: CHART.text } as const,
    itemStyle: { color: CHART.text } as const,
    cursor: { fill: "rgba(19,155,195,0.10)" },
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
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
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
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

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
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

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
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

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-900">Outstanding Ageing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ageingData.map((a) => (
              <div
                key={a.bucket}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="text-sm text-slate-600">{a.bucket}</div>
                <div className="font-semibold text-slate-900">
                  {money(a.amount)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-900">Fish Varieties</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.fishVarieties.map((v) => (
              <span
                key={v.code}
                className="px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-800"
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="text-2xl font-extrabold mt-1 text-slate-900">{value}</div>
      <div className="mt-2 h-1 w-10 rounded-full bg-[#139BC3]" />
    </div>
  );
}
