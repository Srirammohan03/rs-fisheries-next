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
}

const fetchClientLoadings = async () => {
  const res = await axios.get("/api/client-loading");
  return res.data?.data ?? [];
};

const patchItemPrice = async (itemId: string, body: any) => {
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

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchClientLoadings()
      .then((data) => {
        if (!mounted) return;
        setRecords(data);
      })
      .catch(() => toast.error("Failed to load client bills"))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  // Calculate new entries badge
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "clientBillsLastSeen";
    const last = Number(localStorage.getItem(key) || 0);
    const current = records.length;
    setNewCount(Math.max(0, current - last));
  }, [records]);

  const handlePageVisit = () => {
    localStorage.setItem("clientBillsLastSeen", records.length.toString());
    setNewCount(0);
  };

  useEffect(() => {
    handlePageVisit(); // Mark as seen on mount
  }, [records.length]);

  // Filtered & sorted items
  const items = useMemo(() => {
    let result = records.flatMap((rec) =>
      rec.items.map((it) => ({
        ...it,
        loadingId: rec.id,
        billNo: rec.billNo,
        clientName: rec.clientName,
        date: rec.date?.split("T")[0] || "",
      }))
    );

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
    if (fromDate) result = result.filter((it) => it.date >= fromDate);
    if (toDate) result = result.filter((it) => it.date <= toDate);

    // Sort
    result.sort((a, b) =>
      sortOrder === "newest"
        ? (b.date || "").localeCompare(a.date || "")
        : (a.date || "").localeCompare(b.date || "")
    );

    return result;
  }, [records, searchTerm, sortOrder, fromDate, toDate]);

  const startEdit = (item: ClientItem) => {
    setEditing((prev) => ({
      ...prev,
      [item.id]: { pricePerKg: item.pricePerKg, totalPrice: item.totalPrice },
    }));
  };

  const cancelEdit = (id: string) => {
    setEditing((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const onPriceChange = (id: string, value: string) => {
    setEditing((prev) => {
      const current = prev[id] || {};
      const num = value === "" ? undefined : Number(value);
      const item = items.find((i) => i.id === id);

      if (!item?.totalKgs) return prev;

      const updates = { ...current, pricePerKg: num };
      if (num !== undefined) {
        updates.totalPrice = Number((item.totalKgs * num).toFixed(2));
      }

      return { ...prev, [id]: updates };
    });
  };

  const saveRow = async (item: ClientItem) => {
    const edits = editing[item.id];
    if (!edits) return;

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    try {
      await patchItemPrice(item.id, edits);

      // Update parent total
      await axios.post("/api/client-bills/update-total", {
        loadingId: item.loadingId,
      });

      // Refresh
      const data = await fetchClientLoadings();
      setRecords(data);
      toast.success("Price updated!");
      cancelEdit(item.id);
    } catch {
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
      const data = await fetchClientLoadings();
      setRecords(data);
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const exportToExcel = () => {
    const data = records.flatMap((rec) =>
      rec.items.map((it) => ({
        "Bill No": rec.billNo,
        "Client Name": rec.clientName,
        Date: rec.date?.split("T")[0],
        "Vehicle No": rec.vehicleNo,
        Village: rec.village,
        Variety: it.varietyCode,
        Trays: it.noTrays,
        "Tray Kgs": it.trayKgs,
        Loose: it.loose,
        "Total Kgs": it.totalKgs,
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
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="p-6 rounded-2xl shadow-lg">
          {/* Header */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-3xl font-bold text-gray-900">Client Bills</h2>

              <Button
                onClick={exportToExcel}
                className="border-green-600 text-green-700  hover:bg-green-50"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4  p-5 rounded-xl border border-blue-100">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative">
                  <Input
                    placeholder="Search Bill No, Client, Variety..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-80"
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
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <span className="text-gray-500 hidden sm:block">to</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16 text-gray-500">
              Loading client bills...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No client bills found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] table-auto">
                <thead className="bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Bill No / Client</th>
                    <th className="p-4">Variety</th>
                    <th className="p-4 text-right">Trays</th>
                    <th className="p-4 text-right">Tray Kgs</th>
                    <th className="p-4 text-right">Loose</th>
                    <th className="p-4 text-right">Total Kgs</th>
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
                        <td className="p-4 text-right">{it.noTrays ?? "-"}</td>
                        <td className="p-4 text-right">{it.trayKgs ?? "-"}</td>
                        <td className="p-4 text-right">{it.loose ?? "-"}</td>
                        <td className="p-4 text-right font-bold text-indigo-600">
                          {it.totalKgs ?? "-"}
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
          )}
        </Card>
      </div>
    </div>
  );
}
