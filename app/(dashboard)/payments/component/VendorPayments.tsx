"use client";

import React, { useState, useEffect } from "react";
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
  totalDue: number;
  totalPaid: number;
  remaining: number;
  latestLoadingId: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  bankAddress?: string;
};

const currency = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

export function VendorPayments() {
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentdetails, setPaymentdetails] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState("");
  const [installmentNumber, setInstallmentNumber] = useState("");
  const [accNo, setAccNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  const { data: vendorData = [], isLoading: loadingVendors } = useQuery<
    VendorRow[]
  >({
    queryKey: ["vendors-with-due"],
    queryFn: async () => {
      const [formerRes, agentRes, paymentsRes] = await Promise.all([
        axios.get("/api/former-loading"),
        axios.get("/api/agent-loading"),
        axios.get("/api/payments/vendor"),
      ]);

      const farmers: any[] = formerRes.data?.data || [];
      const agents: any[] = agentRes.data?.data || [];
      const payments: any[] = paymentsRes.data?.data || [];

      const allLoadings = [...farmers, ...agents];

      if (allLoadings.length === 0) return [];

      const vendorMap = new Map<
        string,
        {
          name: string;
          source: "farmer" | "agent";
          loadingIds: string[];
          latestLoadingId: string;
          totalDue: number;
          accountNumber?: string;
          ifsc?: string;
          bankName?: string;
          bankAddress?: string;
        }
      >();

      allLoadings.forEach((load: any) => {
        const name = (load.FarmerName || load.agentName || "").trim();
        if (!name) return;

        const source: "farmer" | "agent" = load.FarmerName ? "farmer" : "agent";
        const loadingId = load.id;
        const due = Number(load.grandTotal || 0);

        const key = `${source}:${name.toLowerCase()}`;

        if (!vendorMap.has(key)) {
          vendorMap.set(key, {
            name,
            source,
            loadingIds: [loadingId],
            latestLoadingId: loadingId,
            totalDue: due,
            accountNumber: load.accountNumber || undefined,
            ifsc: load.ifsc || undefined,
            bankName: load.bankName || undefined,
            bankAddress: load.bankAddress || undefined,
          });
        } else {
          const existing = vendorMap.get(key)!;
          existing.totalDue += due;
          existing.loadingIds.push(loadingId);
          existing.latestLoadingId = loadingId;
        }
      });

      const paidMap = new Map<string, number>();
      payments.forEach((p: any) => {
        const vid = p.vendorId;
        if (vid) {
          paidMap.set(vid, (paidMap.get(vid) || 0) + Number(p.amount || 0));
        }
      });

      const vendorPaidMap = new Map<string, number>();
      for (const [key, vendor] of vendorMap) {
        let totalPaid = 0;
        for (const lid of vendor.loadingIds) {
          totalPaid += paidMap.get(`${vendor.source}:${lid}`) || 0;
        }
        vendorPaidMap.set(key, totalPaid);
      }

      const result: VendorRow[] = [];
      for (const [key, vendor] of vendorMap) {
        const totalPaid = vendorPaidMap.get(key) || 0;
        const remaining = vendor.totalDue - totalPaid;

        if (remaining > 0) {
          result.push({
            id: `${vendor.source}:${vendor.latestLoadingId}`,
            name: vendor.name,
            source: vendor.source,
            totalDue: vendor.totalDue,
            totalPaid,
            remaining,
            latestLoadingId: vendor.latestLoadingId,
            accountNumber: vendor.accountNumber,
            ifsc: vendor.ifsc,
            bankName: vendor.bankName,
            bankAddress: vendor.bankAddress,
          });
        }
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 30_000,
  });

  const selectedVendor = vendorData.find((v) => v.id === vendorId);

  const totalDue = selectedVendor?.totalDue || 0;
  const paidAmount = selectedVendor?.totalPaid || 0;
  const remaining = selectedVendor?.remaining || 0;

  useEffect(() => {
    if (paymentMode === "ac" && selectedVendor) {
      setAccNo(selectedVendor.accountNumber || "");
      setIfsc(selectedVendor.ifsc || "");
      setBankName(selectedVendor.bankName || "");
      setBankAddress(selectedVendor.bankAddress || "");
    } else {
      setAccNo("");
      setIfsc("");
      setBankName("");
      setBankAddress("");
    }
  }, [paymentMode, selectedVendor]);

  const validateForm = () => {
    if (!vendorId) return "Please select a vendor";
    if (!amount || Number(amount) <= 0) return "Enter a valid amount";
    if (Number(amount) > remaining)
      return `Amount cannot exceed remaining due of ${currency(remaining)}`;

    // NO OTHER FIELDS ARE REQUIRED

    if (isInstallment) {
      const totalIns = Number(installments);
      const thisIns = Number(installmentNumber);
      if (totalIns > 0 && !Number.isInteger(totalIns))
        return "Total installments must be a whole number";
      if (thisIns > 0 && !Number.isInteger(thisIns))
        return "Installment number must be a whole number";
      if (totalIns > 0 && thisIns > 0 && thisIns > totalIns)
        return "Installment number cannot exceed total installments";
    }

    return null;
  };

  const saveMutation = useMutation({
    mutationFn: (payload: any) => axios.post("/api/payments/vendor", payload),
    onSuccess: () => {
      toast.success("Vendor payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["vendors-with-due"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save payment");
    },
  });

  const handleSave = () => {
    const error = validateForm();
    if (error) return toast.error(error);

    if (!selectedVendor) return;

    const payload = {
      source: selectedVendor.source,
      sourceRecordId: selectedVendor.latestLoadingId,
      vendorName: selectedVendor.name,
      date,
      amount: Number(amount),
      paymentMode: paymentMode.toUpperCase(),
      referenceNo: referenceNo.trim() || null,
      paymentRef: paymentRef.trim() || null,
      accountNumber: paymentMode === "ac" ? accNo.trim() || null : null,
      ifsc: paymentMode === "ac" ? ifsc.trim().toUpperCase() || null : null,
      bankName: paymentMode === "ac" ? bankName.trim() || null : null,
      bankAddress: paymentMode === "ac" ? bankAddress.trim() || null : null,
      paymentdetails: paymentdetails.trim() || null,
      isInstallment,
      installments: isInstallment ? Number(installments) || null : null,
      installmentNumber: isInstallment
        ? Number(installmentNumber) || null
        : null,
    };

    saveMutation.mutate(payload);
  };

  const resetForm = () => {
    setVendorId("");
    setAmount("");
    setPaymentdetails("");
    setReferenceNo("");
    setPaymentRef("");
    setIsInstallment(false);
    setInstallments("");
    setInstallmentNumber("");
    setAccNo("");
    setIfsc("");
    setBankName("");
    setBankAddress("");
    setPaymentMode("cash");
  };

  const handleReset = () => {
    resetForm();
    setDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <CardCustom
      title="Vendor Payments"
      actions={
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[#139BC3] text-white hover:bg-[#1088AA]"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Payment"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      }
    >
      <div className="py-4 sm:py-6">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Vendor Selection - Your Original Design */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-end">
              <div className="lg:col-span-6 space-y-2">
                <Label className="text-slate-700">Vendor Name</Label>
                <Select
                  value={vendorId}
                  onValueChange={setVendorId}
                  disabled={loadingVendors}
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm">
                    <SelectValue
                      placeholder={
                        loadingVendors
                          ? "Loading vendors..."
                          : "Select a vendor with pending dues"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200">
                    {vendorData.length === 0 ? (
                      <div className="px-6 py-4 text-center text-slate-500">
                        {loadingVendors
                          ? "Loading..."
                          : "No vendors with pending payments"}
                      </div>
                    ) : (
                      vendorData.map((v) => (
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
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-medium text-slate-600">
                    Total Due
                  </p>
                  <p className="mt-1 font-bold text-slate-900 text-xl sm:text-2xl">
                    {currency(totalDue)}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-medium text-slate-600">
                    Remaining
                  </p>
                  <p className="mt-1 font-bold text-emerald-600 text-xl sm:text-2xl">
                    {currency(remaining)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/^\d*\.?\d*$/.test(value)) return;
                    const num = value === "" ? 0 : parseFloat(value);
                    if (selectedVendor && num > remaining) {
                      toast.error(
                        `Amount cannot exceed remaining due of ${currency(
                          remaining
                        )}`
                      );
                      return;
                    }
                    setAmount(value);
                  }}
                  placeholder="100000"
                  className="h-11 font-mono text-lg"
                />
                {selectedVendor && remaining > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Maximum allowed: {currency(remaining)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="flex flex-wrap gap-2">
                  {(["cash", "ac", "upi", "cheque"] as const).map((m) => (
                    <Badge
                      key={m}
                      onClick={() => setPaymentMode(m)}
                      className={`cursor-pointer px-4 py-2 rounded-full border transition ${
                        paymentMode === m
                          ? "bg-[#139BC3] text-white border-[#139BC3]"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      {m === "ac"
                        ? "A/C Transfer"
                        : m === "upi"
                        ? "UPI/PhonePe"
                        : m.charAt(0).toUpperCase() + m.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Details (Optional)</Label>
                <Input
                  placeholder="Any note"
                  value={paymentdetails}
                  onChange={(e) => setPaymentdetails(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Optional References */}
            {paymentMode !== "ac" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>Reference No (Optional)</Label>
                    <Input
                      placeholder="e.g. PAY2025-001"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="h-11 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {paymentMode === "upi"
                        ? "UPI Transaction ID (Optional)"
                        : paymentMode === "cheque"
                        ? "Cheque Number (Optional)"
                        : "Cash Receipt No (Optional)"}
                    </Label>
                    <Input
                      placeholder={
                        paymentMode === "upi" ? "UTR / TXN ID" : "123456"
                      }
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="h-11 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Optional Bank Details */}
            {paymentMode === "ac" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Bank Transfer Details (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={accNo}
                      onChange={(e) => setAccNo(e.target.value)}
                      className="h-11 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      className="h-11 uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch Address</Label>
                    <Input
                      value={bankAddress}
                      onChange={(e) => setBankAddress(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-600">Total Due</p>
                  <p className="mt-1 font-bold text-slate-900 text-xl">
                    {currency(totalDue)}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-600">Paid</p>
                  <p className="mt-1 font-bold text-slate-900 text-xl">
                    {currency(paidAmount)}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-600">Remaining</p>
                  <p className="mt-1 font-bold text-emerald-600 text-xl">
                    {currency(remaining)}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-600">Paying Now</p>
                  <p className="mt-1 font-bold text-[#139BC3] text-xl">
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
