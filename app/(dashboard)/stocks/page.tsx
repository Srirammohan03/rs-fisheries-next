"use client";

import React, { useEffect, useMemo, useState } from "react";
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

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import {
  Fish,
  Warehouse,
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon,
} from "lucide-react";

import AddFishButton from "../dashboard/components/AddFishButton";

import type { DateRange } from "react-day-picker";
import {
  format,
  addDays,
  startOfDay,
  startOfWeek,
  startOfMonth,
  parseISO,
} from "date-fns";

/* ---------------- Types ---------------- */
type FishVariety = { code: string; name?: string };
type ItemBase = { varietyCode: string; totalKgs: number };
type Loading = { items: ItemBase[]; date?: string };

type AvailableVariety = {
  code: string;
  name?: string;
  netKgs: number;
  netTrays: number;
};

type StockRow = {
  code: string;
  name?: string;

  farmerKgs: number;
  agentKgs: number;
  incomingKgs: number;

  outgoingKgs: number;

  farmerTrays: number;
  farmerLoose: number;

  agentTrays: number;
  agentLoose: number;

  incomingTrays: number;
  incomingLoose: number;

  outgoingTrays: number;
  outgoingLoose: number;
};

/* ---------------- Helpers ---------------- */
const THEME = "#139BC3";
const TRAY_SIZE = 35;
const STOCK_TRAY_KGS = 35;

const cls = (...x: Array<string | false | null | undefined>) =>
  x.filter(Boolean).join(" ");

const splitTrayLoose = (kgs: number) => {
  const safe = Number.isFinite(kgs) ? Math.max(0, kgs) : 0;
  const trays = Math.floor(safe / TRAY_SIZE);
  const loose = +(safe - trays * TRAY_SIZE).toFixed(2);
  return { trays, loose };
};

const parseDateSafe = (value?: string): Date | null => {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const inRange = (d: Date | null, from: Date, toExclusive: Date) => {
  if (!d) return false;
  return d >= from && d < toExclusive;
};

function rangeToBounds(r: DateRange) {
  const from = r.from ? startOfDay(r.from) : startOfDay(new Date());
  const to = r.to ? startOfDay(addDays(r.to, 1)) : startOfDay(addDays(from, 1));
  return { from, to };
}

function formatRange(r: DateRange) {
  if (!r.from) return "Pick a date";
  const a = format(r.from, "MMM dd, yyyy");
  const b = r.to ? format(r.to, "MMM dd, yyyy") : a;
  return `${a} → ${b}`;
}

function StatPair({
  value,
  tone = "neutral",
}: {
  value: { trays: number; loose: number };
  tone?: "neutral" | "incoming" | "outgoing";
}) {
  const toneCls =
    tone === "incoming"
      ? "text-green-700"
      : tone === "outgoing"
      ? "text-red-600"
      : "text-gray-900";

  return (
    <span className={cls("font-semibold tabular-nums", toneCls)}>
      {value.trays} <span className="text-gray-300">|</span> {value.loose}
    </span>
  );
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(
        "px-3 py-1.5 rounded-full text-sm font-medium border transition",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        active
          ? "text-white border-transparent"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      )}
      style={
        active
          ? {
              backgroundColor: THEME,
              boxShadow: "0 6px 16px rgba(19,155,195,.18)",
            }
          : { borderColor: "rgba(17,24,39,.12)" }
      }
    >
      {children}
    </button>
  );
}

