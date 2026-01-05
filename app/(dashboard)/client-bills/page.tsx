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
import {
  Edit,
  Check,
  X,
  Trash2,
  Download,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import LoadingDeleteDialog from "@/components/helpers/LoadingDeleteDialog";
import { useQuery } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type AvailableVariety = {
  code: string;
  name?: string;
  netKgs: number;
  netTrays: number;
};

interface ClientItem {
  id: string;
  varietyCode?: string;
  noTrays?: number;
  trayKgs?: number;
  loose?: number;
  totalKgs?: number;
  pricePerKg?: number;
  totalPrice?: number;
}

interface ClientRecord {
  id: string;
  billNo?: string;
  date?: string;
  clientName?: string;
  vehicleNo?: string;
  vehicleId?: string | null;
  village?: string;
  items: ClientItem[];
  createdAt?: string;
  totalKgs?: number;
  grandTotal?: number;
  totalPrice?: number;
}

type UIItem = ClientItem & {
  loadingId: string;
  billNo: string;
  clientName: string;
  date: string;
  recordTotalKgs: number;
  recordGrandTotal: number;
  netKgsForThisItem: number;
  hasVehicle: boolean;
};

const fetchClientLoadings = async (): Promise<ClientRecord[]> => {
  const res = await axios.get("/api/client-loading");
  return (res.data?.data ?? []) as ClientRecord[];
};

export default function ClientBillsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ClientRecord[]>([]);

  const [editing, setEditing] = useState<
    Record<
      string,
      {
        noTrays?: number;
        loose?: number;
        pricePerKg?: number;
        totalPrice?: number;
      }
    >
  >({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [newCount, setNewCount] = useState(0);

  // Delete dialog
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<UIItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Pagination
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // ✅ Add item dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addLoadingId, setAddLoadingId] = useState("");
  const [addVarietyCode, setAddVarietyCode] = useState("");
  const [addTrays, setAddTrays] = useState<number>(0);
  const [addLoose, setAddLoose] = useState<number>(0);
  const [addingItem, setAddingItem] = useState(false);

  const refreshRecords = useCallback(async () => {
    const data = await fetchClientLoadings();
    setRecords(data);
  }, []);

  const {
    data: availableVarieties = [],
    isFetching: varietiesFetching,
    refetch: refetchVarieties,
  } = useQuery<AvailableVariety[]>({
    queryKey: ["available-varieties"],
    queryFn: async () => {
      const r = await axios.get("/api/stocks/available-varieties");
      return r.data?.data ?? [];
    },
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  });

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

  // New badge logic
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "clientBillsLastSeen";
    const last = Number(localStorage.getItem(key) || 0);
    const current = records.length;
    setNewCount(Math.max(0, current - last));
  }, [records]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("clientBillsLastSeen", records.length.toString());
    setNewCount(0);
  }, [records.length]);

  const items: UIItem[] = useMemo(() => {
    let result: UIItem[] = records.flatMap((rec) => {
      const recordTotalKgs = Number(rec.totalKgs || 0);
      const recordGrandTotal = Number(rec.grandTotal || 0);

      const hasVehicle =
        Boolean(rec.vehicleId) || Boolean((rec.vehicleNo || "").trim());

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
          billNo: rec.billNo || "",
          clientName: rec.clientName || "",
          date: rec.date?.split("T")[0] || "",
          recordTotalKgs,
          recordGrandTotal,
          netKgsForThisItem,
          hasVehicle,
        };
      });
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (it) =>
          it.billNo?.toLowerCase().includes(term) ||
          it.clientName?.toLowerCase().includes(term) ||
          it.varietyCode?.toLowerCase().includes(term)
      );
    }

    if (fromDate) result = result.filter((it) => (it.date || "") >= fromDate);
    if (toDate) result = result.filter((it) => (it.date || "") <= toDate);

    result.sort((a, b) =>
      sortOrder === "newest"
        ? (b.date || "").localeCompare(a.date || "")
        : (a.date || "").localeCompare(b.date || "")
    );

    return result;
  }, [records, searchTerm, sortOrder, fromDate, toDate]);

  useEffect(() => setPage(1), [searchTerm, sortOrder, fromDate, toDate]);

  const totalPages = useMemo(() => {
    if (items.length === 0) return 1;
    return Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  }, [items.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  const startEdit = useCallback((item: UIItem) => {
    setEditing((prev) => ({
      ...prev,
      [item.id]: {
        noTrays: item.noTrays ?? 0,
        loose: item.loose ?? 0,
        pricePerKg: item.pricePerKg ?? 0,
        totalPrice: item.totalPrice ?? 0,
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

  const recomputePreviewPrice = useCallback(
    (
      id: string,
      next: { noTrays?: number; loose?: number; pricePerKg?: number }
    ) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const price = Number(next.pricePerKg ?? editing[id]?.pricePerKg ?? 0);
      const netKgs = Number(item.netKgsForThisItem || 0);
      const totalPrice = Number((netKgs * price).toFixed(2));

      setEditing((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), ...next, totalPrice },
      }));
    },
    [items, editing]
  );

  const onNumberChange = useCallback(
    (id: string, field: "noTrays" | "loose" | "pricePerKg", value: string) => {
      const num = value === "" ? 0 : Math.max(0, Number(value) || 0);
      recomputePreviewPrice(id, { [field]: num } as any);
    },
    [recomputePreviewPrice]
  );

  const saveRow = async (item: UIItem) => {
    const edits = editing[item.id];
    if (!edits || savingIds[item.id]) return;

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    try {
      await axios.patch(`/api/client-bills/item/${item.id}`, {
        noTrays: edits.noTrays ?? 0,
        loose: edits.loose ?? 0,
        pricePerKg: edits.pricePerKg ?? 0,
      });

      await axios.post("/api/client-bills/update-total", {
        loadingId: item.loadingId,
      });

      await refreshRecords();
      toast.success("Updated ✅");
      cancelEdit(item.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Save failed");
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
    if (deletingItem) return;
    if (!deleteItemTarget?.id) return;

    try {
      setDeletingItem(true);
      const res = await axios.delete(
        `/api/client-bills/item/${deleteItemTarget.id}`
      );
      await refreshRecords();

      if (res.data?.deletedBill)
        toast.success("Item deleted ✅ Bill also removed (last item)");
      else toast.success("Item deleted");

      closeDeleteItemDialog();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingItem(false);
    }
  };

  const exportToExcel = () => {
    const data = records.flatMap((rec) =>
      rec.items.map((it) => ({
        "Bill No": rec.billNo || "",
        "Client Name": rec.clientName || "",
        Date: rec.date ? new Date(rec.date).toLocaleDateString("en-IN") : "",
        "Vehicle No": rec.vehicleNo || "",
        Address: rec.village || "",
        Variety: it.varietyCode || "",
        Trays: it.noTrays ?? 0,
        Loose: it.loose ?? 0,
        "Price/Kg": it.pricePerKg ?? 0,
        "Total Price": it.totalPrice ?? 0,
        "Total Kgs": it.totalKgs ?? 0,
        "Bill Total Kgs": rec.totalKgs ?? 0,
        "Bill Grand Total": rec.grandTotal ?? 0,
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

  const resetAddForm = () => {
    setAddLoadingId("");
    setAddVarietyCode("");
    setAddTrays(0);
    setAddLoose(0);
  };

  const addItemToBill = async () => {
    if (!addLoadingId) return toast.error("Select Bill");
    if (!addVarietyCode) return toast.error("Select Variety");
    if ((addTrays ?? 0) <= 0 && (addLoose ?? 0) <= 0)
      return toast.error("Enter trays or loose");

    try {
      setAddingItem(true);

      await axios.post("/api/client-bills/item", {
        loadingId: addLoadingId,
        varietyCode: addVarietyCode,
        noTrays: Math.max(0, Number(addTrays) || 0),
        loose: Math.max(0, Number(addLoose) || 0),
      });

      await axios.post("/api/client-bills/update-total", {
        loadingId: addLoadingId,
      });

      toast.success("Variety added to bill ✅");
      await refreshRecords();
      refetchVarieties();

      setAddOpen(false);
      resetAddForm();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to add item");
    } finally {
      setAddingItem(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Card className="p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Client Bills{" "}
                {newCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-red-600">
                    ({newCount} new)
                  </span>
                )}
              </h2>

              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <Button
                  onClick={() => setAddOpen(true)}
                  className="w-full lg:w-auto"
                  variant="outline"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Variety to Bill
                </Button>

                <Button
                  onClick={() => refetchVarieties()}
                  className="w-full lg:w-auto"
                  variant="outline"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      varietiesFetching ? "animate-spin" : ""
                    }`}
                  />
                  Refresh Varieties
                </Button>

                <Button
                  onClick={exportToExcel}
                  className="w-full lg:w-auto border-green-600 text-green-700 hover:bg-green-50"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl border border-blue-100 bg-white/60">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
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

                <Select
                  value={sortOrder}
                  onValueChange={(v: "newest" | "oldest") => setSortOrder(v)}
                >
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue />
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
                  />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
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
            <div className="text-center py-16 text-gray-500">
              Loading client bills...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No client bills found
            </div>
          ) : (
            <>
              {/* ✅ Mobile cards */}
              <div className="mt-6 grid grid-cols-1 gap-3 md:hidden">
                {paginatedItems.map((it) => {
                  const edit = editing[it.id];
                  const isEditing = !!edit;
                  const isSaving = !!savingIds[it.id];

                  return (
                    <div
                      key={it.id}
                      className="rounded-2xl border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {it.billNo}
                          </div>
                          <div className="text-xs text-gray-600">
                            {it.clientName}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            {it.hasVehicle
                              ? "Vehicle: Yes (No 5% cut)"
                              : "Vehicle: No (5% cut)"}
                          </div>
                        </div>

                        {!isEditing ? (
                          <div className="flex gap-2">
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
                          <div className="flex gap-2">
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

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Variety</div>
                          <div className="font-medium">
                            {it.varietyCode || "-"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">
                            Total Price
                          </div>
                          <div className="font-bold text-green-600">
                            {isEditing
                              ? Number(edit.totalPrice ?? 0).toFixed(2)
                              : Number(it.totalPrice ?? 0).toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">Trays</div>
                          {isEditing ? (
                            <Input
                              value={edit.noTrays ?? 0}
                              onChange={(e) =>
                                onNumberChange(it.id, "noTrays", e.target.value)
                              }
                              className="h-9"
                              type="number"
                              min={0}
                            />
                          ) : (
                            <div className="font-medium">{it.noTrays ?? 0}</div>
                          )}
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">
                            Loose (Kgs)
                          </div>
                          {isEditing ? (
                            <Input
                              value={edit.loose ?? 0}
                              onChange={(e) =>
                                onNumberChange(it.id, "loose", e.target.value)
                              }
                              className="h-9"
                              type="number"
                              min={0}
                              step="0.1"
                            />
                          ) : (
                            <div className="font-medium">
                              {Number(it.loose ?? 0).toFixed(1)}
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          <div className="text-xs text-gray-500">Price/Kg</div>
                          {isEditing ? (
                            <Input
                              value={edit.pricePerKg ?? 0}
                              onChange={(e) =>
                                onNumberChange(
                                  it.id,
                                  "pricePerKg",
                                  e.target.value
                                )
                              }
                              className="h-9"
                              type="number"
                              min={0}
                              step="0.01"
                            />
                          ) : (
                            <div className="font-medium">
                              {Number(it.pricePerKg ?? 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ✅ Desktop Table */}
              <div className="mt-6 hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1050px] table-auto">
                  <thead className="bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Bill No / Client</th>
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
                        <tr key={it.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 font-medium">
                            <div className="text-sm font-semibold">
                              {it.billNo}
                            </div>
                            <div className="text-xs text-gray-600">
                              {it.clientName}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">
                              {it.hasVehicle
                                ? "Vehicle: Yes (No 5% cut)"
                                : "Vehicle: No (5% cut)"}
                            </div>
                          </td>

                          <td className="p-4">{it.varietyCode || "-"}</td>

                          <td className="p-4 text-right">
                            {isEditing ? (
                              <Input
                                value={edit.noTrays ?? 0}
                                onChange={(e) =>
                                  onNumberChange(
                                    it.id,
                                    "noTrays",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "-" ||
                                    e.key === "e" ||
                                    e.key === "E"
                                  )
                                    e.preventDefault();
                                }}
                                className="w-24 text-right"
                                type="number"
                                min={0}
                              />
                            ) : (
                              <span className="font-medium">
                                {it.noTrays ?? 0}
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            {isEditing ? (
                              <Input
                                value={edit.loose ?? 0}
                                onChange={(e) =>
                                  onNumberChange(it.id, "loose", e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "-" ||
                                    e.key === "e" ||
                                    e.key === "E"
                                  )
                                    e.preventDefault();
                                }}
                                className="w-24 text-right"
                                type="number"
                                min={0}
                                step="0.1"
                              />
                            ) : (
                              <span className="font-medium">
                                {Number(it.loose ?? 0).toFixed(1)}
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            {isEditing ? (
                              <Input
                                value={edit.pricePerKg ?? 0}
                                onChange={(e) =>
                                  onNumberChange(
                                    it.id,
                                    "pricePerKg",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "-" ||
                                    e.key === "e" ||
                                    e.key === "E"
                                  )
                                    e.preventDefault();
                                }}
                                className="w-28 text-right"
                                type="number"
                                step="0.01"
                                min={0}
                              />
                            ) : (
                              <span className="font-medium">
                                {Number(it.pricePerKg ?? 0).toFixed(2)}
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right font-bold text-green-600">
                            {isEditing ? (
                              <Input
                                value={edit.totalPrice ?? 0}
                                readOnly
                                className="w-32 text-right bg-green-50 font-bold"
                              />
                            ) : (
                              Number(it.totalPrice ?? 0).toFixed(2)
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

              {/* Pagination */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {(page - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(page * PAGE_SIZE, items.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {items.length}
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

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNo = i + 1;
                    return (
                      <Button
                        key={pageNo}
                        size="sm"
                        variant={page === pageNo ? "default" : "outline"}
                        onClick={() => setPage(pageNo)}
                        className={
                          page === pageNo ? "bg-blue-600 text-white" : ""
                        }
                      >
                        {pageNo}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ✅ Add Variety Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(v) => {
          if (!v && !addingItem) resetAddForm();
          setAddOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Add Variety to Bill</DialogTitle>
            <DialogDescription>
              Rule: <b>Vehicle present → NO 5% deduction</b>, else 5% applies.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-gray-500 mb-1">
                Bill
              </div>
              <Select value={addLoadingId} onValueChange={setAddLoadingId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Bill No / Client" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {records.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.billNo} — {r.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-gray-500 mb-1">
                Variety (stock trays)
              </div>
              <Select value={addVarietyCode} onValueChange={setAddVarietyCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Variety" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableVarieties.map((v) => (
                    <SelectItem key={v.code} value={v.code}>
                      {v.code} ({v.netTrays} trays)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">
                Trays
              </div>
              <Input
                type="number"
                min={0}
                value={addTrays}
                onChange={(e) =>
                  setAddTrays(Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">
                Loose (Kgs)
              </div>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={addLoose}
                onChange={(e) =>
                  setAddLoose(Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={addingItem}
            >
              Cancel
            </Button>
            <Button onClick={addItemToBill} disabled={addingItem}>
              {addingItem ? "Adding..." : "Add to Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
