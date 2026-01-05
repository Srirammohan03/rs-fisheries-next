// app/(dashboard)/vendor-bills/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Check, X, Trash2, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import LoadingDeleteDialog from "@/components/helpers/LoadingDeleteDialog";

interface VendorItem {
  id: string;
  varietyCode?: string;

  // backend values
  noTrays?: number;
  trayKgs?: number; // IMPORTANT: this is TOTAL tray kgs for this item (not per tray)
  loose?: number;
  totalKgs?: number;

  pricePerKg?: number;
  totalPrice?: number;

  loadingId?: string;
  source?: "farmer" | "agent";
  billNo?: string;
  name?: string;
  date?: string;
}

interface LoadingRecord {
  id: string;
  billNo?: string;
  date?: string;
  items: VendorItem[];
  source?: "farmer" | "agent";
  createdAt?: string;

  FarmerName?: string;
  agentName?: string;

  vehicleNo?: string;
  village?: string;

  totalKgs?: number;
  grandTotal?: number;
  totalPrice?: number;
}

type UIItem = VendorItem & {
  recordTotalKgs: number;
  recordGrandTotal: number;
};

type EditingRow = {
  noTrays: number;
  loose: number;
  pricePerKg: number;

  // keep per-tray kgs stable for correct recalculation
  perTrayKgs: number;

  // derived
  trayKgsTotal: number;
  totalKgs: number;
  totalPrice: number;
};

type FishVariety = {
  id: string;
  code?: string;
  name?: string;
};

const fetchFarmerLoadings = async (): Promise<LoadingRecord[]> => {
  const res = await axios.get("/api/former-loading");
  return (res.data?.data ?? []) as LoadingRecord[];
};

const fetchAgentLoadings = async (): Promise<LoadingRecord[]> => {
  const res = await axios.get("/api/agent-loading");
  return (res.data?.data ?? []) as LoadingRecord[];
};

const fetchFishVarieties = async (): Promise<FishVariety[]> => {
  const res = await axios.get("/api/fish-varieties");
  return (res.data?.data ?? []) as FishVariety[];
};

const patchItem = async (itemId: string, body: Partial<VendorItem>) => {
  const res = await axios.patch(`/api/vendor-bills/item/${itemId}`, body);
  return res.data;
};

function n(v: unknown): number {
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : 0;
}

// Backend logic: 95% net
function calcTotalPrice(totalKgs: number, pricePerKg: number): number {
  // same as your backend example: 3500*100*0.95 = 332500
  return Math.round(totalKgs * pricePerKg * 0.95);
}

