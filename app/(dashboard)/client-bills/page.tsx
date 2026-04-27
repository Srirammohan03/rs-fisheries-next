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
  pendingBalance?: number;
}

interface ClientRecord {
  id: string;
  billNo?: string;
  date?: string;
  clientId?: string;
  clientName?: string;
  vehicleNo?: string;
  vehicleId?: string | null;
  village?: string;
  localVehicle?: string;
  items: ClientItem[];
  createdAt?: string;

  totalKgs?: number;
  totalPrice?: number;
  grandTotal?: number;

  dispatchChargesTotal?: number;
  packingAmountTotal?: number;
  pendingBalance?: number;

  dispatchCharges?: {
    type: string;
    label?: string | null;
    amount: number;
  }[];

  packingAmounts?: {
    id: string;
    totalAmount: number;
  }[];

  dispatchBreakdown?: {
    iceCooling: number;
    transportCharges: number;
    otherCharges: {
      label?: string;
      amount: number;
    }[];
    dispatchChargesTotal: number;
  };
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
  id: string;
  billNo: string;
  clientName: string;
  date: string;
  createdAt: string;
  vehicleNo?: string;
  village?: string;
  localVehicle?: string;
  hasVehicle: boolean;
  clientId?: string;
  items: UIItem[];

  varietyCount: number;
  uniqueVarietyCount: number;
  totalTrays: number;
  totalPrice: number;
  pendingBalance?: number;

  dispatchChargesTotal?: number;
  packingAmountTotal?: number;

  dispatchCharges?: {
    type: string;
    label?: string | null;
    amount: number;
  }[];

  packingAmounts?: {
    id: string;
    totalAmount: number;
  }[];

  dispatchBreakdown: {
    iceCooling: number;
    transportCharges: number;
    otherCharges: {
      label?: string;
      amount: number;
    }[];
    dispatchChargesTotal: number;
  };

  grandTotal?: number;
};

const fetchClientLoadings = async (): Promise<ClientRecord[]> => {
  const res = await axios.get("/api/client-loading");
  return (res.data?.data ?? []) as ClientRecord[];
};

function n(v: unknown): number {
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : 0;
}

