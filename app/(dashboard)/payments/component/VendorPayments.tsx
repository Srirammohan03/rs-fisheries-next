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
  id: string;
  name: string;
  source: "farmer" | "agent";
  billNos: string[];
  loadingIds: string[];
  latestLoadingId: string;
  totalDue: number; // ← Now correctly = grandTotal (what you owe vendor)

  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  bankAddress?: string;
};

type VendorPayment = {
  id: string;
  vendorId: string;
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
  // const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [isPartial, setIsPartial] = useState(false);
  const [accNo, setAccNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  const { data: vendorData = [], isLoading: loadingVendors } = useQuery<
    VendorRow[]
  >({
    queryKey: ["vendors-with-due"],
    queryFn: async () => {
      // Fetch loadings and payments in parallel
      const [formerRes, agentRes, paymentRes] = await Promise.all([
        axios.get("/api/former-loading"),
        axios.get("/api/agent-loading"),
        axios.get("/api/payments/vendor"),
      ]);

      const farmers = (formerRes.data?.data || []) as any[];
      const agents = (agentRes.data?.data || []) as any[];
      const payments = (paymentRes.data?.data || []) as any[];

      // Step 1: Build map of total owed per vendor (grouped by source:name)
      const vendorMap = new Map<
        string,
        {
          name: string;
          source: "farmer" | "agent";
          billNos: string[];
          loadingIds: string[];
          latestLoadingId: string;
          totalDue: number;
          accountNumber?: string;
          ifsc?: string;
          bankName?: string;
          bankAddress?: string;
        }
      >();

      [...farmers, ...agents].forEach((item: any) => {
        const name = (item.FarmerName || item.agentName || "").trim();
        if (!name) return;

        const source: "farmer" | "agent" = item.FarmerName ? "farmer" : "agent";
        const loadingId = String(item.id || "").trim();
        if (!loadingId) return;

        const billNo = String(item.billNo || "").trim();
        const totalOwed = Number(item.grandTotal || 0);

        const key = `${source}:${name.toLowerCase()}`;

        if (!vendorMap.has(key)) {
          vendorMap.set(key, {
            name,
            source,
            billNos: billNo ? [billNo] : [],
            loadingIds: [loadingId],
            latestLoadingId: loadingId,
            totalDue: totalOwed,
            accountNumber: item.accountNumber || undefined,
            ifsc: item.ifsc || undefined,
            bankName: item.bankName || undefined,
            bankAddress: item.bankAddress || undefined,
          });
        } else {
          const existing = vendorMap.get(key)!;
          existing.totalDue += totalOwed;
          if (billNo) existing.billNos.push(billNo);
          existing.loadingIds.push(loadingId);
          existing.latestLoadingId = loadingId;
        }
      });

      // Step 2: Calculate total paid per vendor using vendorId
      const paidMap = new Map<string, number>();

      payments.forEach((p: any) => {
        const vendorId = p.vendorId; // format: "farmer:uuid" or "agent:uuid"
        if (!vendorId) return;
        const amount = Number(p.amount || 0);
        paidMap.set(vendorId, (paidMap.get(vendorId) || 0) + amount);
      });

      // Step 3: Build final list with remaining > 0
      const result: VendorRow[] = [];

      for (const [key, vendor] of vendorMap) {
        // Find total paid for this vendor (check all loadingIds since payments use specific loadingId)
        let totalPaid = 0;
        for (const loadingId of vendor.loadingIds) {
          const fullVendorId = `${vendor.source}:${loadingId}`;
          totalPaid += paidMap.get(fullVendorId) || 0;
        }

        const remaining = vendor.totalDue - totalPaid;

        if (remaining > 0) {
          result.push({
            id: `${vendor.source}:${vendor.latestLoadingId}`, // keep latest as id for selection
            name: vendor.name,
            source: vendor.source,
            billNos: vendor.billNos,
            loadingIds: vendor.loadingIds,
            latestLoadingId: vendor.latestLoadingId,
            totalDue: vendor.totalDue,
            accountNumber: vendor.accountNumber,
            ifsc: vendor.ifsc,
            bankName: vendor.bankName,
            bankAddress: vendor.bankAddress,
          });
        }
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 30, // optional: cache for 30 seconds
  });

  const { data: payments = [] } = useQuery<VendorPayment[]>({
    queryKey: ["vendor-payments"],
    queryFn: () =>
      axios.get("/api/payments/vendor").then((res) => res.data?.data || []),
  });

  const selected = vendorData.find((v) => v.id === vendorId);

  const paidAmount = useMemo(() => {
    if (!vendorId) return 0;
    return payments
      .filter((p) => p.vendorId === vendorId)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments, vendorId]);

  const totalDue = selected?.totalDue || 0;
  const remaining = Math.max(0, totalDue - paidAmount);

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
    if (Number(amount) > remaining) return "Amount exceeds remaining due";

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

  const saveMutation = useMutation({
    mutationFn: (payload: any) => axios.post("/api/payments/vendor", payload),
    onSuccess: () => {
      toast.success("Payment saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save payment");
    },
  });

  const handleSave = () => {
    const error = validateForm();
    if (error) return toast.error(error);
    if (!selected) return;

    const billNoToSend = selected.billNos?.[selected.billNos.length - 1] || "";

    saveMutation.mutate({
      source: selected.source,
      sourceRecordId: selected.latestLoadingId,
      billNo: billNoToSend,
      vendorName: selected.name,
      date,
      amount: Number(amount),
      paymentMode: paymentMode.toUpperCase(),
      referenceNo: referenceNo || null,
      paymentRef: paymentRef || null,
      accountNumber: paymentMode === "ac" ? accNo : null,
      ifsc: paymentMode === "ac" ? ifsc : null,
      bankName: paymentMode === "ac" ? bankName : null,
      bankAddress: paymentMode === "ac" ? bankAddress : null,
      paymentdetails: paymentdetails || null,
      // isInstallment: isPartialPayment,
    });
  };

  const resetForm = () => {
    setAmount("");
    setPaymentdetails("");
    setReferenceNo("");
    setPaymentRef("");
    // setIsPartialPayment(false);
    setIsPartial(false);
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 w-full sm:w-auto">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || loadingVendors}
            className="w-full sm:w-auto bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Payment"}
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      }
    >
      <div className="py-4 sm:py-6">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Top section */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-end">
              {/* Vendor Select */}
              <div className="lg:col-span-6 space-y-2 min-w-0">
                <Label className="text-slate-700">
                  Vendor (Farmer / Agent)
                </Label>

                <Select
                  value={vendorId}
                  onValueChange={setVendorId}
                  disabled={loadingVendors}
                >
                  <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                    <SelectValue
                      placeholder={
                        loadingVendors ? "Loading..." : "Select vendor"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent className="border-slate-200">
                    {vendorData.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="py-3">
                        <div className="flex items-center justify-between w-full gap-3 min-w-0">
                          <span className="font-medium text-slate-800 truncate">
                            {v.name}
                          </span>

                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {v.source}
                          </Badge>

                          <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#139BC3]">
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center overflow-hidden">
                  <p className="text-xs font-medium text-slate-600">
                    Total Due
                  </p>
                  <p className="mt-1 font-bold text-slate-900 tabular-nums text-xl sm:text-2xl truncate">
                    {currency(totalDue)}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center overflow-hidden">
                  <p className="text-xs font-medium text-slate-600">
                    Remaining
                  </p>
                  <p className="mt-1 font-bold text-emerald-600 tabular-nums text-xl sm:text-2xl truncate">
                    {currency(remaining)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
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
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Bank Transfer Details
                  </h3>
                  <span className="text-xs text-slate-500">
                    Fill only if A/C Transfer selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

              <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4 mt-3">
                <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsPartial(false)}
                    className={[
                      "w-full sm:w-auto px-5 py-2 rounded-full border text-sm font-semibold transition",
                      !isPartial
                        ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    Full Payment
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPartial(true)}
                    className={[
                      "w-full sm:w-auto px-5 py-2 rounded-full border text-sm font-semibold transition",
                      isPartial
                        ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    Partial Payment
                  </button>
                </div>

                {isPartial && (
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

            {/* Summary (✅ 1 by 1 on mobile) */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center">
                <div className="rounded-xl bg-white border border-slate-200 p-4 overflow-hidden">
                  <p className="text-xs font-medium text-slate-600">
                    Total Due
                  </p>
                  <p className="mt-1 font-bold text-slate-900 tabular-nums text-lg sm:text-xl truncate">
                    {currency(totalDue)}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4 overflow-hidden">
                  <p className="text-xs font-medium text-slate-600">Paid</p>
                  <p className="mt-1 font-bold text-slate-900 tabular-nums text-lg sm:text-xl truncate">
                    {currency(paidAmount)}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4 overflow-hidden">
                  <p className="text-xs font-medium text-slate-600">
                    Remaining
                  </p>
                  <p className="mt-1 font-bold text-emerald-600 tabular-nums text-lg sm:text-xl truncate">
                    {currency(remaining)}
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4 overflow-hidden">
                  <p className="text-xs font-medium text-slate-600">
                    Paying Now
                  </p>
                  <p className="mt-1 font-bold text-[#139BC3] tabular-nums text-lg sm:text-xl truncate">
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
