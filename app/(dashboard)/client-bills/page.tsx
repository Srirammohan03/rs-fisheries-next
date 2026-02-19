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
  ChevronDown,
  ChevronRight,
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
  createdAt: string;
  hasVehicle: boolean;
};

type BillRow = {
  id: string; // loadingId
  billNo: string;
  clientName: string;
  date: string;
  createdAt: string;
  vehicleNo?: string;
  village?: string;
  hasVehicle: boolean;

  items: UIItem[];

  varietyCount: number;
  uniqueVarietyCount: number;
  totalPrice: number; // ✅ ALWAYS SUM OF ITEMS
};

const fetchClientLoadings = async (): Promise<ClientRecord[]> => {
  const res = await axios.get("/api/client-loading");
  return (res.data?.data ?? []) as ClientRecord[];
};

function n(v: unknown): number {
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : 0;
}

// ✅ backend matching rule
function calcItemTotalPrice(
  totalKgs: number,
  pricePerKg: number,
  hasVehicle: boolean,
): number {
  const cut = hasVehicle ? 1 : 0.95;
  // keep 2 decimals like UI
  return Number((totalKgs * pricePerKg * cut).toFixed(2));
}

export default function ClientBillsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ClientRecord[]>([]);

  const [editing, setEditing] = useState<
    Record<
      string,
      {
        noTrays: number;
        loose: number;
        pricePerKg: number;
        totalPrice: number; // preview
      }
    >
  >({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  // Expand/collapse bills
  const [expandedBills, setExpandedBills] = useState<Record<string, boolean>>(
    {},
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [newCount, setNewCount] = useState(0);

  // Delete dialog
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<UIItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Pagination (BILLS)
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Add item dialog
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
      return (r.data?.data ?? []) as AvailableVariety[];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records.length]);

  // ✅ Build bill rows (ONE ROW PER BILL)
  const bills: BillRow[] = useMemo(() => {
    const base: BillRow[] = records.map((rec) => {
      const hasVehicle =
        Boolean(rec.vehicleId) || Boolean((rec.vehicleNo || "").trim());

      const items: UIItem[] = (rec.items || []).map((it) => {
        const totalKgs = n(it.totalKgs);
        const pricePerKg = n(it.pricePerKg);

        // ✅ ensure UI uses correct totalPrice if backend didn't send it
        const fixedTotalPrice =
          it.totalPrice !== undefined && it.totalPrice !== null
            ? n(it.totalPrice)
            : calcItemTotalPrice(totalKgs, pricePerKg, hasVehicle);

        return {
          ...it,
          totalPrice: fixedTotalPrice,
          loadingId: rec.id,
          billNo: rec.billNo || "",
          clientName: rec.clientName || "",
          date: rec.date?.split("T")[0] || "",
          createdAt: rec.createdAt || rec.date || "",
          hasVehicle,
        };
      });

      // ✅ ALWAYS SUM ITEMS (this fixes your mismatch)
      const computedTotal = Number(
        items.reduce((sum, it) => sum + n(it.totalPrice), 0).toFixed(2),
      );

      const varietyCount = items.length;
      const uniqueVarietyCount = new Set(
        items.map((it) => (it.varietyCode || "").trim().toUpperCase()),
      ).size;

      return {
        id: rec.id,
        billNo: rec.billNo || "-",
        clientName: rec.clientName || "Unknown",
        date: rec.date?.split("T")[0] || "",
        createdAt: rec.createdAt || rec.date || "",
        vehicleNo: rec.vehicleNo,
        village: rec.village,
        hasVehicle,
        items,
        varietyCount,
        uniqueVarietyCount,
        totalPrice: computedTotal,
      };
    });

    let filtered = base;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((b) => {
        const billMatch = b.billNo.toLowerCase().includes(term);
        const nameMatch = b.clientName.toLowerCase().includes(term);
        const varietyMatch = b.items.some((it) =>
          (it.varietyCode || "").toLowerCase().includes(term),
        );
        return billMatch || nameMatch || varietyMatch;
      });
    }

    if (fromDate) filtered = filtered.filter((b) => (b.date || "") >= fromDate);
    if (toDate) filtered = filtered.filter((b) => (b.date || "") <= toDate);

    filtered.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    return filtered;
  }, [records, searchTerm, sortOrder, fromDate, toDate]);

  // ✅ map itemId -> item for preview calculations
  const itemById = useMemo(() => {
    const map = new Map<string, UIItem>();
    for (const bill of bills) {
      for (const it of bill.items) map.set(it.id, it);
    }
    return map;
  }, [bills]);

  useEffect(() => setPage(1), [searchTerm, sortOrder, fromDate, toDate]);

  const totalPages = useMemo(() => {
    if (bills.length === 0) return 1;
    return Math.max(1, Math.ceil(bills.length / PAGE_SIZE));
  }, [bills.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedBills = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return bills.slice(start, start + PAGE_SIZE);
  }, [bills, page]);

  const toggleBill = (billId: string) => {
    setExpandedBills((prev) => ({ ...prev, [billId]: !prev[billId] }));
  };

  const startEdit = useCallback((item: UIItem) => {
    setEditing((prev) => ({
      ...prev,
      [item.id]: {
        noTrays: n(item.noTrays),
        loose: n(item.loose),
        pricePerKg: n(item.pricePerKg),
        totalPrice: n(item.totalPrice),
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

  // ✅ recompute preview based on backend formula
  const recomputePreviewPrice = useCallback(
    (
      id: string,
      next: Partial<{ noTrays: number; loose: number; pricePerKg: number }>,
    ) => {
      const item = itemById.get(id);
      if (!item) return;

      const price = n(
        next.pricePerKg ?? editing[id]?.pricePerKg ?? item.pricePerKg,
      );
      const totalKgs = n(item.totalKgs); // ✅ use totalKgs (not grandTotal logic)
      const totalPrice = calcItemTotalPrice(totalKgs, price, item.hasVehicle);

      setEditing((prev) => ({
        ...prev,
        [id]: {
          noTrays: n(next.noTrays ?? prev[id]?.noTrays ?? item.noTrays),
          loose: n(next.loose ?? prev[id]?.loose ?? item.loose),
          pricePerKg: price,
          totalPrice,
        },
      }));
    },
    [itemById, editing],
  );

  const onNumberChange = useCallback(
    (id: string, field: "noTrays" | "loose" | "pricePerKg", value: string) => {
      const num = value === "" ? 0 : Math.max(0, Number(value) || 0);
      recomputePreviewPrice(id, { [field]: num } as any);
    },
    [recomputePreviewPrice],
  );

  const saveRow = async (item: UIItem) => {
    const edits = editing[item.id];
    if (!edits || savingIds[item.id]) return;

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    try {
      await axios.patch(`/api/client-bills/item/${item.id}`, {
        noTrays: n(edits.noTrays),
        loose: n(edits.loose),
        pricePerKg: n(edits.pricePerKg),
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
        `/api/client-bills/item/${deleteItemTarget.id}`,
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
    const data = records.flatMap((rec) => {
      const hasVehicle =
        Boolean(rec.vehicleId) || Boolean((rec.vehicleNo || "").trim());

      return (rec.items || []).map((it) => {
        const totalKgs = n(it.totalKgs);
        const price = n(it.pricePerKg);
        const totalPrice =
          it.totalPrice !== undefined && it.totalPrice !== null
            ? n(it.totalPrice)
            : calcItemTotalPrice(totalKgs, price, hasVehicle);

        return {
          "Bill No": rec.billNo || "",
          "Client Name": rec.clientName || "",
          Date: rec.date ? new Date(rec.date).toLocaleDateString("en-IN") : "",
          Address: rec.village || "",
          "Vehicle No": rec.vehicleNo || "",
          Variety: it.varietyCode || "",
          Trays: it.noTrays ?? 0,
          Loose: n(it.loose),
          "Total Kgs": totalKgs,
          "Price/Kg": price,
          "Total Price": totalPrice,
        };
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Bills");
    XLSX.writeFile(
      wb,
      `client-bills-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };
  const handlePrint = (billId: string) => {
    const printContent = document.getElementById(`print-bill-${billId}`);
    if (!printContent) {
      toast.error("Print content not found");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bill ${billId}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 12mm;
          }
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            font-size: 13px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .logo {
            width: 140px;
          }
          .logo img {
            width: 100%;
            height: auto;
          }
          .center {
            flex: 1;
            text-align: center;
            padding: 0 20px;
          }
          .center h1 {
            font-size: 20px;
            font-weight: bold;
            color: #139BC3;
            margin: 0 0 4px;
          }
          .center p {
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
          }
          .address {
            width: 180px;
            font-size: 12px;
            line-height: 1.4;
            text-align: right;
          }
          hr {
            border: none;
            border-top: 1.5px solid #000;
            margin: 12px 0;
          }
          .title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 12px 0;
          }
          .meta {
            font-size: 13px;
            margin-bottom: 16px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 20px;
          }
          th, td {
            border: 1.5px solid #000;
            padding: 8px;
          }
          th {
            background: #f3f4f6;
            font-weight: bold;
            text-align: left;
          }
          td {
            text-align: right;
          }
          td:first-child {
            text-align: left;
          }
          tfoot td {
            background: #f9fafb;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 600);
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
    if (n(addTrays) <= 0 && n(addLoose) <= 0)
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

      // auto expand that bill
      setExpandedBills((prev) => ({ ...prev, [addLoadingId]: true }));
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
                  className="bg-[#139BC3] hover:bg-[#139BC3]/80 text-white"
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
                    className={`w-4 h-4 mr-2 ${varietiesFetching ? "animate-spin" : ""}`}
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
          ) : bills.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No client bills found
            </div>
          ) : (
            <>
              {/* ✅ Mobile */}
              <div className="mt-6 grid grid-cols-1 gap-3 md:hidden">
                {paginatedBills.map((bill) => {
                  const open = !!expandedBills[bill.id];

                  return (
                    <div
                      key={bill.id}
                      className="rounded-2xl border bg-white p-4 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => toggleBill(bill.id)}
                        className="w-full flex items-start justify-between gap-3"
                      >
                        <div className="text-left">
                          <div className="text-sm font-semibold">
                            {bill.billNo}
                          </div>
                          <div className="text-xs text-gray-600">
                            {bill.clientName}
                          </div>
                          {bill.date ? (
                            <div className="text-[11px] text-gray-500 mt-1">
                              {bill.date}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Varieties
                            </div>
                            <div className="font-semibold text-gray-900">
                              {bill.varietyCount}
                            </div>
                          </div>
                          {open ? (
                            <ChevronDown className="w-5 h-5 text-gray-700 mt-1" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-700 mt-1" />
                          )}
                        </div>
                      </button>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="font-bold text-green-600">
                          {n(bill.totalPrice).toFixed(2)}
                        </div>
                      </div>

                      {open && (
                        <div className="mt-4 space-y-3">
                          <div className="rounded-xl border bg-gray-50 p-3 text-xs text-gray-700">
                            {bill.vehicleNo ? (
                              <>Vehicle: {bill.vehicleNo} • </>
                            ) : null}
                            {bill.village ? <>Address: {bill.village}</> : null}
                          </div>

                          <div className="space-y-3">
                            {bill.items.map((it) => {
                              const edit = editing[it.id];
                              const isEditing = !!edit;
                              const isSaving = !!savingIds[it.id];

                              return (
                                <div
                                  key={it.id}
                                  className="rounded-xl border bg-white p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-semibold">
                                        {it.varietyCode || "-"}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Total:{" "}
                                        <span className="font-semibold text-green-700">
                                          {isEditing
                                            ? n(edit.totalPrice).toFixed(2)
                                            : n(it.totalPrice).toFixed(2)}
                                        </span>
                                      </div>
                                      {open &&
                                        bill.totalPrice > 0 &&
                                        bill.items.every(
                                          (it) => n(it.pricePerKg) > 0,
                                        ) && (
                                          <div className="mt-4 flex justify-end">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                handlePrint(bill.id)
                                              }
                                              className="border-green-600 text-green-700 hover:bg-green-50"
                                            >
                                              <Download className="w-4 h-4 mr-2" />
                                              Print Bill
                                            </Button>
                                          </div>
                                        )}
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
                                          onClick={() =>
                                            openDeleteItemDialog(it)
                                          }
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
                                  </div>

                                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <div className="text-xs text-gray-500">
                                        Trays
                                      </div>
                                      {isEditing ? (
                                        <Input
                                          value={edit.noTrays}
                                          onChange={(e) =>
                                            onNumberChange(
                                              it.id,
                                              "noTrays",
                                              e.target.value,
                                            )
                                          }
                                          className="h-9"
                                          type="number"
                                          min={0}
                                        />
                                      ) : (
                                        <div className="font-medium">
                                          {n(it.noTrays)}
                                        </div>
                                      )}
                                    </div>

                                    <div>
                                      <div className="text-xs text-gray-500">
                                        Loose (Kgs)
                                      </div>
                                      {isEditing ? (
                                        <Input
                                          value={edit.loose}
                                          onChange={(e) =>
                                            onNumberChange(
                                              it.id,
                                              "loose",
                                              e.target.value,
                                            )
                                          }
                                          className="h-9"
                                          type="number"
                                          min={0}
                                          step="0.1"
                                        />
                                      ) : (
                                        <div className="font-medium">
                                          {n(it.loose).toFixed(1)}
                                        </div>
                                      )}
                                    </div>

                                    <div className="col-span-2">
                                      <div className="text-xs text-gray-500">
                                        Price/Kg
                                      </div>
                                      {isEditing ? (
                                        <Input
                                          value={edit.pricePerKg}
                                          onChange={(e) =>
                                            onNumberChange(
                                              it.id,
                                              "pricePerKg",
                                              e.target.value,
                                            )
                                          }
                                          className="h-9"
                                          type="number"
                                          min={0}
                                          step="0.01"
                                        />
                                      ) : (
                                        <div className="font-medium">
                                          {n(it.pricePerKg).toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ✅ Desktop */}
              <div className="mt-6 hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] table-auto">
                  <thead className="bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Bill No / Client</th>
                      <th className="p-4 text-right">Variety</th>
                      <th className="p-4 text-right">Total</th>
                      <th className="p-4 text-center">Open</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {paginatedBills.map((bill) => {
                      const open = !!expandedBills[bill.id];

                      return (
                        <React.Fragment key={bill.id}>
                          <tr className="hover:bg-gray-50 transition">
                            <td className="p-4 font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleBill(bill.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100"
                                  aria-label="Toggle bill"
                                >
                                  {open ? (
                                    <ChevronDown className="w-4 h-4 text-gray-700" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-700" />
                                  )}
                                </button>

                                <div>
                                  <div className="text-sm font-semibold">
                                    {bill.billNo}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {bill.clientName}
                                    {bill.date ? ` • ${bill.date}` : ""}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 text-right">
                              <div className="font-semibold text-gray-900">
                                {bill.varietyCount}
                              </div>
                            </td>

                            <td className="p-4 text-right font-bold text-green-600">
                              {n(bill.totalPrice).toFixed(2)}
                            </td>

                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleBill(bill.id)}
                                  className="bg-[#139BC3] text-white hover:bg-[#0f8ca8]"
                                >
                                  {open ? "Hide" : "View"}
                                </Button>

                                {/* Print button – only show when prices are filled */}
                                {bill.totalPrice > 0 &&
                                  bill.items.every(
                                    (it) => n(it.pricePerKg) > 0,
                                  ) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePrint(bill.id)}
                                      className="border-green-600 text-green-700 hover:bg-green-50"
                                    >
                                      Print
                                    </Button>
                                  )}
                              </div>
                            </td>
                          </tr>

                          {open && (
                            <tr className="bg-white">
                              <td colSpan={4} className="p-4">
                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                  <div className="px-4 py-3 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="text-sm text-gray-700">
                                      <span className="font-semibold text-gray-900">
                                        Bill:
                                      </span>{" "}
                                      {bill.billNo}{" "}
                                      <span className="text-gray-400">•</span>{" "}
                                      {bill.clientName}
                                      {bill.vehicleNo ? (
                                        <>
                                          {" "}
                                          <span className="text-gray-400">
                                            •
                                          </span>{" "}
                                          Vehicle: {bill.vehicleNo}
                                        </>
                                      ) : null}
                                      {bill.village ? (
                                        <>
                                          {" "}
                                          <span className="text-gray-400">
                                            •
                                          </span>{" "}
                                          Address: {bill.village}
                                        </>
                                      ) : null}
                                    </div>

                                    <div className="text-sm font-semibold text-green-700">
                                      Total: {n(bill.totalPrice).toFixed(2)}
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1050px] table-auto">
                                      <thead className="bg-white text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        <tr>
                                          <th className="p-4">Variety</th>
                                          <th className="p-4 text-right">
                                            Trays
                                          </th>
                                          <th className="p-4 text-right">
                                            Loose
                                          </th>
                                          <th className="p-4 text-right">
                                            Price/Kg
                                          </th>
                                          <th className="p-4 text-right">
                                            Total Price
                                          </th>
                                          <th className="p-4 text-center">
                                            Actions
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody className="divide-y divide-gray-200">
                                        {bill.items.map((it) => {
                                          const edit = editing[it.id];
                                          const isEditing = !!edit;
                                          const isSaving = !!savingIds[it.id];

                                          return (
                                            <tr
                                              key={it.id}
                                              className="hover:bg-gray-50 transition"
                                            >
                                              <td className="p-4 font-medium">
                                                {it.varietyCode || "-"}
                                              </td>

                                              <td className="p-4 text-right">
                                                {isEditing ? (
                                                  <Input
                                                    value={edit.noTrays}
                                                    onChange={(e) =>
                                                      onNumberChange(
                                                        it.id,
                                                        "noTrays",
                                                        e.target.value,
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
                                                    {n(it.noTrays)}
                                                  </span>
                                                )}
                                              </td>

                                              <td className="p-4 text-right">
                                                {isEditing ? (
                                                  <Input
                                                    value={edit.loose}
                                                    onChange={(e) =>
                                                      onNumberChange(
                                                        it.id,
                                                        "loose",
                                                        e.target.value,
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
                                                    step="0.1"
                                                  />
                                                ) : (
                                                  <span className="font-medium">
                                                    {n(it.loose).toFixed(1)}
                                                  </span>
                                                )}
                                              </td>

                                              <td className="p-4 text-right">
                                                {isEditing ? (
                                                  <Input
                                                    value={edit.pricePerKg}
                                                    onChange={(e) =>
                                                      onNumberChange(
                                                        it.id,
                                                        "pricePerKg",
                                                        e.target.value,
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
                                                    {n(it.pricePerKg).toFixed(
                                                      2,
                                                    )}
                                                  </span>
                                                )}
                                              </td>

                                              <td className="p-4 text-right font-bold text-green-600">
                                                {isEditing ? (
                                                  <Input
                                                    value={edit.totalPrice}
                                                    readOnly
                                                    className="w-32 text-right bg-green-50 font-bold"
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
                                                      onClick={() =>
                                                        startEdit(it)
                                                      }
                                                    >
                                                      <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="text-red-600 hover:bg-red-50"
                                                      onClick={() =>
                                                        openDeleteItemDialog(it)
                                                      }
                                                    >
                                                      <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <div className="flex justify-center gap-2">
                                                    <Button
                                                      size="sm"
                                                      onClick={() =>
                                                        saveRow(it)
                                                      }
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
                                                      onClick={() =>
                                                        cancelEdit(it.id)
                                                      }
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
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-500">
                    Showing{" "}
                    <span className="font-medium text-gray-900">
                      {(page - 1) * PAGE_SIZE + 1}
                    </span>{" "}
                    –{" "}
                    <span className="font-medium text-gray-900">
                      {Math.min(page * PAGE_SIZE, bills.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-900">
                      {bills.length}
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

      {/* Add Variety Dialog */}
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

            <div className="mt-3 space-y-3 sm:col-span-2">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Variety * {varietiesFetching ? "(refreshing...)" : ""}
                </div>

                <Select
                  value={addVarietyCode}
                  onValueChange={(code) => {
                    setAddVarietyCode(code);
                    setAddTrays(0);
                    setAddLoose(0);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {availableVarieties.map((v) => (
                      <SelectItem key={v.code} value={v.code}>
                        {v.code} ({v.netTrays} trays)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="mt-2 text-sm text-slate-700">
                  {availableVarieties.find((v) => v.code === addVarietyCode)
                    ?.name || "—"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Trays
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    value={addTrays}
                    disabled={!addVarietyCode}
                    onChange={(e) =>
                      setAddTrays(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Loose
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    value={addLoose}
                    disabled={!addVarietyCode}
                    onChange={(e) =>
                      setAddLoose(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
              </div>
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
      {/* ── Hidden printable content ── */}
      <div className="hidden">
        {bills.map((bill) => (
          <div
            key={bill.id}
            id={`print-bill-${bill.id}`}
            className="print-container"
          >
            {/* Header */}
            <div className="header">
              <div className="logo">
                <img
                  src="/assets/favicon.png" // ← confirm this path works
                  alt="RS Fisheries Logo"
                  className="w-full h-auto"
                />
              </div>

              <div className="center">
                <h1>RS FISHERIES PVT LTD</h1>
                <p className="contact">
                  Hyderabad, Telangana - 500081
                  <br />
                  Phone: +919494288997, +919440011704
                  <br />
                  Email: n.vamsikiran4@gmail.com
                </p>
              </div>

              <div className="address">
                <strong>Office Address:</strong>
                <br />
                3rd floor, Above Varun Bajaj showroom,ViP Hills, 100 feet Road
                Madhapur, Hyderabad 500081 India
              </div>
            </div>

            <hr />

            <div className="title">Billing</div>

            <div className="meta">
              <div className="meta-row">
                <div>
                  <strong>Bill No:</strong> {bill.billNo || "—"}
                </div>
                <div>
                  <strong>Date:</strong>{" "}
                  {bill.date
                    ? new Date(bill.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : new Date().toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                </div>
              </div>

              <div>
                <strong>Party:</strong> {bill.clientName || "—"}
                {bill.village && ` • Village: ${bill.village}`}
                {bill.vehicleNo && ` • Vehicle: ${bill.vehicleNo}`}
              </div>
            </div>

            <table className="items-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Variety</th>
                  <th>Trays</th>
                  <th>Loose (kg)</th>
                  <th>Price/Kg</th>
                  <th>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.varietyCode || "—"}</td>
                    <td>{n(item.noTrays)}</td>
                    <td>{n(item.loose).toFixed(1)}</td>
                    <td>{n(item.pricePerKg).toFixed(2)}</td>
                    <td>{n(item.totalPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-bold">
                    Grand Total
                  </td>
                  <td className="font-bold">{n(bill.totalPrice).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