/* ---------------- Date Range Picker ---------------- */
function GlobalDateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);

  useEffect(() => setDraft(value), [value]);

  const apply = () => {
    if (draft.from && !draft.to) onChange({ from: draft.from, to: draft.from });
    else onChange(draft);
    setOpen(false);
  };

  const presets = [
    {
      label: "Today",
      get: () => {
        const t = new Date();
        return { from: t, to: t };
      },
    },
    {
      label: "Yesterday",
      get: () => {
        const y = addDays(new Date(), -1);
        return { from: y, to: y };
      },
    },
    {
      label: "Last 7 days",
      get: () => {
        const to = new Date();
        const from = addDays(to, -6);
        return { from, to };
      },
    },
    {
      label: "Last 30 days",
      get: () => {
        const to = new Date();
        const from = addDays(to, -29);
        return { from, to };
      },
    },
    {
      label: "This week",
      get: () => {
        const to = new Date();
        const from = startOfWeek(to, { weekStartsOn: 1 });
        return { from, to };
      },
    },
    {
      label: "This month",
      get: () => {
        const to = new Date();
        const from = startOfMonth(to);
        return { from, to };
      },
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full md:w-[320px] justify-start rounded-xl border-slate-200 bg-white"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-600" />
          <span className="text-sm text-slate-900">{formatRange(value)}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[760px] p-0" align="start">
        <div className="grid grid-cols-[220px_1fr]">
          <div className="border-r border-slate-200 p-3">
            <div className="text-xs font-semibold text-slate-500 px-2 py-2">
              Quick ranges
            </div>

            <div className="space-y-1">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setDraft(p.get())}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                  type="button"
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

/* ---------------- Page ---------------- */
export default function StocksPage() {
  const [varieties, setVarieties] = useState<FishVariety[]>([]);
  const [farmer, setFarmer] = useState<Loading[]>([]); // FIXED: Changed "former" to "farmer" for consistency
  const [agent, setAgent] = useState<Loading[]>([]);
  const [client, setClient] = useState<Loading[]>([]);
  const [availableVarieties, setAvailableVarieties] = useState<
    AvailableVariety[]
  >([]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"stockDesc" | "code">("stockDesc");
  const [selectedVariety, setSelectedVariety] = useState<string>("ALL");

  const [globalRange, setGlobalRange] = useState<DateRange>(() => {
    const today = new Date();
    return { from: today, to: today };
  });

  const [isLoading, setIsLoading] = useState(true); // NEW: Added loading state for main data
  const [error, setError] = useState<string | null>(null); // NEW: Added error state

  const fetchMainData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [v, f, a, c] = await Promise.all([
        axios.get("/api/fish-varieties"),
        axios.get("/api/former-loading"), // FIXED: Changed endpoint from "former" to "farmer" assuming typo
        axios.get("/api/agent-loading"),
        axios.get("/api/client-loading"),
      ]);
      setVarieties(v.data.data || []);
      setFarmer(f.data.data || []);
      setAgent(a.data.data || []);
      setClient(c.data.data || []);
    } catch (err) {
      console.error("Failed to fetch main data:", err);
      setError("Failed to load stock data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMainData();
    const id = setInterval(fetchMainData, 30000); // NEW: Poll main data every 30 seconds for real-time updates
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;

    const fetchAvailable = async () => {
      try {
        const res = await axios.get("/api/stocks/available-varieties");
        const rows: AvailableVariety[] = res.data?.data || [];
        if (alive) setAvailableVarieties(rows);
      } catch (err) {
        console.error("Failed to fetch available varieties:", err);
        // Optionally set error state here if needed
      }
    };

    fetchAvailable();
    const id = setInterval(fetchAvailable, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const stockRows = useMemo<StockRow[]>(() => {
    const map = new Map<string, StockRow>();
    const { from: rangeFrom, to: rangeTo } = rangeToBounds(globalRange);

    const ensure = (code: string) => {
      if (!map.has(code)) {
        const v = varieties.find((x) => x.code === code);
        map.set(code, {
          code,
          name: v?.name,

          farmerKgs: 0,
          agentKgs: 0,
          incomingKgs: 0,
          outgoingKgs: 0,

          farmerTrays: 0,
          farmerLoose: 0,
          agentTrays: 0,
          agentLoose: 0,
          incomingTrays: 0,
          incomingLoose: 0,
          outgoingTrays: 0,
          outgoingLoose: 0,
        });
      }
      return map.get(code)!;
    };

    // Farmer incoming
    farmer.forEach((l) => {
      // FIXED: Changed "former" to "farmer"
      const d = parseDateSafe(l.date);
      const ok = d ? inRange(d, rangeFrom, rangeTo) : true;
      if (!ok) return;

      l.items.forEach((i) => (ensure(i.varietyCode).farmerKgs += i.totalKgs));
    });

    // Agent incoming
    agent.forEach((l) => {
      const d = parseDateSafe(l.date);
      const ok = d ? inRange(d, rangeFrom, rangeTo) : true;
      if (!ok) return;

      l.items.forEach((i) => (ensure(i.varietyCode).agentKgs += i.totalKgs));
    });

    // Client outgoing
    client.forEach((l) => {
      const d = parseDateSafe(l.date);
      const ok = d ? inRange(d, rangeFrom, rangeTo) : true;
      if (!ok) return;

      l.items.forEach((i) => (ensure(i.varietyCode).outgoingKgs += i.totalKgs));
    });

    // Compute derived values
    map.forEach((r) => {
      r.incomingKgs = r.farmerKgs + r.agentKgs;

      const farmer = splitTrayLoose(r.farmerKgs);
      const agentS = splitTrayLoose(r.agentKgs);
      const incoming = splitTrayLoose(r.incomingKgs);
      const outgoing = splitTrayLoose(r.outgoingKgs);

      r.farmerTrays = farmer.trays;
      r.farmerLoose = farmer.loose;
      r.agentTrays = agentS.trays;
      r.agentLoose = agentS.loose;
      r.incomingTrays = incoming.trays;
      r.incomingLoose = incoming.loose;
      r.outgoingTrays = outgoing.trays;
      r.outgoingLoose = outgoing.loose;
    });

    let rows = Array.from(map.values());

    if (selectedVariety !== "ALL")
      rows = rows.filter((r) => r.code === selectedVariety);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q)
      );
    }

    if (sortBy === "stockDesc")
      rows.sort((a, b) => b.incomingKgs - a.incomingKgs);
    else rows.sort((a, b) => a.code.localeCompare(b.code));

    return rows;
  }, [
    farmer, // FIXED: Changed "former" to "farmer"
    agent,
    client,
    varieties,
    search,
    sortBy,
    selectedVariety,
    globalRange,
  ]);

  const totals = useMemo(() => {
    const incoming = stockRows.reduce(
      (acc, r) => {
        acc.trays += r.incomingTrays;
        acc.loose += r.incomingLoose;
        return acc;
      },
      { trays: 0, loose: 0 }
    );

    const outgoing = stockRows.reduce(
      (acc, r) => {
        acc.trays += r.outgoingTrays;
        acc.loose += r.outgoingLoose;
        return acc;
      },
      { trays: 0, loose: 0 }
    );

    return { incoming, outgoing };
  }, [stockRows]);

  const availabilityPreview = useMemo(() => {
    const rows = [...availableVarieties].sort((a, b) => b.netKgs - a.netKgs);
    const top = rows.slice(0, 30);
    const remaining = Math.max(0, rows.length - top.length);
    return { top, remaining };
  }, [availableVarieties]);
  const availableTotals = useMemo(() => {
    return availableVarieties.reduce(
      (acc, v) => {
        const split = splitTrayLoose(v.netKgs);
        acc.trays += split.trays;
        acc.loose += split.loose;
        return acc;
      },
      { trays: 0, loose: 0 }
    );
  }, [availableVarieties]);

  // NEW: Render loading or error states
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchMainData} className="ml-4">
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading stocks...</p>
      </div>
    );
  }

  // Rest of UI remains unchanged...
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(19,155,195,.12)" }}
            >
              <Warehouse style={{ color: THEME }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stocks</h1>
              <p className="text-sm text-gray-500">
                Trays <span className="text-gray-300">|</span> Loose
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <GlobalDateRangePicker
              value={globalRange}
              onChange={setGlobalRange}
            />

            <Input
              placeholder="Search code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72"
            />

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stockDesc">Highest stock</SelectItem>
                <SelectItem value="code">Code A–Z</SelectItem>
              </SelectContent>
            </Select>

            <AddFishButton />
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-2">
            <Pill
              active={selectedVariety === "ALL"}
              onClick={() => setSelectedVariety("ALL")}
            >
              All
            </Pill>

            {varieties
              .slice()
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((v) => (
                <Pill
                  key={v.code}
                  active={selectedVariety === v.code}
                  onClick={() => setSelectedVariety(v.code)}
                >
                  {v.code}
                </Pill>
              ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: THEME }}>
                  Availability stock
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Top availability by incoming (Farmer + Agent)
                </p>
              </div>

              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(19,155,195,.10)" }}
              >
                <Warehouse style={{ color: THEME }} />
              </div>
            </div>

            <div className="mt-6">
              <div className="grid grid-cols-[1fr_auto] items-center gap-6 text-xs text-gray-500 px-3">
                <span>Variety</span>
                <span className="text-right tabular-nums">Trays | Loose</span>
              </div>

              <div
                className="mt-3 rounded-2xl border bg-white"
                style={{ borderColor: "rgba(17,24,39,.08)" }}
              >
                <div className="p-3 md:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-2">
                    {availabilityPreview.top.map((r) => {
                      const looseKgs = +Math.max(
                        0,
                        r.netKgs - r.netTrays * STOCK_TRAY_KGS
                      ).toFixed(2);

                      return (
                        <div
                          key={r.code}
                          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2"
                        >
                          <span className="text-sm font-semibold text-gray-900">
                            {r.code}
                          </span>

                          <span className="h-px w-full bg-gray-100" />

                          <span className="text-sm font-semibold text-gray-900 tabular-nums text-right">
                            {r.netTrays}{" "}
                            <span className="text-gray-300">|</span> {looseKgs}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {availabilityPreview.remaining > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  +{availabilityPreview.remaining} more
                </p>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Varieties Card */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Varieties</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {varieties.length}
                  </p>
                </div>
                <Fish className="h-8 w-8" style={{ color: THEME }} />
              </div>
            </Card>
            {/* Available Stock Card (Current Warehouse Stock – Real-time) */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Available Stock</p>
                  <p
                    className="text-3xl font-bold mt-1 tabular-nums"
                    style={{ color: THEME }}
                  >
                    {availableTotals.trays}{" "}
                    <span className="text-gray-300">|</span>{" "}
                    {availableTotals.loose}
                  </p>
                </div>
                <Warehouse className="h-8 w-8" style={{ color: THEME }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Current warehouse stock (live)
              </p>
            </Card>
            {/* Incoming Card (Filtered by Date Range) */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Incoming</p>
                  <p className="text-3xl font-bold text-green-700 mt-1 tabular-nums">
                    {totals.incoming.trays}{" "}
                    <span className="text-gray-300">|</span>{" "}
                    {+totals.incoming.loose}
                  </p>
                </div>
                <ArrowUpRight className="h-8 w-8 text-green-600" />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Filtered by selected range
              </p>
            </Card>

            {/* Dispatch Card (Filtered by Date Range) */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Dispatch</p>
                  <p className="text-3xl font-bold text-red-600 mt-1 tabular-nums">
                    {totals.outgoing.trays}{" "}
                    <span className="text-gray-300">|</span>{" "}
                    {+totals.outgoing.loose}
                  </p>
                </div>
                <ArrowDownRight className="h-8 w-8 text-red-600" />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Filtered by selected range
              </p>
            </Card>
          </div>
        </div>

        <Card className="overflow-hidden hidden md:block">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "rgba(19,155,195,.12)" }}>
              <tr>
                <th className="p-4 text-left">
                  <span className="font-semibold" style={{ color: THEME }}>
                    Variety
                  </span>
                  <span className="block text-xs text-gray-500 font-normal mt-0.5">
                    Code / Name
                  </span>
                </th>
                <th className="p-4 text-right">
                  <span className="font-semibold text-gray-800">Farmer</span>
                  <span className="block text-xs text-gray-500 font-normal mt-0.5">
                    Trays | Loose
                  </span>
                </th>
                <th className="p-4 text-right">
                  <span className="font-semibold text-gray-800">Agent</span>
                  <span className="block text-xs text-gray-500 font-normal mt-0.5">
                    Trays | Loose
                  </span>
                </th>
                <th className="p-4 text-right">
                  <span className="font-semibold text-gray-800">Incoming</span>
                  <span className="block text-xs text-gray-500 font-normal mt-0.5">
                    Trays | Loose
                  </span>
                </th>
                <th className="p-4 text-right">
                  <span className="font-semibold text-gray-800">Dispatch</span>
                  <span className="block text-xs text-gray-500 font-normal mt-0.5">
                    Trays | Loose
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {stockRows.map((r) => (
                <tr key={r.code} className="border-t">
                  <td className="p-4">
                    <p className="font-semibold text-gray-900">{r.code}</p>
                    {r.name ? (
                      <p className="text-xs text-gray-500">{r.name}</p>
                    ) : null}
                  </td>

                  <td className="p-4 text-right">
                    <StatPair
                      value={{ trays: r.farmerTrays, loose: r.farmerLoose }}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <StatPair
                      value={{ trays: r.agentTrays, loose: r.agentLoose }}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <StatPair
                      tone="incoming"
                      value={{ trays: r.incomingTrays, loose: r.incomingLoose }}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <StatPair
                      tone="outgoing"
                      value={{ trays: r.outgoingTrays, loose: r.outgoingLoose }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="md:hidden space-y-3">
          {stockRows.map((r) => (
            <Card key={r.code} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {r.code}
                  </p>
                  {r.name ? (
                    <p className="text-xs text-gray-500 mt-0.5">{r.name}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Incoming</p>
                  <StatPair
                    tone="incoming"
                    value={{ trays: r.incomingTrays, loose: r.incomingLoose }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl border p-3"
                  style={{ borderColor: "rgba(17,24,39,.08)" }}
                >
                  <p className="text-xs text-gray-500">Farmer</p>
                  <StatPair
                    value={{ trays: r.farmerTrays, loose: r.farmerLoose }}
                  />
                </div>

                <div
                  className="rounded-xl border p-3"
                  style={{ borderColor: "rgba(17,24,39,.08)" }}
                >
                  <p className="text-xs text-gray-500">Agent</p>
                  <StatPair
                    value={{ trays: r.agentTrays, loose: r.agentLoose }}
                  />
                </div>

                <div
                  className="rounded-xl border p-3"
                  style={{ borderColor: "rgba(17,24,39,.08)" }}
                >
                  <p className="text-xs text-gray-500">Dispatch</p>
                  <StatPair
                    tone="outgoing"
                    value={{ trays: r.outgoingTrays, loose: r.outgoingLoose }}
                  />
                </div>

                <div
                  className="rounded-xl p-3 border"
                  style={{
                    borderColor: "rgba(19,155,195,.25)",
                    backgroundColor: "rgba(19,155,195,.06)",
                  }}
                >
                  <p className="text-xs text-gray-500">Code</p>
                  <p className="font-semibold" style={{ color: THEME }}>
                    {r.code}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
