// app/(dashboard)/payments/component/VendorPayments.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type PaymentMode = "cash" | "ac" | "upi" | "cheque";

type VendorRow = {
  id: string; // vendorId used by backend: `${source}:${loadingId}`
  name: string;
  source: "farmer" | "agent";
  billNos: string[];
  loadingIds: string[]; // keep all loading ids
  latestLoadingId: string; // used for saving payment
  totalDue: number;

  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  bankAddress?: string;
};

type VendorPayment = {
  id: string;
  vendorId: string; // MUST MATCH vendorRow.id
  vendorName: string;
  source: string;
  date: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string | null;
  paymentRef?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;
  paymentdetails?: string | null;
  isInstallment?: boolean;
  createdAt?: string;
};

const currency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    v
  );

export function VendorPayments() {
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentdetails, setPaymentdetails] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // Bank fields
  const [accNo, setAccNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  // ✅ Vendors list
  const { data: vendorData = [], isLoading: loadingVendors } = useQuery<
    VendorRow[]
  >({
    queryKey: ["vendors"],
    queryFn: async () => {
      const [fRes, aRes] = await Promise.all([
        axios.get("/api/former-loading"),
        axios.get("/api/agent-loading"),
      ]);

      const farmers = (fRes.data?.data || []) as any[];
      const agents = (aRes.data?.data || []) as any[];

      // group by source+name for display, but keep latestLoadingId for payments
      const map = new Map<string, VendorRow>();

      [...farmers, ...agents].forEach((item: any) => {
        const name = (item.FarmerName || item.agentName || "").trim();
        if (!name) return;

        const source: "farmer" | "agent" = item.FarmerName ? "farmer" : "agent";

        // IMPORTANT: loading id exists as item.id
        const loadingId = String(item.id || "").trim();
        if (!loadingId) return;

        const billNo = String(item.billNo || "").trim();

        const total =
          item.items?.reduce(
            (s: number, i: any) => s + Number(i.totalPrice || 0),
            0
          ) || Number(item.grandTotal || 0);

        const displayKey = `${source}:${name}`; // grouping key (for dropdown)
        const vendorBackendId = `${source}:${loadingId}`; // backend vendorId format

        if (!map.has(displayKey)) {
          map.set(displayKey, {
            id: vendorBackendId, // ✅ this MUST match payments.vendorId
            name,
            source,
            billNos: billNo ? [billNo] : [],
            loadingIds: [loadingId],
            latestLoadingId: loadingId,
            totalDue: total,
            accountNumber: item.accountNumber,
            ifsc: item.ifsc,
            bankName: item.bankName,
            bankAddress: item.bankAddress,
          });
        } else {
          const existing = map.get(displayKey)!;
          existing.totalDue += total;
          if (billNo) existing.billNos.push(billNo);
          existing.loadingIds.push(loadingId);

          // choose latest as last seen (or use date compare if you want)
          existing.latestLoadingId = loadingId;
          existing.id = `${source}:${existing.latestLoadingId}`; // keep backend id aligned
        }
      });

      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    },
  });

  // ✅ Payments list
  const { data: payments = [] } = useQuery<VendorPayment[]>({
    queryKey: ["vendor-payments"],
    queryFn: () =>
      axios.get("/api/payments/vendor").then((res) => res.data?.data || []),
  });

  const selected = vendorData.find((v) => v.id === vendorId);

  // ✅ Paid amount updates immediately because it reads from react-query cache
  const paidAmount = useMemo(() => {
    if (!vendorId) return 0;
    return payments
      .filter((p) => p.vendorId === vendorId)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments, vendorId]);

  const totalDue = selected?.totalDue || 0;
  const remaining = Math.max(0, totalDue - paidAmount);

  // Auto-fill bank details
  useEffect(() => {
    if (paymentMode === "ac" && selected) {
      setAccNo(selected.accountNumber || "");
      setIfsc(selected.ifsc || "");
      setBankName(selected.bankName || "");
      setBankAddress(selected.bankAddress || "");
    } else {
      setAccNo("");
      setIfsc("");
      setBankName("");
      setBankAddress("");
    }
  }, [paymentMode, selected]);

  const validateForm = () => {
    if (!vendorId) return "Select a vendor";
    if (!amount || Number(amount) <= 0) return "Enter valid amount";
    if (Number(amount) > remaining) return "Amount exceeds remaining";

    if (paymentMode !== "ac") {
      if (!referenceNo.trim()) return "Reference No is required";
      if (
        (paymentMode === "upi" || paymentMode === "cheque") &&
        !paymentRef.trim()
      ) {
        return paymentMode === "upi" ? "UPI ID required" : "Cheque No required";
      }
    }

    if (paymentMode === "ac") {
      if (!accNo.trim()) return "Account number required";
      if (!ifsc.trim()) return "IFSC required";
      if (!bankName.trim()) return "Bank name required";
    }

    return null;
  };

  // ✅ Mutation: optimistic update cache so Paid/Remaining changes instantly
  const saveMutation = useMutation({
    mutationFn: (payload: any) => axios.post("/api/payments/vendor", payload),
    onSuccess: (res, variables) => {
      toast.success("Payment saved successfully!");

      // 🔥 Optimistically update list cache
      queryClient.setQueryData(["vendor-payments"], (old: any) => {
        const prev: VendorPayment[] = Array.isArray(old) ? old : [];
        const newRow: VendorPayment = {
          id: res.data?.data?.id || `temp-${Date.now()}`,
          vendorId: variables.vendorId,
          vendorName: variables.vendorName,
          source: variables.source,
          date: variables.date,
          amount: Number(variables.amount),
          paymentMode: variables.paymentMode,
          referenceNo: variables.referenceNo ?? null,
          paymentRef: variables.paymentRef ?? null,
          accountNumber: variables.accountNumber ?? null,
          ifsc: variables.ifsc ?? null,
          bankName: variables.bankName ?? null,
          bankAddress: variables.bankAddress ?? null,
          paymentdetails: variables.paymentdetails ?? null,
          isInstallment: Boolean(variables.isInstallment ?? false),
          createdAt: new Date().toISOString(),
        };
        return [newRow, ...prev];
      });

      // Also refetch to ensure DB truth
      queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
      resetForm();
    },
    onError: (err: any) => {
      console.error("Save error:", err.response?.data || err);
      toast.error(err.response?.data?.message || "Failed to save");
    },
  });

  const handleSave = () => {
    const error = validateForm();
    if (error) return toast.error(error);
    if (!selected) return toast.error("Select a vendor");

    const billNoToSend = selected.billNos?.[selected.billNos.length - 1] || "";

    // ✅ If your backend supports billNo fallback, send it.
    // ✅ Also send vendorId so optimistic UI can match.
    saveMutation.mutate({
      vendorId: selected.id, // for cache matching
      source: selected.source,
      billNo: billNoToSend, // fallback
      sourceRecordId: selected.latestLoadingId, // if your backend still expects it, this makes it 100% valid
      vendorName: selected.name,
      date,
      amount: Number(amount),
      paymentMode,
      referenceNo,
      paymentRef,

      accountNumber: accNo,
      ifsc,
      bankName,
      bankAddress,
      paymentdetails,

      isInstallment: isPartialPayment,
    });
  };

  const resetForm = () => {
    setAmount("");
    setPaymentdetails("");
    setReferenceNo("");
    setPaymentRef("");
    setIsPartialPayment(false);
    setAccNo("");
    setIfsc("");
    setBankName("");
    setBankAddress("");
  };

  const handleReset = () => {
    setVendorId("");
    resetForm();
    setPaymentMode("cash");
  };

  return (
    <CardCustom
      title="Vendor Payments"
      actions={
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || loadingVendors}
            className="bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Payment"}
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      }
    >
      <div className="py-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Top section */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              {/* Vendor Select */}
              <div className="lg:col-span-6 space-y-2">
                <Label className="text-slate-700">
                  Vendor (Farmer / Agent)
                </Label>
                <Select
                  value={vendorId}
                  onValueChange={setVendorId}
                  disabled={loadingVendors}
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                    <SelectValue
                      placeholder={
                        loadingVendors ? "Loading..." : "Select vendor"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent className="border-slate-200">
                    {vendorData.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="py-3">
                        <div className="flex justify-between items-center w-full gap-4">
                          <div className="min-w-0">
                            <span className="font-medium text-slate-800 truncate">
                              {v.name}
                            </span>
                          </div>

                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {v.source}
                          </Badge>

                          <span className="text-sm font-semibold text-[#139BC3]">
                            {currency(v.totalDue)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Totals */}
              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-medium text-slate-600">
                    Total Due
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {currency(totalDue)}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-medium text-slate-600">
                    Remaining
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {currency(remaining)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Amount</Label>
                <Input
                  type="text"
                  value={amount}
                  onChange={(e) =>
                    /^\d*\.?\d*$/.test(e.target.value) &&
                    setAmount(e.target.value)
                  }
                  placeholder="100000"
                  className="h-11 border-slate-200 bg-white shadow-sm font-mono text-lg focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Payment Mode</Label>
                <div className="flex flex-wrap gap-2">
                  {(["cash", "ac", "upi", "cheque"] as const).map((m) => {
                    const selected = paymentMode === m;
                    return (
                      <Badge
                        key={m}
                        onClick={() => setPaymentMode(m)}
                        className={[
                          "cursor-pointer select-none px-4 py-2 rounded-full border transition",
                          selected
                            ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {m === "ac"
                          ? "A/C Transfer"
                          : m === "upi"
                          ? "UPI/PhonePe"
                          : m.charAt(0).toUpperCase() + m.slice(1)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">
                  Payment Details (Optional)
                </Label>
                <Input
                  placeholder="Any note"
                  value={paymentdetails}
                  onChange={(e) => setPaymentdetails(e.target.value)}
                  className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                />
              </div>
            </div>

            {/* Conditional fields */}
            {paymentMode !== "ac" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700">
                      Reference No <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. PAY2025-001"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="h-11 border-slate-200 bg-white shadow-sm font-mono focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">
                      {paymentMode === "upi"
                        ? "UPI Transaction ID"
                        : paymentMode === "cheque"
                        ? "Cheque Number"
                        : "Cash Receipt No"}
                      {paymentMode !== "cash" && (
                        <span className="text-rose-600"> *</span>
                      )}
                    </Label>
                    <Input
                      placeholder={
                        paymentMode === "upi" ? "UTR / TXN ID" : "123456"
                      }
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="h-11 border-slate-200 bg-white shadow-sm font-mono focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMode === "ac" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Bank Transfer Details
                  </h3>
                  <span className="text-xs text-slate-500">
                    Fill only if A/C Transfer selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Account Number</Label>
                    <Input
                      type="text"
                      value={accNo}
                      onChange={(e) => setAccNo(e.target.value)}
                      className="h-11 border-slate-200 bg-white shadow-sm font-mono focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">IFSC Code</Label>
                    <Input
                      type="text"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      className="h-11 border-slate-200 bg-white shadow-sm uppercase focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">Bank Name</Label>
                    <Input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">Branch Address</Label>
                    <Input
                      type="text"
                      value={bankAddress}
                      onChange={(e) => setBankAddress(e.target.value)}
                      className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment type */}
            <div className="mt-8">
              <Label className="text-base font-semibold text-slate-900">
                Payment Type
              </Label>

              <div className="flex flex-col lg:flex-row lg:items-center gap-4 mt-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPartialPayment(false)}
                    className={[
                      "px-5 py-2 rounded-full border text-sm font-semibold transition",
                      !isPartialPayment
                        ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    Full Payment
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPartialPayment(true)}
                    className={[
                      "px-5 py-2 rounded-full border text-sm font-semibold transition",
                      isPartialPayment
                        ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    Partial Payment
                  </button>
                </div>

                {isPartialPayment && (
                  <div className="text-sm text-slate-700">
                    Paying{" "}
                    <span className="font-semibold text-slate-900">
                      {currency(Number(amount) || 0)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">
                      {currency(totalDue)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-600">
                    Total Due
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {currency(totalDue)}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-600">Paid</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {currency(paidAmount)}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-600">
                    Remaining
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-600">
                    {currency(remaining)}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-600">
                    Paying Now
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#139BC3]">
                    {currency(Number(amount) || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
