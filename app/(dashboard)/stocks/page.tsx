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
    <div className="p-4 md:p-6">
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
              className="w-full md:w-64"
            />
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stockDesc">Highest net stock</SelectItem>
                <SelectItem value="code">Code A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 rounded-2xl shadow-md flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3">
              <Fish className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Varieties</p>
              <p className="text-xl font-semibold">{varieties.length}</p>
            </div>
          </Card>

          {/* <Card className="p-4 rounded-2xl shadow-md flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <Warehouse className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Incoming Kgs</p>
              <p className="text-xl font-semibold">{fmt(totals.incomingKgs)}</p>
            </div>
          </Card> */}

          <Card className="p-4 rounded-2xl shadow-md flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-50 p-3">
              <ArrowUpRight className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Available Stock (Kgs)</p>
              <p className="text-xl font-semibold">{fmt(totals.netKgs)}</p>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl shadow-md flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3">
              <ArrowDownRight className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Client Outgoing (Kgs)</p>
              <p className="text-xl font-semibold">
                {fmt(totals.clientOutgoingKgs)}
              </p>
            </div>
          </Card>
        </div>

        {/* Variety pills */}
        <Card className="p-3 rounded-2xl shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleVarietyClick("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                activeVariety === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              All
            </button>
            {varieties.map((v) => (
              <button
                key={v.code}
                onClick={() => handleVarietyClick(v.code)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                  activeVariety === v.code
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {v.code}
              </button>
            ))}
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500">
              Loading stocks...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-500">{error}</div>
          ) : stockRows.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              No stock data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Variety</th>
                    <th className="px-4 py-3 text-right">Farmer Kgs</th>
                    <th className="px-4 py-3 text-right">Agent Kgs</th>
                    <th className="px-4 py-3 text-right">Incoming Kgs</th>
                    <th className="px-4 py-3 text-right">
                      Client Outgoing Kgs
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {stockRows.map((r) => (
                    <tr key={r.code} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {r.code}
                        </div>
                        {r.name && (
                          <div className="text-xs text-gray-500">{r.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmt(r.farmerKgs)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmt(r.agentKgs)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {fmt(r.incomingKgs)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {fmt(r.clientOutgoingKgs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
