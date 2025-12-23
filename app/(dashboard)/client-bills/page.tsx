// app/(dashboard)/client-bills/page.tsx
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

interface ClientItem {
  id: string;
  varietyCode?: string;

  // stored in backend (do NOT show in UI)
  noTrays?: number;
  trayKgs?: number;
  loose?: number;
  totalKgs?: number;

  pricePerKg?: number;
  totalPrice?: number;

  loadingId?: string;
  billNo?: string;
  clientName?: string;
  date?: string;
}

interface ClientRecord {
  id: string;
  billNo?: string;
  date?: string;
  clientName?: string;
  vehicleNo?: string;
  village?: string;
  items: ClientItem[];
  createdAt?: string;

  // IMPORTANT: backend totals
  totalKgs?: number; // original total (before -5%)
  grandTotal?: number; // net total after -5% (already computed by backend)
  totalPrice?: number;
}

type UIItem = ClientItem & {
  recordTotalKgs: number;
  recordGrandTotal: number;
  netKgsForThisItem: number; // derived using record.grandTotal
};

const fetchClientLoadings = async (): Promise<ClientRecord[]> => {
  const res = await axios.get("/api/client-loading");
  return (res.data?.data ?? []) as ClientRecord[];
};

const patchItemPrice = async (itemId: string, body: Partial<ClientItem>) => {
  const res = await axios.patch(`/api/client-bills/item/${itemId}`, body);
  return res.data;
};