export default function VendorBillsPage() {
  const [activeTab, setActiveTab] = useState<"farmer" | "agent">("farmer");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<LoadingRecord[]>([]);
  const [editing, setEditing] = useState<Record<string, EditingRow>>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Badges
  const [newFarmerCount, setNewFarmerCount] = useState(0);
  const [newAgentCount, setNewAgentCount] = useState(0);

  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<UIItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Add Variety (GLOBAL)
  const [addOpen, setAddOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string>(""); // loadingId
  const [newVariety, setNewVariety] = useState<string>("");
  const [newTrays, setNewTrays] = useState<number>(0);
  const [newLoose, setNewLoose] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [adding, setAdding] = useState(false);

  // Fish varieties master list
  const [fishVarieties, setFishVarieties] = useState<FishVariety[]>([]);
  const [fishLoading, setFishLoading] = useState(false);

  // Pagination
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  const refreshRecords = useCallback(async () => {
    const [farmers, agents] = await Promise.all([
      fetchFarmerLoadings(),
      fetchAgentLoadings(),
    ]);

    const tagged: LoadingRecord[] = [
      ...farmers.map((r) => ({ ...r, source: "farmer" as const })),
      ...agents.map((r) => ({ ...r, source: "agent" as const })),
    ];

    setRecords(tagged);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    refreshRecords()
      .catch(() => toast.error("Failed to load vendor bills"))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [refreshRecords]);

  // fetch all fish varieties (master)
  useEffect(() => {
    let mounted = true;
    setFishLoading(true);
    fetchFishVarieties()
      .then((list) => {
        if (!mounted) return;
        setFishVarieties(list);
      })
      .catch(() => toast.error("Failed to load fish varieties"))
      .finally(() => mounted && setFishLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "vendorBillsLastSeen";
    const stored = localStorage.getItem(key);
    const lastSeen = stored ? JSON.parse(stored) : { farmer: 0, agent: 0 };

    const currentFarmer = records.filter((r) => r.source === "farmer").length;
    const currentAgent = records.filter((r) => r.source === "agent").length;

    setNewFarmerCount(Math.max(0, currentFarmer - (lastSeen.farmer ?? 0)));
    setNewAgentCount(Math.max(0, currentAgent - (lastSeen.agent ?? 0)));
  }, [records]);

  const handleTabClick = (tab: "farmer" | "agent") => {
    setActiveTab(tab);

    const count =
      tab === "farmer"
        ? records.filter((r) => r.source === "farmer").length
        : records.filter((r) => r.source === "agent").length;

    const stored = localStorage.getItem("vendorBillsLastSeen") || "{}";
    const lastSeen = JSON.parse(stored);

    localStorage.setItem(
      "vendorBillsLastSeen",
      JSON.stringify({ ...lastSeen, [tab]: count })
    );

    if (tab === "farmer") setNewFarmerCount(0);
    else setNewAgentCount(0);

    // reset add modal selections when switching tabs
    setSelectedBillId("");
    setNewVariety("");
    setNewTrays(0);
    setNewLoose(0);
    setNewPrice(0);
  };

  // Records for active tab
  const recordsForTab = useMemo(() => {
    return records
      .filter((r) => r.source === activeTab)
      .sort((a, b) => {
        const da = (a.date || "").split("T")[0];
        const db = (b.date || "").split("T")[0];
        return sortOrder === "newest"
          ? db.localeCompare(da)
          : da.localeCompare(db);
      });
  }, [records, activeTab, sortOrder]);

  // ✅ use master fish list
  const fishVarietyOptions = useMemo(() => {
    // show Code if exists else Name
    const cleaned = fishVarieties
      .map((v) => ({
        id: v.id,
        label: (v.code || v.name || "").trim(),
        sub: v.name && v.code ? v.name : "",
      }))
      .filter((x) => x.label.length > 0);

    // de-dupe by label
    const seen = new Set<string>();
    const unique = cleaned.filter((x) => {
      const key = x.label.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => a.label.localeCompare(b.label));
    return unique;
  }, [fishVarieties]);

  const openAddVarietyModal = () => {
    setSelectedBillId("");
    setNewVariety("");
    setNewTrays(0);
    setNewLoose(0);
    setNewPrice(0);
    setAddOpen(true);
  };

  const closeAddVarietyModal = () => {
    if (adding) return;
    setAddOpen(false);
  };

  const confirmAddVariety = async () => {
    if (!selectedBillId) {
      toast.error("Please select a Bill No");
      return;
    }
    if (!newVariety.trim()) {
      toast.error("Please select a fish variety");
      return;
    }
    if (newTrays <= 0 && newLoose <= 0) {
      toast.error("Enter Trays or Loose (kgs)");
      return;
    }

    try {
      setAdding(true);

      await axios.post("/api/vendor-bills/add-item", {
        source: activeTab,
        loadingId: selectedBillId,
        varietyCode: newVariety.trim().toUpperCase(),
        noTrays: n(newTrays),
        loose: n(newLoose),
        pricePerKg: n(newPrice),
      });

      toast.success("Variety added to bill");
      await refreshRecords();
      closeAddVarietyModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add variety");
    } finally {
      setAdding(false);
    }
  };

  // ✅ Correct row recalculation using perTrayKgs
  const recalcRow = (
    row: Pick<EditingRow, "noTrays" | "loose" | "pricePerKg" | "perTrayKgs">
  ) => {
    const noTrays = n(row.noTrays);
    const loose = n(row.loose);
    const pricePerKg = n(row.pricePerKg);
    const perTrayKgs = n(row.perTrayKgs);

    const trayKgsTotal = Number((noTrays * perTrayKgs).toFixed(3));
    const totalKgs = Number((trayKgsTotal + loose).toFixed(3));
    const totalPrice = calcTotalPrice(totalKgs, pricePerKg);

    return { trayKgsTotal, totalKgs, totalPrice };
  };

  const filteredItems: UIItem[] = useMemo(() => {
    let result: UIItem[] = records
      .filter((rec) =>
        activeTab === "farmer"
          ? rec.source === "farmer"
          : rec.source === "agent"
      )
      .flatMap((rec) => {
        const recordTotalKgs = n(rec.totalKgs);
        const recordGrandTotal = n(rec.grandTotal);

        return rec.items.map((it) => ({
          ...it,
          loadingId: rec.id,
          source: rec.source,
          billNo: rec.billNo,
          name: rec.source === "farmer" ? rec.FarmerName : rec.agentName,
          date: rec.date?.split("T")[0] || "",
          recordTotalKgs,
          recordGrandTotal,
          loose: it.loose,
        }));
      });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (it) =>
          it.billNo?.toLowerCase().includes(term) ||
          it.name?.toLowerCase().includes(term) ||
          it.varietyCode?.toLowerCase().includes(term)
      );
    }

    if (fromDate) result = result.filter((it) => (it.date || "") >= fromDate);
    if (toDate) result = result.filter((it) => (it.date || "") <= toDate);

    result.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return sortOrder === "newest"
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });

    return result;
  }, [records, activeTab, searchTerm, sortOrder, fromDate, toDate]);

  useEffect(
    () => setPage(1),
    [activeTab, searchTerm, sortOrder, fromDate, toDate]
  );

  const totalPages = useMemo(() => {
    if (filteredItems.length === 0) return 1;
    return Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  }, [filteredItems.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  const pageNumbers = useMemo(() => {
    const delta = 1;
    const range: (number | "...")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
      return range;
    }

    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push("...");

    for (let i = left; i <= right; i++) range.push(i);

    if (right < totalPages - 1) range.push("...");
    range.push(totalPages);

    return range;
  }, [page, totalPages]);

  // ✅ Start edit: compute perTrayKgs correctly from backend values
  const startEdit = useCallback((item: UIItem) => {
    const noTrays = n(item.noTrays);
    const trayKgsTotal = n(item.trayKgs);

    // If backend stores trayKgs as TOTAL tray kgs (your sample does),
    // perTrayKgs = trayKgsTotal / noTrays
    const perTrayKgs = noTrays > 0 ? trayKgsTotal / noTrays : 0;

    const base = {
      noTrays: noTrays,
      loose: n(item.loose),
      pricePerKg: n(item.pricePerKg),
      perTrayKgs: Number(perTrayKgs.toFixed(3)),
    };

    const {
      trayKgsTotal: newTrayTotal,
      totalKgs,
      totalPrice,
    } = recalcRow(base);

    setEditing((prev) => ({
      ...prev,
      [item.id]: {
        ...base,
        trayKgsTotal: newTrayTotal,
        totalKgs,
        totalPrice,
      },
    }));
  }, []);

  const cancelEdit = useCallback((id: string) => {
    setEditing((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const onChangeEditField = useCallback(
    (
      itemId: string,
      field: "noTrays" | "loose" | "pricePerKg",
      value: string
    ) => {
      setEditing((prev) => {
        const current = prev[itemId];
        if (!current) return prev;

        const next = {
          ...current,
          [field]: value === "" ? 0 : Math.max(0, n(value)),
        };

        const { trayKgsTotal, totalKgs, totalPrice } = recalcRow(next);
        return {
          ...prev,
          [itemId]: { ...next, trayKgsTotal, totalKgs, totalPrice },
        };
      });
    },
    []
  );

  // ✅ Save: send trayKgs as TOTAL tray kgs (perTrayKgs * noTrays)
  const saveRow = async (item: UIItem) => {
    const edits = editing[item.id];
    if (!edits || savingIds[item.id]) return;

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    const payload: Partial<VendorItem> = {
      noTrays: n(edits.noTrays),
      loose: n(edits.loose),
      pricePerKg: n(edits.pricePerKg),
      trayKgs: n(edits.trayKgsTotal), // IMPORTANT: total tray kgs
      totalKgs: n(edits.totalKgs),
      totalPrice: n(edits.totalPrice),
    };

    try {
      await patchItem(item.id, payload);

      // Optimistic local update (even if backend is slow)
      setRecords((prev) =>
        prev.map((rec) => ({
          ...rec,
          items: rec.items.map((it) =>
            it.id === item.id ? { ...it, ...payload } : it
          ),
        }))
      );

      await refreshRecords();
      toast.success("Saved!");
      cancelEdit(item.id);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSavingIds((prev) => {
        const c = { ...prev };
        delete c[item.id];
        return c;
      });
    }
  };

  const openDeleteItemDialog = (row: UIItem) => {
    setDeleteItemTarget(row);
    setDeleteItemOpen(true);
  };

  const closeDeleteItemDialog = () => {
    if (deletingItem) return;
    setDeleteItemOpen(false);
    setDeleteItemTarget(null);
  };

  const confirmDeleteItem = async () => {
    if (!deleteItemTarget?.id) return;

    try {
      setDeletingItem(true);

      const res = await axios.delete(
        `/api/vendor-bills/item/${deleteItemTarget.id}`
      );

      await refreshRecords();

      if (res.data?.deletedBill) {
        toast.success("Item deleted ✅ Bill also removed (last item)");
      } else {
        toast.success("Item deleted");
      }

      closeDeleteItemDialog();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingItem(false);
    }
  };

  const exportData = (type: "farmer" | "agent") => {
    const data = records
      .filter((r) => r.source === type)
      .flatMap((rec) =>
        rec.items.map((it) => ({
          "Bill No": rec.billNo || "",
          Name: type === "farmer" ? rec.FarmerName || "" : rec.agentName || "",
          Date: rec.date ? new Date(rec.date).toLocaleDateString("en-IN") : "",
          "Vehicle No": rec.vehicleNo || "",
          Village: rec.village || "",
          Variety: it.varietyCode || "",
          Trays: it.noTrays || 0,
          "Tray Kgs (Total)": n(it.trayKgs),
          Loose: n(it.loose),
          "Total Kgs": n(it.totalKgs),
          "Price/Kg": n(it.pricePerKg),
          "Total Price": n(it.totalPrice),
        }))
      );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      type === "farmer" ? "Farmers" : "Agents"
    );
    XLSX.writeFile(
      wb,
      `${type}-bills-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const TraysDisplay = ({ item }: { item: UIItem }) => {
    const trays = item.noTrays ?? 0;
    const looseKgs = n(item.loose);

    if (trays > 0)
      return <span className="font-semibold text-gray-900">{trays}</span>;

    if (looseKgs > 0) {
      return (
        <span className="text-orange-600 font-medium text-sm">
          (Loose) {looseKgs.toFixed(1)} KGS
        </span>
      );
    }

    return <span className="text-gray-400">-</span>;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Card className="p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Vendor Bills
              </h2>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
                <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm w-full sm:w-auto overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => handleTabClick("farmer")}
                    className={`relative shrink-0 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-medium text-sm transition-all duration-200 ${
                      activeTab === "farmer"
                        ? "bg-white text-blue-600 shadow-lg"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Farmer
                    {newFarmerCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center animate-pulse ring-2 ring-white">
                        {newFarmerCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleTabClick("agent")}
                    className={`relative shrink-0 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-medium text-sm transition-all duration-200 ${
                      activeTab === "agent"
                        ? "bg-white text-blue-600 shadow-lg"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Agent
                    {newAgentCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center animate-pulse ring-2 ring-white">
                        {newAgentCount}
                      </span>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                  <Button
                    onClick={openAddVarietyModal}
                    className="w-full bg-[#139BC3] hover:bg-[#139BC3]/80 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variety
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => exportData("farmer")}
                    className="w-full border-green-600 text-green-700 hover:bg-green-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Farmers
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportData("agent")}
                    className="w-full border-purple-600 text-purple-700 hover:bg-purple-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Agents
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl border border-blue-100 bg-white/40">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative w-full lg:w-[420px]">
                  <Input
                    placeholder="Search Bill No, Name, Variety..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <svg
                    className="absolute left-3 top-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <Select
                  value={sortOrder}
                  onValueChange={(v: "newest" | "oldest") => setSortOrder(v)}
                >
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder="Sort by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full"
                  />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSortOrder("newest");
                      setFromDate("");
                      setToDate("");
                      setPage(1);
                      toast.success("Filters cleared");
                    }}
                    className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading bills...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No records found
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="mt-6 hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] table-auto">
                  <thead className="bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Bill No / Name</th>
                      <th className="p-4">Variety</th>
                      <th className="p-4 text-right">Trays</th>
                      <th className="p-4 text-right">Loose</th>
                      <th className="p-4 text-right">Price/Kg</th>
                      <th className="p-4 text-right">Total Price</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {paginatedItems.map((it) => {
                      const edit = editing[it.id];
                      const isEditing = !!edit;
                      const isSaving = !!savingIds[it.id];

                      return (
                        <tr key={it.id} className="hover:bg-gray-50">
                          <td className="p-4 font-medium">
                            <div>{it.billNo}</div>
                            <div className="text-xs text-gray-500">
                              {it.name}
                            </div>
                          </td>

                          <td className="p-4">{it.varietyCode}</td>

                          <td className="p-4 text-right">
                            {isEditing ? (
                              <Input
                                value={edit.noTrays}
                                onChange={(e) =>
                                  onChangeEditField(
                                    it.id,
                                    "noTrays",
                                    e.target.value
                                  )
                                }
                                className="w-24 text-right"
                                type="number"
                                step="1"
                                min={0}
                              />
                            ) : (
                              <TraysDisplay item={it} />
                            )}
                          </td>

                          <td className="p-4 text-right">
                            {isEditing ? (
                              <Input
                                value={edit.loose}
                                onChange={(e) =>
                                  onChangeEditField(
                                    it.id,
                                    "loose",
                                    e.target.value
                                  )
                                }
                                className="w-28 text-right"
                                type="number"
                                step="0.1"
                                min={0}
                              />
                            ) : (
                              <span className="text-gray-700">
                                {n(it.loose).toFixed(1)}
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            {isEditing ? (
                              <Input
                                value={edit.pricePerKg}
                                onChange={(e) =>
                                  onChangeEditField(
                                    it.id,
                                    "pricePerKg",
                                    e.target.value
                                  )
                                }
                                className="w-24 text-right"
                                type="number"
                                step="0.01"
                                min={0}
                              />
                            ) : (
                              <span>{n(it.pricePerKg).toFixed(2)}</span>
                            )}
                          </td>

                          <td className="p-4 text-right font-semibold text-green-600">
                            {isEditing ? (
                              <Input
                                value={edit.totalPrice}
                                readOnly
                                className="w-40 text-right bg-green-50"
                              />
                            ) : (
                              n(it.totalPrice).toFixed(2)
                            )}
                          </td>

                          <td className="p-4 text-center">
                            {!isEditing ? (
                              <div className="flex justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(it)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => openDeleteItemDialog(it)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => saveRow(it)}
                                  disabled={isSaving}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {isSaving ? (
                                    "..."
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelEdit(it.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile List */}
              <div className="mt-6 md:hidden space-y-4">
                {paginatedItems.map((it) => {
                  const edit = editing[it.id];
                  const isEditing = !!edit;
                  const isSaving = !!savingIds[it.id];

                  return (
                    <div
                      key={it.id}
                      className="bg-white rounded-xl shadow-sm p-4 space-y-3 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{it.billNo}</span>
                          <span className="text-xs text-gray-500">
                            {it.name}
                          </span>
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(it)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => openDeleteItemDialog(it)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-600">Variety: </span>
                          <span className="font-medium">{it.varietyCode}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Trays: </span>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editing[it.id]?.noTrays || ""}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [it.id]: {
                                    ...prev[it.id],
                                    noTrays: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-20"
                            />
                          ) : (
                            <span className="font-medium">{it.noTrays}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Loose: </span>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editing[it.id]?.loose || ""}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [it.id]: {
                                    ...prev[it.id],
                                    loose: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-20"
                            />
                          ) : (
                            <span className="font-medium">{it.loose}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Price/kg: </span>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editing[it.id]?.pricePerKg || ""}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [it.id]: {
                                    ...prev[it.id],
                                    pricePerKg: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-24"
                            />
                          ) : (
                            <span className="font-medium">{it.pricePerKg}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Total Price: </span>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editing[it.id]?.totalPrice || ""}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [it.id]: {
                                    ...prev[it.id],
                                    totalPrice: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-24"
                            />
                          ) : (
                            <span className="font-medium">{it.totalPrice}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium text-gray-900">
                      {(page - 1) * PAGE_SIZE + 1}
                    </span>{" "}
                    –{" "}
                    <span className="font-medium text-gray-900">
                      {Math.min(page * PAGE_SIZE, filteredItems.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-900">
                      {filteredItems.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>

                    {pageNumbers.map((p, idx) =>
                      p === "..." ? (
                        <span
                          key={`dots-${idx}`}
                          className="px-2 text-gray-400 select-none"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={p}
                          size="sm"
                          variant={page === p ? "default" : "outline"}
                          onClick={() => setPage(p)}
                          className={
                            page === p ? "bg-[#139BC3] text-white" : ""
                          }
                        >
                          {p}
                        </Button>
                      )
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ADD VARIETY MODAL */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
          <Card className="w-full max-w-lg p-6 rounded-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Add New Variety to Bill</h3>
              <Button
                variant="ghost"
                onClick={closeAddVarietyModal}
                disabled={adding}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Bill No
                </label>
                <Select
                  value={selectedBillId}
                  onValueChange={(v) => setSelectedBillId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${activeTab} bill`} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {recordsForTab.map((r) => {
                      const bill = r.billNo || "(No Bill No)";
                      const name =
                        activeTab === "farmer" ? r.FarmerName : r.agentName;
                      const date = (r.date || "").split("T")[0];
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          {bill} — {name || "Unknown"} {date ? `(${date})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Fish Variety
                </label>

                <Select
                  value={newVariety}
                  onValueChange={(v) => setNewVariety(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        fishLoading ? "Loading..." : "Select fish variety"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {fishVarietyOptions.map((v) => (
                      <SelectItem key={v.id} value={v.label}>
                        {v.label} {v.sub ? `— ${v.sub}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={newVariety}
                  onChange={(e) => setNewVariety(e.target.value.toUpperCase())}
                  placeholder="Or type new variety code (e.g., RC)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Trays
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={newTrays}
                    onChange={(e) =>
                      setNewTrays(Math.max(0, n(e.target.value)))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Loose (kgs)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={newLoose}
                    onChange={(e) =>
                      setNewLoose(Math.max(0, n(e.target.value)))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Price per Kg
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Math.max(0, n(e.target.value)))}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={closeAddVarietyModal}
                disabled={adding}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAddVariety}
                disabled={adding}
                className="bg-[#139BC3] hover:bg-[#139BC3]/80 text-white"
              >
                {adding ? "Adding..." : "Add to Bill"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <LoadingDeleteDialog
        open={deleteItemOpen}
        onClose={closeDeleteItemDialog}
        onConfirm={confirmDeleteItem}
        loading={deletingItem}
        title="Delete Item"
        description={`Delete this item from bill ${
          deleteItemTarget?.billNo ? `(${deleteItemTarget.billNo})` : ""
        }? If this is the last item, the bill will be deleted automatically.`}
        confirmText="Delete Item"
      />
    </div>
  );
}