//  backend matching rule
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
  const [payments, setPayments] = useState<any[]>([]);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<UIItem | null>(
    null,
  );
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
  const [clientBalances, setClientBalances] = useState<Record<string, number>>(
    {},
  );
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

    const loadData = async () => {
      try {
        setLoading(true);
        const paymentsRes = await axios.get("/api/payments/client");

        if (mounted) {
          setPayments(paymentsRes.data?.data ?? []);
        }
        const data = await fetchClientLoadings();
        if (!mounted) return;

        setRecords(data);

        await fetchClientBalances(data); // ⭐ IMPORTANT
      } catch {
        toast.error("Failed to load client bills");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);
  const fetchClientBalances = async (records: ClientRecord[]) => {
    const balances: Record<string, number> = {};

    const uniqueClientIds = [
      ...new Set(records.map((r) => r.clientId).filter(Boolean)),
    ] as string[];

    await Promise.all(
      uniqueClientIds.map(async (id) => {
        try {
          const res = await axios.get(`/api/client/${id}`);
          balances[id] = res.data?.data?.pendingBalance ?? 0;
        } catch {
          balances[id] = 0;
        }
      }),
    );

    setClientBalances(balances);
  };
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

  //  Build bill rows (ONE ROW PER BILL)
  const bills: BillRow[] = useMemo(() => {
    const base: BillRow[] = records.map((rec) => {
      const hasVehicle =
        Boolean(rec.vehicleId) || Boolean((rec.vehicleNo || "").trim());
      const pendingBalance = rec.clientId
        ? (clientBalances[rec.clientId] ?? 0)
        : 0;
      const items: UIItem[] = (rec.items || []).map((it) => {
        const totalKgs = n(it.totalKgs);
        const pricePerKg = n(it.pricePerKg);
        //  ensure UI uses correct totalPrice if backend didn't send it
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
          pendingBalance,
        };
      });

      //  ALWAYS SUM ITEMS (this fixes your mismatch)
      const computedTotal = Number(
        items.reduce((sum, it) => sum + n(it.totalPrice), 0).toFixed(2),
      );
      const pending = calculatePreviousPending(
        rec.clientId!,
        rec.id,
        records,
        payments,
      );

      const grandTotal =
        computedTotal +
        n(rec.dispatchChargesTotal) +
        n(rec.packingAmountTotal) +
        n(pending);
      const totalTrays = items.reduce((sum, it) => sum + n(it.noTrays), 0);
      const varietyCount = items.length;
      const uniqueVarietyCount = new Set(
        items.map((it) => (it.varietyCode || "").trim().toUpperCase()),
      ).size;

      return {
        id: rec.id,
        clientId: rec.clientId,
        billNo: rec.billNo || "-",
        clientName: rec.clientName || "Unknown",
        date: rec.date?.split("T")[0] || "",
        createdAt: rec.createdAt || rec.date || "",
        vehicleNo: rec.vehicleNo,
        village: rec.village,
        localVehicle: rec.localVehicle,
        hasVehicle,

        items,

        varietyCount,
        uniqueVarietyCount,
        totalTrays,

        totalKgs: n(rec.totalKgs),
        totalPrice: computedTotal,

        pendingBalance,

        dispatchChargesTotal: n(rec.dispatchChargesTotal),
        packingAmountTotal: n(rec.packingAmountTotal),
        grandTotal,

        dispatchCharges: rec.dispatchCharges || [],
        packingAmounts: rec.packingAmounts || [],

        dispatchBreakdown: rec.dispatchBreakdown || {
          iceCooling: 0,
          transportCharges: 0,
          otherCharges: [],
          dispatchChargesTotal: 0,
        },
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
        const localVehicleMatch = (b.localVehicle || "")
          .toLowerCase()
          .includes(term);
        return billMatch || nameMatch || varietyMatch || localVehicleMatch;
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
  }, [records, clientBalances, searchTerm, sortOrder, fromDate, toDate]);

  //  map itemId -> item for preview calculations
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

  //  recompute preview based on backend formula
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
      const totalKgs = n(item.totalKgs); //  use totalKgs (not grandTotal logic)
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
      toast.success("Updated ");
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

  // FRONTEND — replace ONLY inside confirmDeleteItem()

  // REPLACE YOUR FULL confirmDeleteItem FUNCTION ONLY

  const confirmDeleteItem = async () => {
    if (deletingItem || !deleteItemTarget?.id) return;

    try {
      setDeletingItem(true);

      // Correct API route
      const meRes = await axios.get("/api/me");
      const userRole = meRes.data?.user?.role?.toLowerCase?.() || "";

      // Find bill
      const bill = bills.find((b) => b.id === deleteItemTarget.loadingId);

      // LAST ITEM IN BILL
      if (bill && bill.items.length === 1) {
        // ADMIN → direct delete
        if (userRole === "admin") {
          const res = await axios.delete(
            `/api/client-bills/item/${deleteItemTarget.id}`,
          );

          await refreshRecords();

          if (res.data?.deletedBill) {
            toast.success("Last item deleted • Bill removed");
          } else {
            toast.success("Item deleted");
          }

          closeDeleteItemDialog();
          return;
        }

        // NON-ADMIN → OTP
        await axios.post("/api/client-bills/send-delete-otp", {
          billId: bill.id,
          itemId: deleteItemTarget.id,
          source: "CLIENT", // REQUIRED
        });

        setPendingDeleteItem(deleteItemTarget);
        setOtpDialogOpen(true);
        setDeleteItemOpen(false);

        toast.success("OTP sent to admin Gmail");
        return;
      }

      // NORMAL DELETE (not last item)
      const res = await axios.delete(
        `/api/client-bills/item/${deleteItemTarget.id}`,
      );

      await refreshRecords();

      if (res.data?.deletedBill) {
        toast.success("Item deleted • Bill removed");
      } else {
        toast.success("Item deleted");
      }

      closeDeleteItemDialog();
    } catch (e: any) {
      console.error("DELETE ERROR:", e);

      toast.error(e?.response?.data?.message || e?.message || "Delete failed");
    } finally {
      setDeletingItem(false);
    }
  };
  const verifyOtpAndDelete = async () => {
    if (!pendingDeleteItem || !otpCode) {
      return toast.error("Enter OTP");
    }

    try {
      setOtpLoading(true);

      await axios.post("/api/client-bills/verify-delete-otp", {
        itemId: pendingDeleteItem.id,
        otp: otpCode,
      });

      toast.success("OTP verified • Bill deleted");

      setOtpDialogOpen(false);
      setOtpCode("");
      setPendingDeleteItem(null);

      await refreshRecords();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
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
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Cinzel+Decorative:wght@700&display=swap" rel="stylesheet">
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
  align-items: center;
}

/* Left */
.logo {
  width: 120px;
}

.logo img {
  width: 100%;
  height: auto;
}

/* Center */
.center {
  flex: 1;
  text-align: center;
}

/* Right */
.address {
  flex: 0 0 200px; /* same as left */
  text-align: right;
  font-size: 12px;
  line-height: 1.5;
}
   .address strong {
            font-size: 13px;
          }
.company-short {
font-family: 'Cinzel', cursive;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #1f5f8b;
  margin: 0;
}

.company-full {
font-family: 'Cinzel', cursive;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin: 0;
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
            text-align: center;
          }
          td {
            text-align: center;
          }
          td:last-child {
            text-align: right;
          }
          tfoot td {
            background: #f9fafb;
            font-weight: bold;
             text-align: right;
          }
             tfoot td:nth-child(3) {
             text-align: center;
             }

            .bill-header-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:8px;
  font-size:13px;
}

.bill-title{
  text-align:center;
  font-weight:bold;
  font-size:16px;
}

.bill-left{
  width:30%;
}

.bill-right{
  width:30%;
  text-align:right;
}


.farmer-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 14px;
  width: 100%;
}

.farmer-row-left {
  flex: 0 0 38%;
  min-width: 0;
  text-align: left;
  font-size: 13px;
  line-height: 1.4;
}

.farmer-row-center {
  flex: 0 0 32%;
  min-width: 0;
  text-align: left;
  font-size: 13px;
  line-height: 1.4;
}

.farmer-row-right {
  flex: 0 0 26%;
  min-width: 220px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 6px;
  text-align: right;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
}

.farmer-row-right strong {
  flex-shrink: 0;
}

.farmer-row-right span {
  flex-shrink: 0;
}

.items-table{
  width:100%;
  border-collapse:collapse;
}

.items-table th,
.items-table td{
  border:1.5px solid #000;
  padding:8px;
}

.items-table th{
  background:#f3f4f6;
  
}
.net-amount-row {
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.grand-total {
  font-size: 16px;
  font-weight: 700;
  color: #111;
  border-top: 2px solid #000;
  padding-top: 8px;
}
.totals-section{
  display:flex;
  justify-content:space-between;
  margin-top:10px;
  font-size:14px;
}

.amounts{
  text-align:right;
}
.charges-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  padding-right: 40px; /* 👈 gives little right gap like your image */
}

.amount-section {
  width: 320px; /* 👈 controls how tight it looks */
}
.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin: 2px 0;
}

.right {
  display: grid;
  grid-template-columns: 10px 110px; /* 👈 fixed alignment */
  align-items: center;
}

.value {
  text-align: right;
}


.amount-row span:nth-child(3) {
  text-align: center;
}

.amount-row span:nth-child(4) {
  text-align: right;
}

.grand-total {
  font-size: 15px;
  font-weight: 700;
  border-top: 2px solid #000;
  padding-top: 6px;
  margin-top: 6px;
}
.vehicle-line {
  display: inline-block;
  width: 150px; 
  border-bottom: 1.5px solid #000;
  margin-left: 8px;
  height: 12px;
}
.net-amount{
  margin-top:6px;
}
  .net-amount-row, .balance-row{
  width:100%;
  text-align:right;
  margin-top:8px;
  font-size:14px;
  font-weight:bold;
  margin-right:8px;
}
  .print-wrapper {
  position: relative;
  z-index: 1;
}

.bill-body {
  position: relative;
  padding-top: 10px;
}

/* Watermark */
.watermark {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60%;
  opacity: 0.1;
  z-index: 0;
  pointer-events: none;
}

/* Keep content above watermark */
.bill-body > * {
 
  z-index: 2;
}
        </style>
      </head>
  <body>
  <div class="print-wrapper">
    ${printContent.innerHTML}
  </div>
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

      toast.success("Variety added to bill ");
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
  function calculatePreviousPending(
    clientId: string,
    currentBillId: string,
    records: ClientRecord[],
    payments: any[], // pass payments here
  ) {
    const clientBills = records
      .filter((r) => r.clientId === clientId)
      .sort(
        (a, b) =>
          new Date(a.createdAt || a.date || "").getTime() -
          new Date(b.createdAt || b.date || "").getTime(),
      );

    let totalLoadings = 0;

    for (const bill of clientBills) {
      if (bill.id === currentBillId) break;

      const itemTotal = Number(bill.totalPrice || 0);
      const dispatch = Number(bill.dispatchChargesTotal || 0);
      const packing = Number(bill.packingAmountTotal || 0);

      if (dispatch > 0 || packing > 0) {
        totalLoadings += itemTotal + dispatch + packing;
      } else {
        totalLoadings += itemTotal;
      }
    }

    const totalPayments = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    return Math.max(0, totalLoadings - totalPayments);
  }
  const sortOtherCharges = (
    charges: { label?: string; amount: number }[] = [],
  ) => {
    const priority: Record<string, number> = {
      "Local transport": 1,
      Commission: 2,
      "Other charges": 3,
    };

    return [...charges].sort((a, b) => {
      const aPriority = priority[a.label || ""] ?? 999;
      const bPriority = priority[b.label || ""] ?? 999;

      return aPriority - bPriority;
    });
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
              {/*  Mobile */}
              <div className="mt-6 grid grid-cols-1 gap-4 md:hidden">
                {paginatedBills.map((bill) => {
                  const open = !!expandedBills[bill.id];

                  return (
                    <div
                      key={bill.id}
                      className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                    >
                      {/* HEADER */}
                      <button
                        type="button"
                        onClick={() => toggleBill(bill.id)}
                        className="w-full flex items-start justify-between gap-4"
                      >
                        <div className="text-left space-y-1">
                          <div className="text-base font-semibold text-gray-900">
                            {bill.billNo}
                          </div>
                          <div className="text-sm text-gray-600">
                            {bill.clientName}
                          </div>

                          {bill.date && (
                            <div className="text-xs text-gray-500">
                              {bill.date}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Trays</div>
                            <div className="font-semibold text-gray-900">
                              {bill.totalTrays}
                            </div>
                          </div>
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

                      {/* TOTAL + PRINT */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="text-lg font-bold text-green-600">
                            {n(bill.totalPrice).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>

                        {bill.totalPrice > 0 &&
                          bill.items.every((it) => n(it.pricePerKg) > 0) && (
                            <Button
                              size="sm"
                              onClick={() => handlePrint(bill.id)}
                              className="h-9 px-4 border-green-600 text-green-700 bg-green-50 hover:bg-green-100"
                            >
                              Print
                            </Button>
                          )}
                      </div>

                      {/* EXPANDED */}
                      {open && (
                        <div className="space-y-4 pt-3 border-t">
                          <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
                            {bill.vehicleNo && (
                              <>Vehicle: {bill.vehicleNo} • </>
                            )}
                            {bill.localVehicle && (
                              <>Local Vehicle: {bill.localVehicle} • </>
                            )}
                            {bill.village && <>Address: {bill.village}</>}
                          </div>

                          <div className="space-y-3">
                            {bill.items.map((it) => {
                              const edit = editing[it.id];
                              const isEditing = !!edit;
                              const isSaving = !!savingIds[it.id];

                              return (
                                <div
                                  key={it.id}
                                  className="rounded-xl border bg-white p-4 space-y-3"
                                >
                                  {/* ITEM HEADER */}
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="text-sm font-semibold">
                                        {it.varietyCode || "-"}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Total:{" "}
                                        <span className="font-semibold text-green-700">
                                          {isEditing
                                            ? n(edit.totalPrice).toLocaleString(
                                                "en-IN",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                },
                                              )
                                            : n(it.totalPrice).toLocaleString(
                                                "en-IN",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                },
                                              )}
                                        </span>
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

                                  {/* INPUT GRID */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">
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
                                          className="h-10"
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
                                      <div className="text-xs text-gray-500 mb-1">
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
                                          className="h-10"
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
                                      <div className="text-xs text-gray-500 mb-1">
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
                                          className="h-10"
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

              {/*  Desktop */}
              <div className="mt-6 hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] table-auto">
                  <thead className="bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Bill No / Client</th>
                      <th className="p-4 text-right">Trays</th>
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
                            <td className="p-4 text-right font-semibold text-gray-900">
                              {bill.totalTrays}
                            </td>{" "}
                            <td className="p-4 text-right">
                              <div className="font-semibold text-gray-900">
                                {bill.varietyCount}
                              </div>
                            </td>
                            <td className="p-4 text-right font-bold text-green-600">
                              {n(bill.totalPrice).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
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
                              <td colSpan={5} className="p-4">
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
                                      {bill.localVehicle ? (
                                        <>
                                          {" "}
                                          <span className="text-gray-400">
                                            •
                                          </span>{" "}
                                          Local Vehicle: {bill.localVehicle}
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
                                    {/* {open &&
                                      bill.totalPrice > 0 &&
                                      bill.items.every(
                                        (it) => n(it.pricePerKg) > 0,
                                      ) && (
                                        <div className="mt-4 flex justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handlePrint(bill.id)}
                                            className="border-green-600 text-green-700 hover:bg-green-50"
                                          >
                                            <Download className="w-4 h-4 mr-2" />
                                            Print Bill
                                          </Button>
                                        </div>
                                      )}
                                    <div className="text-sm font-semibold text-green-700">
                                      Total: {n(bill.totalPrice).toFixed(2)}
                                    </div> */}
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
                                                  n(
                                                    it.totalPrice,
                                                  ).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })
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
        {bills.map((bill) => {
          // Only payments for this specific client
          const totalClientPayments = payments
            .filter((p) => p.clientId?.toString() === bill.clientId?.toString())
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

          // Previous balance before current bill
          const oldBalance = calculatePreviousPending(
            bill.clientId!,
            bill.id,
            records,
            payments,
          );

          // Payment applied to old balance first
          const paymentAfterOldBalance = Math.max(
            0,
            totalClientPayments - oldBalance,
          );

          // Remaining only for CURRENT bill
          const remainingAmount = Math.max(
            0,
            n(bill.totalPrice) +
              n(bill.packingAmountTotal) +
              n(bill.dispatchChargesTotal) -
              paymentAfterOldBalance,
          );

          return (
            <div
              key={bill.id}
              id={`print-bill-${bill.id}`}
              className="print-container"
            >
              {/* Header */}
              <div className="header">
                {/* Logo */}
                <div className="logo">
                  <img
                    src="/assets/printlogo.jpeg"
                    alt="RS Fisheries Logo"
                    className="logo-img"
                  />
                </div>

                {/* Company Name */}
                <div className="center">
                  <h1 className="company-short">RSF</h1>
                  <h2 className="company-full">Rama Satyanarayana Fisheries</h2>
                </div>

                {/* Address */}
                <div className="address">
                  <strong>Office Address</strong>
                  <p>
                    NH16, Jio Petrol Pump
                    <br />
                    Golden Ice Factory
                    <br />
                    Kovuru, Nellore - 524366
                  </p>
                </div>
              </div>

              <hr />
              <div className="bill-header-row">
                <div className="bill-left">
                  <strong>Bill No:</strong> {bill.billNo || "—"}
                </div>

                <div className="bill-title">ESTIMATION / BILLING</div>

                <div className="bill-right">
                  <strong>Date:</strong>{" "}
                  {bill.date
                    ? new Date(bill.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : ""}
                </div>
              </div>
              <hr />
              {/* <div className="title">Estimation Billing</div> */}

              <div className="bill-body">
                <div className="meta">
                  <div className="farmer-row">
                    <div className="farmer-row-left">
                      <strong>Client:</strong> {bill.clientName || "—"}
                    </div>

                    <div className="farmer-row-center">
                      <strong>Address:</strong> {bill.village}
                    </div>

                    <div className="farmer-row-right">
                      <strong>Vehicle No:</strong>{" "}
                      <span>{bill.localVehicle || " "}</span>
                    </div>
                  </div>
                  {/* <div>
                <strong>Party:</strong> {bill.clientName || "—"}
                {bill.village && ` • Village: ${bill.village}`}
                {bill.vehicleNo && ` • Vehicle: ${bill.vehicleNo}`}
              </div> */}
                </div>
                <img src="/assets/bg-fish.png" className="watermark" />
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
                        {/* <td>{n(item.totalPrice).toFixed(2)}</td>
                         */}
                        <td>
                          {n(item.totalPrice).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      {/* Total trays label */}
                      <td></td>
                      <td className="text-right font-semibold">
                        Total Trays :
                      </td>

                      <td className="text-center font-semibold">
                        {bill.items.reduce(
                          (sum, it) => sum + (it.noTrays || 0),
                          0,
                        )}
                      </td>
                      <td></td>

                      {/* bill label */}
                      <td className="text-right font-semibold">
                        Bill Amount :
                      </td>

                      {/* bill value */}
                      <td className="text-right font-semibold">
                        {n(bill.totalPrice).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Charges Summary */}
                <div className="charges-wrapper">
                  <div className="amount-section pr-4 text-sm">
                    {bill.grandTotal !== bill.totalPrice && (
                      <div className="amount-row">
                        <span>Bill Amount</span>
                        <div className="right">
                          <span>:</span>
                          <span className="value">
                            {n(bill.totalPrice).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}
                    {n(bill.packingAmountTotal) > 0 && (
                      <div className="amount-row">
                        <span>Ice</span>
                        <div className="right">
                          <span>:</span>
                          <span className="value">
                            {n(bill.packingAmountTotal).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}
                    {bill.dispatchBreakdown?.iceCooling > 0 && (
                      <div className="amount-row">
                        <span>Packing Charges</span>
                        <div className="right">
                          <span>:</span>
                          {/* <span>₹</span> */}
                          <span className="value">
                            {n(
                              bill.dispatchBreakdown.iceCooling,
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}
                    {bill.dispatchBreakdown?.transportCharges > 0 && (
                      <div className="amount-row">
                        <span>Local Transport</span>
                        <div className="right">
                          <span>:</span>
                          {/* <span>₹</span> */}
                          <span className="value">
                            {n(
                              bill.dispatchBreakdown.transportCharges,
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}
                    {sortOtherCharges(bill.dispatchBreakdown?.otherCharges).map(
                      (charge, index) => (
                        <div key={index} className="amount-row">
                          <span>{charge.label || "Other Charges"}</span>
                          <div className="right">
                            <span>:</span>
                            {/* <span>₹</span> */}
                            <span className="value">
                              {n(charge.amount).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                    <div className="amount-row">
                      <span>Old Balance</span>
                      <div className="right">
                        <span>:</span>
                        {/* <span>₹</span> */}
                        <span className="value">
                          {calculatePreviousPending(
                            bill.clientId!,
                            bill.id,
                            records,
                            payments,
                          ).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="amount-row grand-total">
                      <span>Grand Total</span>
                      <div className="right">
                        <span>:</span>
                        {/* <span>₹</span> */}
                        <span className="value">
                          {n(bill.grandTotal).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="amount-row grand-total">
                      <span>Remaining Amount</span>
                      <div className="right">
                        <span>:</span>
                        <span className="value">
                          {Math.max(
                            0,
                            // Current full bill including all charges
                            n(bill.totalPrice) +
                              n(bill.packingAmountTotal) +
                              n(bill.dispatchChargesTotal) -
                              // Payments ONLY for this exact bill
                              payments
                                .filter(
                                  (p) =>
                                    p.clientId?.toString() ===
                                    bill.id.toString(),
                                )
                                .reduce(
                                  (sum, p) => sum + Number(p.amount || 0),
                                  0,
                                ),
                          ).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify OTP</DialogTitle>
            <DialogDescription>
              Last item deletion requires email OTP verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Enter OTP"
              value={otpCode}
              maxLength={6}
              onChange={(e) => setOtpCode(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOtpDialogOpen(false);
                setOtpCode("");
              }}
            >
              Cancel
            </Button>

            <Button onClick={verifyOtpAndDelete} disabled={otpLoading}>
              {otpLoading ? "Verifying..." : "Verify & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
