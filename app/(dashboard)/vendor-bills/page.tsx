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
import { Edit, Check, X, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface VendorItem {
  id: string;
  varietyCode?: string;

  // backend values (keep stored, but DO NOT show)
  noTrays?: number;
  trayKgs?: number;
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
  netKgsForThisItem: number;
  loose?: number; // ← Added for display logic
};

const fetchFarmerLoadings = async (): Promise<LoadingRecord[]> => {
  const res = await axios.get("/api/former-loading");
  return (res.data?.data ?? []) as LoadingRecord[];
};

const fetchAgentLoadings = async (): Promise<LoadingRecord[]> => {
  const res = await axios.get("/api/agent-loading");
  return (res.data?.data ?? []) as LoadingRecord[];
};

const patchItemPrice = async (itemId: string, body: Partial<VendorItem>) => {
  const res = await axios.patch(`/api/vendor-bills/item/${itemId}`, body);
  return res.data;
};

export default function VendorBillsPage() {
  const [activeTab, setActiveTab] = useState<"farmer" | "agent">("farmer");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<LoadingRecord[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<VendorItem>>>(
    {}
  );
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Badges
  const [newFarmerCount, setNewFarmerCount] = useState(0);
  const [newAgentCount, setNewAgentCount] = useState(0);

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
  };

  const filteredItems: UIItem[] = useMemo(() => {
    let result: UIItem[] = records
      .filter((rec) =>
        activeTab === "farmer"
          ? rec.source === "farmer"
          : rec.source === "agent"
      )
      .flatMap((rec) => {
        const recordTotalKgs = Number(rec.totalKgs || 0);
        const recordGrandTotal = Number(rec.grandTotal || 0);

        return rec.items.map((it) => {
          const itemTotalKgs = Number(it.totalKgs || 0);

          const netKgsForThisItem =
            recordTotalKgs > 0 && recordGrandTotal > 0
              ? Number(
                  ((itemTotalKgs / recordTotalKgs) * recordGrandTotal).toFixed(
                    3
                  )
                )
              : itemTotalKgs;

          return {
            ...it,
            loadingId: rec.id,
            source: rec.source,
            billNo: rec.billNo,
            name: rec.source === "farmer" ? rec.FarmerName : rec.agentName,
            date: rec.date?.split("T")[0] || "",
            recordTotalKgs,
            recordGrandTotal,
            netKgsForThisItem,
            loose: it.loose, // ← Important: pass loose to UI
          };
        });
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

  const startEdit = useCallback((item: VendorItem) => {
    setEditing((prev) => ({
      ...prev,
      [item.id]: { pricePerKg: item.pricePerKg, totalPrice: item.totalPrice },
    }));
  }, []);

  const cancelEdit = useCallback((id: string) => {
    setEditing((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const onChangeField = useCallback(
    (itemId: string, value: string) => {
      setEditing((prev) => {
        const num = value === "" ? undefined : Number(value);
        const item = filteredItems.find((i) => i.id === itemId);
        if (!item) return prev;

        const totalKgs = Number(item.totalKgs || 0);

        const updates: Partial<VendorItem> = {
          pricePerKg: num,
        };

        if (num !== undefined && totalKgs > 0) {
          const gross = totalKgs * num;
          const net = Math.round(gross * 0.95);
          updates.totalPrice = net;
        }

        return { ...prev, [itemId]: updates };
      });
    },
    [filteredItems]
  );

  const saveRow = async (item: VendorItem) => {
    const edits = editing[item.id];
    if (!edits || savingIds[item.id]) return;

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    const payload: Partial<VendorItem> = {};
    if (edits.pricePerKg !== undefined) payload.pricePerKg = edits.pricePerKg;
    if (edits.totalPrice !== undefined) payload.totalPrice = edits.totalPrice;

    try {
      await patchItemPrice(item.id, payload);
      await refreshRecords();
      toast.success("Price saved!");
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

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this item permanently?")) return;
    try {
      await axios.delete(`/api/vendor-bills/item/${id}`);
      await refreshRecords();
      toast.success("Deleted");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.response?.data?.message || "Delete failed");
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
          "Price/Kg": it.pricePerKg ?? 0,
          "Total Price": it.totalPrice ?? 0,
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

  // Reusable display for both mobile and desktop
  const TraysDisplay = ({ item }: { item: UIItem }) => {
    const trays = item.noTrays ?? 0;
    const looseKgs = Number(item.loose ?? 0);

    if (trays > 0) {
      return <span className="font-semibold text-gray-900">{trays}</span>;
    }

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
                <div className="bg-gray-100 rounded-full p-1.5 flex items-center gap-2 shadow-sm w-full sm:w-auto overflow-x-auto no-scrollbar">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
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
                  onValueChange={(v: any) => setSortOrder(v)}
                >
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder="Sort by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
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
              {/* Mobile View */}
              <div className="mt-5 grid grid-cols-1 gap-3 md:hidden">
                {filteredItems.map((it) => {
                  const edit = editing[it.id];
                  const isEditing = !!edit;
                  const isSaving = !!savingIds[it.id];

                  return (
                    <Card
                      key={it.id}
                      className="rounded-2xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">
                            {it.billNo}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {it.name}
                          </div>
                          <div className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            Variety: {it.varietyCode}
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            <span className="font-medium">Quantity:</span>{" "}
                            <TraysDisplay item={it} />
                          </div>
                        </div>

                        {!isEditing ? (
                          <div className="flex gap-2 shrink-0">
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
                              onClick={() => handleDeleteItem(it.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => saveRow(it)}
                              disabled={isSaving}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isSaving ? "..." : <Check className="w-4 h-4" />}
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
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border bg-gray-50 p-3 col-span-2">
                          <div className="text-xs text-gray-500">Trays</div>
                          <div className="mt-1">
                            <TraysDisplay item={it} />
                          </div>
                        </div>

                        <div className="rounded-xl border bg-gray-50 p-3 col-span-2">
                          <div className="text-xs text-gray-500">Price/Kg</div>
                          {isEditing ? (
                            <Input
                              value={edit.pricePerKg ?? ""}
                              onChange={(e) =>
                                onChangeField(it.id, e.target.value)
                              }
                              className="mt-2 w-full text-right"
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <div className="font-semibold text-gray-900">
                              {(it.pricePerKg ?? 0).toFixed(2)}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border bg-green-50 p-3 col-span-2">
                          <div className="text-xs text-gray-500">
                            Total Price
                          </div>
                          {isEditing ? (
                            <Input
                              value={edit.totalPrice ?? ""}
                              readOnly
                              className="mt-2 w-full text-right bg-green-50"
                            />
                          ) : (
                            <div className="font-bold text-green-700">
                              {(it.totalPrice ?? 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="mt-6 hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] table-auto">
                  <thead className="bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Bill No / Name</th>
                      <th className="p-4">Variety</th>
                      <th className="p-4 text-right">Trays</th>{" "}
                      {/* ← Kept exactly as you wanted */}
                      <th className="p-4 text-right">Price/Kg</th>
                      <th className="p-4 text-right">Total Price</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((it) => {
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

                          {/* ← Only this cell value changes */}
                          <td className="p-4 text-right">
                            <TraysDisplay item={it} />
                          </td>

                          <td className="p-4 text-right">
                            {isEditing ? (
                              <Input
                                value={edit.pricePerKg ?? ""}
                                onChange={(e) =>
                                  onChangeField(it.id, e.target.value)
                                }
                                className="w-24 text-right"
                                type="number"
                                step="0.01"
                                min="0"
                              />
                            ) : (
                              <span>{(it.pricePerKg ?? 0).toFixed(2)}</span>
                            )}
                          </td>

                          <td className="p-4 text-right font-semibold text-green-600">
                            {isEditing ? (
                              <Input
                                value={edit.totalPrice ?? ""}
                                readOnly
                                className="w-32 text-right bg-green-50"
                              />
                            ) : (
                              (it.totalPrice ?? 0).toFixed(2)
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
                                  onClick={() => handleDeleteItem(it.id)}
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
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
