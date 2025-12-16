// app/(dashboard)/stocks/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Fish,
  Warehouse,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

/* ---------------- Types ---------------- */
type FishVariety = { id?: string; code: string; name?: string };
type ItemBase = {
  id: string;
  varietyCode: string;
  totalKgs: number;
  totalPrice: number;
};
type FormerLoading = {
  id: string;
  items: ItemBase[];
  FarmerName?: string | null;
  date?: string;
  village?: string;
};
type AgentLoading = {
  id: string;
  items: ItemBase[];
  agentName?: string;
  date?: string;
  village?: string;
};
type ClientLoading = {
  id: string;
  items: ItemBase[];
  clientName?: string;
  date?: string;
  village?: string;
};

type StockRow = {
  code: string;
  name?: string;
  farmerKgs: number;
  agentKgs: number;
  incomingKgs: number;
  clientOutgoingKgs: number;
  netKgs: number;
  farmerValue: number;
  agentValue: number;
  incomingValue: number;
  clientOutgoingValue: number;
  netValue: number;
};

/* ------------- API helpers ------------- */
const fetchFishVarieties = async (): Promise<FishVariety[]> => {
  const res = await axios.get("/api/fish-varieties");
  return (res.data?.data ?? res.data ?? []) as FishVariety[];
};

const fetchFormerLoadings = async (): Promise<FormerLoading[]> => {
  const res = await axios.get("/api/former-loading");
  return (res.data?.data ?? res.data ?? []) as FormerLoading[];
};

const fetchAgentLoadings = async (): Promise<AgentLoading[]> => {
  const res = await axios.get("/api/agent-loading");
  return (res.data?.data ?? res.data ?? []) as AgentLoading[];
};

const fetchClientLoadings = async (): Promise<ClientLoading[]> => {
  const res = await axios.get("/api/client-loading");
  return (res.data?.data ?? res.data ?? []) as ClientLoading[];
};

const fmt = (v: number) =>
  v.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

