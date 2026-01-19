// app/(dashboard)/payments/component/DispatchPayment.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Truck,
  Snowflake,
  Trash2,
  AlertTriangle,
  Loader2,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIMARY = "#139BC3";

type LoadingItem = {
  id: string;
  totalPrice?: number | null;
};

type ClientLoading = {
  id: string;
  clientName?: string | null;
  billNo?: string | null;
  totalPrice?: number | null;
  items?: LoadingItem[];
  vehicleId?: string | null;
  vehicleNo?: string | null;
};

type DispatchCharge = {
  id: string;
  type: "ICE_COOLING" | "TRANSPORT" | "OTHER";
  label?: string | null;
  amount: number;
  notes?: string | null;
  createdAt: string;
  sourceRecordId: string;
};

type PackingAmount = {
  id: string;
  totalAmount: number;
};

const currency = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
type PaymentMode = "CASH" | "AC" | "UPI" | "CHEQUE";

interface ClientBill {
  id: string;
  billNo: string;
  clientName?: string;
}

const DEFAULT_ICE_PRICE = 200;

const isNumericInput = (value: string) => /^\d*\.?\d*$/.test(value);

export const DispatchPayment = () => {
  const [bills, setBills] = useState<ClientBill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);

  const [selectedBillId, setSelectedBillId] = useState<string>("");

  const [iceBlocks, setIceBlocks] = useState<number>(0);
  const [icePrice, setIcePrice] = useState<number>(DEFAULT_ICE_PRICE);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [reference, setReference] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [sourceRecordId, setSourceRecordId] = useState<string>("");

  // Inputs
  const [iceAmount, setIceAmount] = useState<string>("");
  const [transportAmount, setTransportAmount] = useState<string>("");
  const [otherLabel, setOtherLabel] = useState<string>("");
  const [otherAmount, setOtherAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const resetForm = () => {
    setIceAmount("");
    setTransportAmount("");
    setOtherLabel("");
    setOtherAmount("");
    setNotes("");
  };

  /**
   * Loadings (Client only)
   * - also filters out loadings that already have at least 1 dispatch charge
   */
  const { data: loadings = [], isLoading: loadingLoadings } = useQuery({
    queryKey: ["dispatch-pending-loadings"],
    queryFn: async () =>
      axios
        .get("/api/client-loading?stage=DISPATCH_PENDING")
        .then((res) => res.data?.data || []),
  });
  /* ---------------------- FETCH CLIENT LOADINGS ---------------------- */
  useEffect(() => {
    loadBills();
  }, []);
  const loadBills = async () => {
    try {
      setLoadingBills(true);
      const res = await fetch("/api/client-loading?stage=PACKING_PENDING");

      const json = await res.json();
      setBills(json.data || []);
    } catch (e) {
      toast.error("Failed to load client bills");
      setBills([]);
    } finally {
      setLoadingBills(false);
    }
  };
  /* ---------------------- AUTO TOTAL CALC ---------------------- */
  const totalAmount = useMemo(() => {
    if (iceBlocks <= 0 || icePrice <= 0) return 0;
    return iceBlocks * icePrice;
  }, [iceBlocks, icePrice]);

  const selectedLoading = useMemo(() => {
    return loadings.find((l: ClientLoading) => l.id === sourceRecordId) || null;
  }, [loadings, sourceRecordId]);

  const hasVehicle = useMemo(() => {
    if (!selectedLoading) return false;
    return Boolean(
      (selectedLoading.vehicleId && selectedLoading.vehicleId.trim()) ||
        (selectedLoading.vehicleNo && selectedLoading.vehicleNo.trim())
    );
  }, [selectedLoading]);

  const { data: dispatchCharges = [] } = useQuery<DispatchCharge[]>({
    queryKey: ["dispatch-charges", sourceRecordId],
    queryFn: () =>
      axios
        .get(`/api/payments/dispatch?sourceRecordId=${sourceRecordId}`)
        .then((res) => (res.data?.data || []) as DispatchCharge[]),
    enabled: !!sourceRecordId,
  });

  const { data: packingAmounts = [] } = useQuery<PackingAmount[]>({
    queryKey: ["packing-amounts", sourceRecordId],
    queryFn: () =>
      axios
        .get(`/api/payments/packing-amount?sourceRecordId=${sourceRecordId}`)
        .then((res) => (res.data?.data || []) as PackingAmount[]),
    enabled: !!sourceRecordId,
  });

  const totalDispatchCharges = useMemo(() => {
    return dispatchCharges.reduce((sum, c) => sum + safeNum(c.amount), 0);
  }, [dispatchCharges]);

  const totalPackingAmount = useMemo(() => {
    return packingAmounts.reduce((sum, p) => sum + safeNum(p.totalAmount), 0);
  }, [packingAmounts]);

  const itemsTotalPrice = useMemo(() => {
    const items = selectedLoading?.items || [];
    return items.reduce(
      (s: number, it: LoadingItem) => s + safeNum(it.totalPrice),
      0
    );
  }, [selectedLoading]);

  const baseAmount = useMemo(() => {
    const apiTotalPrice = safeNum(selectedLoading?.totalPrice);
    return apiTotalPrice > 0 ? apiTotalPrice : itemsTotalPrice;
  }, [selectedLoading, itemsTotalPrice]);

  const netAmount = baseAmount + totalDispatchCharges + totalPackingAmount;

  const canSubmit = totalPackingAmount > 0;

  const mutation = useMutation({
    mutationFn: (payload: {
      sourceRecordId: string;
      type: "ICE_COOLING" | "TRANSPORT" | "OTHER";
      amount: number;
      label?: string;
      notes?: string | null;
    }) => axios.post("/api/payments/dispatch", payload),
  });

  const handleSaveAll = async () => {
    if (!sourceRecordId) return toast.error("Select a loading");

    if (!canSubmit) {
      toast.error("Cannot save dispatch charges", {
        description: "At least one packing amount must be recorded first.",
      });
      return;
    }

    const charges: Array<{
      sourceRecordId: string;
      type: "ICE_COOLING" | "TRANSPORT" | "OTHER";
      amount: number;
      label?: string;
      notes?: string | null;
    }> = [];

    if (iceAmount) {
      charges.push({
        sourceRecordId,
        type: "ICE_COOLING",
        amount: safeNum(iceAmount),
        notes: notes.trim() || null,
      });
    }

    // ✅ Only allow TRANSPORT if vehicle exists
    if (transportAmount) {
      if (!hasVehicle) {
        toast.error("Transport charge not allowed", {
          description: "Vehicle not assigned for this loading.",
        });
        return;
      }
      charges.push({
        sourceRecordId,
        type: "TRANSPORT",
        amount: safeNum(transportAmount),
        notes: notes.trim() || null,
      });
    }

    if (otherAmount || otherLabel.trim()) {
      if (!otherLabel.trim()) return toast.error("Other label required");
      if (!otherAmount) return toast.error("Other amount required");
      charges.push({
        sourceRecordId,
        type: "OTHER",
        label: otherLabel.trim(),
        amount: safeNum(otherAmount),
        notes: notes.trim() || null,
      });
    }

    if (charges.length === 0) return toast.error("Enter at least one charge");

    try {
      await Promise.all(charges.map((c) => mutation.mutateAsync(c)));

      toast.success(`${charges.length} charge(s) added!`);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dispatch-charges", sourceRecordId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["packing-amounts", sourceRecordId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dispatch-pending-loadings"],
        }),
      ]);

      resetForm();
      setSourceRecordId("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add charge");
    }
  };

  const displayLoadingAmount = (l: ClientLoading) => {
    const apiTotalPrice = safeNum(l.totalPrice);
    if (apiTotalPrice > 0) return apiTotalPrice;

    const items = l.items || [];
    return items.reduce((s, it) => s + safeNum(it.totalPrice), 0);
  };
  /* ---------------------- SAVE ---------------------- */
  const handleSave = async () => {
    if (iceBlocks <= 0) {
      toast.error("Enter number of ice blocks");
      return;
    }
    if (icePrice <= 0) {
      toast.error("Ice block price must be greater than 0");
      return;
    }
    // if (paymentMode !== "CASH" && !reference.trim()) {
    //   toast.error("Reference is required for non-cash payments");
    //   return;
    // }
    if (!selectedBillId) {
      toast.error("Please select a client bill");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/payments/packing-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "loading",
          sourceType: selectedBillId ? "CLIENT" : null,
          sourceRecordId: selectedBillId || null,
          workers: iceBlocks, // reuse existing column safely
          temperature: icePrice, // store price per block
          totalAmount,
          paymentMode,
          reference: reference.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      toast.success("Ice blocks amount saved");
      loadBills();
      await queryClient.invalidateQueries({
        queryKey: ["dispatch-pending-loadings"],
      });

      // reset
      setSelectedBillId("");
      setIceBlocks(0);
      setIcePrice(DEFAULT_ICE_PRICE);
      setPaymentMode("CASH");
      setReference("");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <CardCustom title="Ice Blocks Amount">
        <div className="space-y-6">
          {/* MODE (ONLY LOADING) */}
          <div>
            <Badge className="bg-[#139BC3] text-white px-5 py-2 rounded-full text-sm">
              Loading
            </Badge>
          </div>

          {/* FORM */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 space-y-6">
            {/* GRID: Mobile = 1 column, Tablet = 2, Desktop = 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* BILL */}
              <div className="space-y-2">
                <Label className="text-sm">Client Bill (optional)</Label>
                {loadingBills ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading bills...
                  </div>
                ) : (
                  <Select
                    value={selectedBillId}
                    onValueChange={setSelectedBillId}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select bill (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {bills.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{b.billNo}</span>
                            <span className="text-xs text-slate-500">
                              {b.clientName || "Unknown Client"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* ICE BLOCK COUNT */}
              <div className="space-y-2">
                <Label className="text-sm">Number of Ice Blocks</Label>
                <Input
                  type="number"
                  min={0}
                  value={iceBlocks}
                  onChange={(e) =>
                    setIceBlocks(Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder="e.g. 10"
                  className="h-11"
                />
              </div>

              {/* PRICE PER BLOCK */}
              <div className="space-y-2">
                <Label className="text-sm">Price per Ice Block (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={icePrice}
                  onChange={(e) =>
                    setIcePrice(Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder="e.g. 200"
                  className="h-11"
                />
              </div>
            </div>

            {/* TOTAL AMOUNT - Full width */}
            <div className="space-y-2">
              <Label className="text-sm">Total Ice Amount (₹)</Label>
              <Input
                value={totalAmount}
                readOnly
                className="h-14 text-2xl font-bold bg-slate-50 text-center sm:text-left"
              />
            </div>

            {/* PAYMENT MODE */}
            <div className="space-y-3">
              <Label className="text-sm">Payment Mode</Label>
              <div className="flex flex-wrap gap-3">
                {(["CASH", "AC", "UPI", "CHEQUE"] as const).map((pm) => (
                  <Badge
                    key={pm}
                    onClick={() => {
                      setPaymentMode(pm);
                      if (pm === "CASH") setReference("");
                    }}
                    className={`cursor-pointer px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                      paymentMode === pm
                        ? "bg-[#139BC3] text-white border-[#139BC3]"
                        : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {pm === "CASH" && "Cash"}
                    {pm === "AC" && "A/C Transfer"}
                    {pm === "UPI" && "UPI / PhonePe"}
                    {pm === "CHEQUE" && "Cheque"}
                  </Badge>
                ))}
              </div>
            </div>

            {/* REFERENCE - Only if not CASH */}
            {paymentMode !== "CASH" && (
              <div className="space-y-2">
                <Label className="text-sm">Reference</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={
                    paymentMode === "UPI"
                      ? "UPI Transaction ID"
                      : paymentMode === "CHEQUE"
                      ? "Cheque Number"
                      : "Bank Reference / UTR"
                  }
                  className="h-11"
                />
              </div>
            )}
            {/* ACTION BUTTONS - Optimized for Mobile */}
            <div className="mt-8 space-y-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className=" bg-[#139BC3] hover:bg-[#1088AA] h-12 text-base font-medium shadow-md md:mr-3"
                size="lg"
              >
                <Save className="h-5 w-5 mr-2" />
                {saving ? "Saving..." : "Save Ice Amount"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setIceBlocks(0);
                  setIcePrice(DEFAULT_ICE_PRICE);
                  setSelectedBillId("");
                  setPaymentMode("CASH");
                  setReference("");
                }}
                className=" h-12 text-base font-medium border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                size="lg"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </CardCustom>

      <CardCustom
        title="Dispatch Charges Management"
        actions={
          <Button
            onClick={() => {
              setSourceRecordId("");
              resetForm();
            }}
            variant="outline"
            className="border-slate-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        }
      >
        <div className="space-y-8 py-6">
          {/* Loading Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <Label className="text-lg font-medium text-slate-800">
              Select Client Loading
            </Label>

            <Select
              value={sourceRecordId}
              onValueChange={setSourceRecordId}
              disabled={loadingLoadings}
            >
              <SelectTrigger className="mt-3 h-12 text-base">
                <SelectValue
                  placeholder={
                    loadingLoadings ? "Loading records..." : "Choose a loading"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {loadings.map((l: ClientLoading) => (
                  <SelectItem key={l.id} value={l.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{l.clientName || "-"}</span>
                      <div className="flex items-center gap-3 ml-4">
                        <Badge variant="secondary">#{l.billNo}</Badge>
                        <span className="font-bold" style={{ color: PRIMARY }}>
                          {currency(displayLoadingAmount(l))}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Totals Dashboard */}
          {selectedLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <p className="text-sm text-slate-600">Total Price (Fish)</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {currency(baseAmount)}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <p className="text-sm text-amber-700">Dispatch Charges</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">
                  {currency(totalDispatchCharges)}
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-center">
                <p className="text-sm text-indigo-700">Ice</p>
                <p className="text-2xl font-bold text-indigo-600 mt-2">
                  {currency(totalPackingAmount)}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center">
                <p className="text-sm font-medium text-emerald-800">
                  Net Receivable from Client
                </p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  {currency(netAmount)}
                </p>
              </div>
            </div>
          )}

          {/* Add Charges UI */}
          {sourceRecordId && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-6">
                Add Dispatch Charges
              </h3>

              {!canSubmit && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Packing amount required
                    </p>
                    <p className="text-sm text-yellow-700">
                      Please record at least one packing amount before adding
                      dispatch charges.
                    </p>
                  </div>
                </div>
              )}

              <div
                className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${
                  hasVehicle ? "lg:grid-cols-3" : "lg:grid-cols-2"
                }`}
              >
                {/* Ice */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Snowflake className="w-6 h-6 text-cyan-600" />
                    <Label className="text-lg font-medium">Ice Packing</Label>
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter amount"
                    value={iceAmount}
                    onChange={(e) =>
                      isNumericInput(e.target.value) &&
                      setIceAmount(e.target.value)
                    }
                    className="h-12 text-lg font-mono"
                  />
                </div>

                {/* ✅ Transport only if vehicle exists */}
                {hasVehicle && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Truck className="w-6 h-6 text-orange-600" />
                      <Label className="text-lg font-medium">Transport</Label>
                    </div>
                    <Input
                      type="text"
                      placeholder="Enter amount"
                      value={transportAmount}
                      onChange={(e) =>
                        isNumericInput(e.target.value) &&
                        setTransportAmount(e.target.value)
                      }
                      className="h-12 text-lg font-mono"
                    />
                    <p className="text-xs text-slate-500">
                      Vehicle:{" "}
                      <span className="font-medium">
                        {selectedLoading?.vehicleNo ||
                          selectedLoading?.vehicleId}
                      </span>
                    </p>
                  </div>
                )}

                {/* Other */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-purple-600" />
                    <Label className="text-lg font-medium">Other Charge</Label>
                  </div>
                  <Input
                    placeholder="Label (e.g. Hamali, Toll)"
                    value={otherLabel}
                    onChange={(e) => setOtherLabel(e.target.value)}
                    className="h-12"
                  />
                  <Input
                    type="text"
                    placeholder="Enter amount"
                    value={otherAmount}
                    onChange={(e) =>
                      isNumericInput(e.target.value) &&
                      setOtherAmount(e.target.value)
                    }
                    className="h-12 text-lg font-mono mt-3"
                  />
                </div>
              </div>

              <div className="mt-6">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Shared notes for all charges"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  size="lg"
                  onClick={handleSaveAll}
                  disabled={mutation.isPending || !canSubmit}
                  className={`text-lg px-8 ${
                    canSubmit
                      ? "bg-[#139BC3] hover:bg-[#1088AA]"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {mutation.isPending ? "Saving..." : "Save All Charges"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardCustom>
    </div>
  );
};