export default function ClientBillsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ClientRecord[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<ClientItem>>>(
    {}
  );
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // New entries badge
  const [newCount, setNewCount] = useState(0);

  const refreshRecords = useCallback(async () => {
    const data = await fetchClientLoadings();
    setRecords(data);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    refreshRecords()
      .catch(() => toast.error("Failed to load client bills"))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [refreshRecords]);

  // Calculate new entries badge
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "clientBillsLastSeen";
    const last = Number(localStorage.getItem(key) || 0);
    const current = records.length;
    setNewCount(Math.max(0, current - last));
  }, [records]);

  const handlePageVisit = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("clientBillsLastSeen", records.length.toString());
    setNewCount(0);
  }, [records.length]);

  useEffect(() => {
    handlePageVisit();
  }, [records.length, handlePageVisit]);

  /**
   * ✅ Key Fix:
   * DO NOT do `*0.95` here.
   * Use record.grandTotal (already net after -5%) and allocate per item proportionally.
   */
  const items: UIItem[] = useMemo(() => {
    let result: UIItem[] = records.flatMap((rec) => {
      const recordTotalKgs = Number(rec.totalKgs || 0); // original total
      const recordGrandTotal = Number(rec.grandTotal || 0); // net after -5%

      return rec.items.map((it) => {
        const itemTotalKgs = Number(it.totalKgs || 0);

        const netKgsForThisItem =
          recordTotalKgs > 0 && recordGrandTotal > 0
            ? Number(
                ((itemTotalKgs / recordTotalKgs) * recordGrandTotal).toFixed(3)
              )
            : itemTotalKgs;

        return {
          ...it,
          loadingId: rec.id,
          billNo: rec.billNo,
          clientName: rec.clientName,
          date: rec.date?.split("T")[0] || "",
          recordTotalKgs,
          recordGrandTotal,
          netKgsForThisItem,
        };
      });
    });

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (it) =>
          it.billNo?.toLowerCase().includes(term) ||
          it.clientName?.toLowerCase().includes(term) ||
          it.varietyCode?.toLowerCase().includes(term)
      );
    }

    // Date range
    if (fromDate) result = result.filter((it) => (it.date || "") >= fromDate);
    if (toDate) result = result.filter((it) => (it.date || "") <= toDate);

    // Sort
    result.sort((a, b) =>
      sortOrder === "newest"
        ? (b.date || "").localeCompare(a.date || "")
        : (a.date || "").localeCompare(b.date || "")
    );

    return result;
  }, [records, searchTerm, sortOrder, fromDate, toDate]);

  const startEdit = useCallback((item: ClientItem) => {
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

  /**
   * ✅ totalPrice = itemNetKgs * pricePerKg (netKgs already derived from grandTotal)
   * ✅ No `0.95` anywhere
   */
  const onPriceChange = useCallback(
    (id: string, value: string) => {
      setEditing((prev) => {
        const current = prev[id] || {};
        const num = value === "" ? undefined : Number(value);
        const item = items.find((i) => i.id === id);
        if (!item) return prev;

        const updates: Partial<ClientItem> = { ...current, pricePerKg: num };

        if (num !== undefined) {
          const netKgs = Number(item.netKgsForThisItem || 0);
          updates.totalPrice = Number((netKgs * num).toFixed(2));
        } else {
          updates.totalPrice = undefined;
        }

        return { ...prev, [id]: updates };
      });
    },
    [items]
  );

  const saveRow = async (item: ClientItem) => {
    const edits = editing[item.id];
    if (!edits || savingIds[item.id]) return;

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    const payload: Partial<ClientItem> = {};
    if (edits.pricePerKg !== undefined) payload.pricePerKg = edits.pricePerKg;
    if (edits.totalPrice !== undefined) payload.totalPrice = edits.totalPrice;

    try {
      await patchItemPrice(item.id, payload);

      // Update parent total
      await axios.post("/api/client-bills/update-total", {
        loadingId: item.loadingId,
      });

      await refreshRecords();
      toast.success("Price updated!");
      cancelEdit(item.id);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSavingIds((prev) => {
        const c = { ...prev };
        delete c[item.id];
        return c;
      });
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await axios.delete(`/api/client-bills/item/${id}`);
      await refreshRecords();
      toast.success("Deleted");
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  };

  /**
   * ✅ Export without KGS columns (only trays + pricing)
   */
  const exportToExcel = () => {
    const data = records.flatMap((rec) =>
      rec.items.map((it) => ({
        "Bill No": rec.billNo || "",
        "Client Name": rec.clientName || "",
        Date: rec.date ? new Date(rec.date).toLocaleDateString("en-IN") : "",
        "Vehicle No": rec.vehicleNo || "",
        Village: rec.village || "",
        Variety: it.varietyCode || "",
        Trays: it.noTrays ?? 0,
        "Price/Kg": it.pricePerKg ?? 0,
        "Total Price": it.totalPrice ?? 0,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Bills");
    XLSX.writeFile(
      wb,
      `client-bills-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Card className="p-4 sm:p-6 rounded-2xl shadow-lg">
          {/* Header */}
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Client Bills
              </h2>

              <Button
                onClick={exportToExcel}
                className="w-full lg:w-auto border-green-600 text-green-700 hover:bg-green-50"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl border border-blue-100 bg-white/40">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                {/* Search */}
                <div className="relative w-full lg:w-[420px]">
                  <Input
                    placeholder="Search Bill No, Client, Variety..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
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

                {/* Sort */}
                <Select
                  value={sortOrder}
                  onValueChange={(v: any) => setSortOrder(v)}
                >
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                {/* Dates */}
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

          {/* Content */}
          {loading ? (
            <div className="text-center py-16 text-gray-500">
              Loading client bills...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No client bills found
            </div>
          ) : (
            <>
              {/* ✅ Mobile view (cards) */}
              <div className="mt-5 grid grid-cols-1 gap-3 md:hidden">
                {items.map((it) => {
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
                          <div className="text-xs text-gray-600 truncate">
                            {it.clientName}
                          </div>
                          <div className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            Variety: {it.varietyCode || "-"}
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
                              onClick={() => deleteItem(it.id)}
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

                      {/* ✅ ONLY TRAYS + PRICE */}
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border bg-gray-50 p-3 col-span-2">
                          <div className="text-xs text-gray-500">Trays</div>
                          <div className="font-semibold text-gray-900">
                            {it.noTrays ?? "-"}
                          </div>
                        </div>

                        <div className="rounded-xl border bg-gray-50 p-3 col-span-2">
                          <div className="text-xs text-gray-500">Price/Kg</div>
                          {isEditing ? (
                            <Input
                              value={edit.pricePerKg ?? ""}
                              onChange={(e) =>
                                onPriceChange(it.id, e.target.value)
                              }
                              className="mt-2 w-full text-right"
                              type="number"
                              step="0.01"
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
                              className="mt-2 w-full text-right bg-green-50 font-bold"
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

              {/* ✅ Desktop view (table) */}
              <div className="mt-6 hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] table-auto">
                  <thead className="bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Bill No / Client</th>
                      <th className="p-4">Variety</th>
                      <th className="p-4 text-right">Trays</th>
                      <th className="p-4 text-right">Price/Kg</th>
                      <th className="p-4 text-right">Total Price</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {items.map((it) => {
                      const edit = editing[it.id];
                      const isEditing = !!edit;
                      const isSaving = !!savingIds[it.id];

                      return (
                        <tr key={it.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 font-medium">
                            <div className="text-sm font-semibold">
                              {it.billNo}
                            </div>
                            <div className="text-xs text-gray-600">
                              {it.clientName}
                            </div>
                          </td>

                          <td className="p-4">{it.varietyCode || "-"}</td>

                          {/* ✅ ONLY TRAYS */}
                          <td className="p-4 text-right font-semibold">
                            {it.noTrays ?? "-"}
                          </td>

                          <td className="p-4 text-right">
                            {isEditing ? (
                              <Input
                                value={edit.pricePerKg ?? ""}
                                onChange={(e) =>
                                  onPriceChange(it.id, e.target.value)
                                }
                                className="w-28 text-right"
                                type="number"
                                step="0.01"
                              />
                            ) : (
                              <span className="font-medium">
                                {(it.pricePerKg ?? 0).toFixed(2)}
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right font-bold text-green-600">
                            {isEditing ? (
                              <Input
                                value={edit.totalPrice ?? ""}
                                readOnly
                                className="w-32 text-right bg-green-50 font-bold"
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
                                  onClick={() => deleteItem(it.id)}
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