/* ------------- Component ------------- */
export default function StocksPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [varieties, setVarieties] = useState<FishVariety[]>([]);
  const [formerLoadings, setFormerLoadings] = useState<FormerLoading[]>([]);
  const [agentLoadings, setAgentLoadings] = useState<AgentLoading[]>([]);
  const [clientLoadings, setClientLoadings] = useState<ClientLoading[]>([]);

  const [activeVariety, setActiveVariety] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"code" | "stockDesc">("stockDesc");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchFishVarieties(),
      fetchFormerLoadings(),
      fetchAgentLoadings(),
      fetchClientLoadings(),
    ])
      .then(([vars, f, a, c]) => {
        if (!mounted) return;
        setVarieties(vars);
        setFormerLoadings(f);
        setAgentLoadings(a);
        setClientLoadings(c);
      })
      .catch((err) => {
        console.error("Failed to load stock data:", err);
        if (!mounted) return;
        setError("Failed to load stock data");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stockRows = useMemo(() => {
    const map = new Map<string, StockRow>();

    const ensure = (code: string): StockRow => {
      if (!map.has(code)) {
        const v = varieties.find((x) => x.code === code);
        map.set(code, {
          code,
          name: v?.name,
          farmerKgs: 0,
          agentKgs: 0,
          incomingKgs: 0,
          clientOutgoingKgs: 0,
          netKgs: 0,
          farmerValue: 0,
          agentValue: 0,
          incomingValue: 0,
          clientOutgoingValue: 0,
          netValue: 0,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return map.get(code)!;
    };

    // accumulate farmer incoming
    formerLoadings.forEach((load) =>
      load.items.forEach((it) => {
        const row = ensure(it.varietyCode);
        row.farmerKgs += Number(it.totalKgs || 0);
        row.farmerValue += Number(it.totalPrice || 0);
      })
    );

    // accumulate agent incoming
    agentLoadings.forEach((load) =>
      load.items.forEach((it) => {
        const row = ensure(it.varietyCode);
        row.agentKgs += Number(it.totalKgs || 0);
        row.agentValue += Number(it.totalPrice || 0);
      })
    );

    // accumulate client outgoing
    clientLoadings.forEach((load) =>
      load.items.forEach((it) => {
        const row = ensure(it.varietyCode);
        row.clientOutgoingKgs += Number(it.totalKgs || 0);
        row.clientOutgoingValue += Number(it.totalPrice || 0);
      })
    );

    // finalize totals & net (incoming - outgoing)
    Array.from(map.values()).forEach((r) => {
      r.incomingKgs = r.farmerKgs + r.agentKgs;
      r.incomingValue = r.farmerValue + r.agentValue;
      r.netKgs = r.incomingKgs - r.clientOutgoingKgs;
      r.netValue = r.incomingValue - r.clientOutgoingValue;
    });

    let rows = Array.from(map.values());

    if (activeVariety !== "all")
      rows = rows.filter((r) => r.code === activeVariety);
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(t) ||
          (r.name ?? "").toLowerCase().includes(t)
      );
    }
    if (sortBy === "stockDesc") rows.sort((a, b) => b.netKgs - a.netKgs);
    else rows.sort((a, b) => a.code.localeCompare(b.code));

    return rows;
  }, [
    varieties,
    formerLoadings,
    agentLoadings,
    clientLoadings,
    activeVariety,
    search,
    sortBy,
  ]);

  const totals = useMemo(() => {
    return stockRows.reduce(
      (acc, r) => {
        acc.incomingKgs += r.incomingKgs;
        acc.clientOutgoingKgs += r.clientOutgoingKgs;
        acc.netKgs += r.netKgs;
        acc.incomingValue += r.incomingValue;
        acc.clientOutgoingValue += r.clientOutgoingValue;
        acc.netValue += r.netValue;
        return acc;
      },
      {
        incomingKgs: 0,
        clientOutgoingKgs: 0,
        netKgs: 0,
        incomingValue: 0,
        clientOutgoingValue: 0,
        netValue: 0,
      }
    );
  }, [stockRows]);

  const handleVarietyClick = useCallback(
    (code: string | "all") => setActiveVariety(code),
    []
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stocks</h1>
          </div>

          <div className="flex items-center gap-3">
            <Input
              placeholder="Search code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 border-gray-300 focus:border-indigo-500"
            />
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-48 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stockDesc">Highest net stock</SelectItem>
                <SelectItem value="code">Code A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 rounded-2xl shadow-sm border border-gray-200 bg-white flex items-center gap-4">
            <div className="rounded-2xl bg-blue-100 p-4">
              <Fish className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Varieties</p>
              <p className="text-2xl font-bold text-gray-900">
                {varieties.length}
              </p>
            </div>
          </Card>

          <Card className="p-5 rounded-2xl shadow-sm border border-gray-200 bg-white flex items-center gap-4">
            <div className="rounded-2xl bg-green-100 p-4">
              <ArrowUpRight className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Available Stock (Kgs)</p>
              <p className="text-2xl font-bold text-green-700">
                {fmt(totals.netKgs)}
              </p>
            </div>
          </Card>

          <Card className="p-5 rounded-2xl shadow-sm border border-gray-200 bg-white flex items-center gap-4">
            <div className="rounded-2xl bg-red-100 p-4">
              <ArrowDownRight className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Client Outgoing (Kgs)</p>
              <p className="text-2xl font-bold text-red-700">
                {fmt(totals.clientOutgoingKgs)}
              </p>
            </div>
          </Card>
        </div>

        {/* Variety Pills */}
        <Card className="p-4 rounded-2xl shadow-sm border border-gray-200 bg-white">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleVarietyClick("all")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                activeVariety === "all"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </button>

            {varieties.map((v) => {
              const colorMap: Record<
                string,
                { bg: string; activeBg: string; text: string }
              > = {
                LR: {
                  bg: "bg-amber-100",
                  activeBg: "bg-amber-600",
                  text: "text-amber-800",
                },
                TN: {
                  bg: "bg-purple-100",
                  activeBg: "bg-purple-600",
                  text: "text-purple-800",
                },
                SF: {
                  bg: "bg-teal-100",
                  activeBg: "bg-teal-600",
                  text: "text-teal-800",
                },
                CT: {
                  bg: "bg-indigo-100",
                  activeBg: "bg-indigo-600",
                  text: "text-indigo-800",
                },
              };

              const colors = colorMap[v.code] || {
                bg: "bg-gray-100",
                activeBg: "bg-gray-600",
                text: "text-gray-800",
              };

              return (
                <button
                  key={v.code}
                  onClick={() => handleVarietyClick(v.code)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    activeVariety === v.code
                      ? `${colors.activeBg} text-white shadow-md`
                      : `${colors.bg} ${colors.text} hover:opacity-80`
                  }`}
                >
                  {v.code}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Table */}
        <Card className="rounded-2xl shadow-lg border border-gray-200 overflow-hidden bg-white">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              Loading stocks...
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-600">{error}</div>
          ) : stockRows.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              No stock data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-200 text-black uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">Variety</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Farmer Kgs
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Agent Kgs
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Incoming Kgs
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Client Outgoing Kgs
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {stockRows.map((r) => {
                    const rowColorMap: Record<string, string> = {
                      LR: "hover:bg-amber-50",
                      TN: "hover:bg-purple-50",
                      SF: "hover:bg-teal-50",
                      CT: "hover:bg-indigo-50",
                    };

                    const hoverClass =
                      rowColorMap[r.code] || "hover:bg-gray-50";

                    return (
                      <tr
                        key={r.code}
                        className={`transition-colors ${hoverClass}`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Fish className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-base">
                                {r.code}
                              </div>
                              {r.name && (
                                <div className="text-sm text-gray-600">
                                  {r.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right text-gray-700">
                          {fmt(r.farmerKgs)}
                        </td>
                        <td className="px-6 py-5 text-right text-gray-700">
                          {fmt(r.agentKgs)}
                        </td>
                        <td className="px-6 py-5 text-right font-semibold text-green-700">
                          {fmt(r.incomingKgs)}
                        </td>
                        <td className="px-6 py-5 text-right font-semibold text-red-600">
                          {fmt(r.clientOutgoingKgs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
