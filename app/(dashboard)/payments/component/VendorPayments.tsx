// app/(dashboard)/payments/component/VendorPayments.tsx
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
type VendorSource = "farmer" | "agent";

type Vendor = {
  id: string;
  name: string;
  source: VendorSource;
  totalDue: number;
  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;
};

const currency = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(v);

export function VendorPayments() {
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentdetails, setPaymentdetails] = useState(""); // ← renamed from note
  const [referenceNo, setReferenceNo] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(2);
  const [installmentNo, setInstallmentNo] = useState(1);
  const [externalRef, setExternalRef] = useState(""); // UPI ID / Cheque No
  // Bank fields
  const [accNo, setAccNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  const { data: vendorData, isLoading: loadingVendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const [fRes, aRes] = await Promise.all([
        axios.get("/api/former-loading"),
        axios.get("/api/agent-loading"),
      ]);

      const farmers = (fRes.data?.data || []) as any[];
      const agents = (aRes.data?.data || []) as any[];

      const map = new Map<string, Vendor>();

      farmers.forEach((item: any) => {
        const name = (item.FarmerName ?? "").toString().trim();
        if (!name) return;
        const key = `farmer:${name}`;
        const total =
          item.items?.reduce(
            (s: number, i: any) => s + Number(i.totalPrice || 0),
            0
          ) || Number(item.grandTotal || 0);

        const existing = map.get(key);
        map.set(key, {
          id: key,
          name,
          source: "farmer",
          totalDue: (existing?.totalDue || 0) + total,
          accountNumber: existing?.accountNumber ?? item.accountNumber ?? null,
          ifsc: existing?.ifsc ?? item.ifsc ?? null,
          bankName: existing?.bankName ?? item.bankName ?? null,
          bankAddress: existing?.bankAddress ?? item.bankAddress ?? null,
        });
      });

      agents.forEach((item: any) => {
        const name = (item.agentName ?? "").toString().trim();
        if (!name) return;
        const key = `agent:${name}`;
        const total =
          item.items?.reduce(
            (s: number, i: any) => s + Number(i.totalPrice || 0),
            0
          ) || Number(item.grandTotal || 0);

        const existing = map.get(key);
        map.set(key, {
          id: key,
          name,
          source: "agent",
          totalDue: (existing?.totalDue || 0) + total,
          accountNumber: existing?.accountNumber ?? item.accountNumber ?? null,
          ifsc: existing?.ifsc ?? item.ifsc ?? null,
          bankName: existing?.bankName ?? item.bankName ?? null,
          bankAddress: existing?.bankAddress ?? item.bankAddress ?? null,
        });
      });

      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["vendor-payments"],
    queryFn: async () => {
      const res = await axios.get("/api/payments/vendor");
      return res.data?.data || [];
    },
  });

  const selected = vendorData?.find((v) => v.id === vendorId);

  const paidAmount = React.useMemo(() => {
    if (!vendorId) return 0;
    return payments
      .filter((p: any) => p.vendorId === vendorId)
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  }, [payments, vendorId]);

  const totalDue = selected?.totalDue || 0;
  const remaining = Math.max(0, totalDue - paidAmount);
  const installmentAmt =
    isInstallment && installments > 0
      ? +(remaining / installments).toFixed(2)
      : 0;

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

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      await axios.post("/api/payments/vendor", data);
    },
    onSuccess: () => {
      toast.success("Payment saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save payment");
    },
  });

  const validateForm = () => {
    if (!vendorId) return "Please select a vendor";
    if (!amount || Number(amount) <= 0) return "Please enter a valid amount";
    if (Number(amount) > remaining) return "Amount exceeds remaining balance";

    if (paymentMode !== "ac" && !referenceNo.trim()) {
      return "Reference No is required";
    }

    if (paymentMode === "upi" || paymentMode === "cheque") {
      if (!externalRef.trim()) {
        return `${
          paymentMode === "upi" ? "UPI Transaction ID" : "Cheque Number"
        } is required`;
      }
    }

    if (paymentMode === "ac") {
      if (!accNo.trim()) return "Account number required";
      if (!ifsc.trim()) return "IFSC code required";
      if (!bankName.trim()) return "Bank name required";
    }

    return null;
  };

  const handleSave = () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    saveMutation.mutate({
      vendorId,
      vendorName: selected?.name || "Unknown",
      source: selected?.source || "unknown",
      date,
      amount: Number(amount),
      paymentMode,

      referenceNo: paymentMode !== "ac" ? referenceNo.trim() : null,

      // External Payment Reference (UPI ID / Cheque No / Cash Receipt)
      paymentRef: paymentMode !== "ac" ? externalRef.trim() || null : null,

      // Bank details — only for A/C Transfer
      accountNumber: paymentMode === "ac" ? accNo.trim() : null,
      ifsc: paymentMode === "ac" ? ifsc.trim().toUpperCase() : null,
      bankName: paymentMode === "ac" ? bankName.trim() : null,
      bankAddress: paymentMode === "ac" ? bankAddress.trim() : null,

      // Optional note
      paymentdetails: paymentdetails.trim() || null,

      // Installment fields
      isInstallment,
      installments: isInstallment ? installments : null,
      installmentNumber: isInstallment ? installmentNo : null,
    });
  };

  const resetForm = () => {
    setAmount("");
    setPaymentdetails("");
    setReferenceNo("");
    setIsInstallment(false);
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
      title="3A. Vendor Payments"
      actions={
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || loadingVendors}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Payment"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saveMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      }
    >
      <div className="space-y-8 py-6 max-w-6xl mx-auto">
        {/* Vendor Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          <div className="space-y-2">
            <Label>Vendor (Farmer / Agent)</Label>
            <Select
              value={vendorId}
              onValueChange={setVendorId}
              disabled={loadingVendors}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingVendors ? "Loading..." : "Select vendor"}
                />
              </SelectTrigger>
              <SelectContent>
                {vendorData?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex justify-between items-center w-full gap-3">
                      <span className="font-medium">{v.name}</span>
                      <Badge variant="secondary">{v.source}</Badge>
                      <span className="text-sm font-bold">
                        {currency(v.totalDue)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">Total Due</p>
            <p className="text-3xl font-bold text-blue-700">
              {currency(totalDue)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">Remaining</p>
            <p className="text-3xl font-bold text-green-600">
              {currency(remaining)}
            </p>
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Payment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setAmount(val);
                }
              }}
              placeholder="100000"
              className="font-mono text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {(["cash", "ac", "upi", "cheque"] as const).map((m) => (
                <Badge
                  key={m}
                  variant={paymentMode === m ? "default" : "outline"}
                  className="cursor-pointer px-5 py-2"
                  onClick={() => setPaymentMode(m)}
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

          {/* Reference No + UPI/Cheque No - Only for Cash/UPI/Cheque */}
          {paymentMode !== "ac" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reference No (Internal Bill No) */}
              <div className="space-y-2">
                <Label>
                  Reference No <span className="text-red-600">*</span>
                </Label>
                <Input
                  placeholder="e.g. PAY2025-001"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  Your internal payment ID
                </p>
              </div>

              {/* UPI ID / Cheque No */}
              <div className="space-y-2">
                <Label>
                  {paymentMode === "upi"
                    ? "UPI Transaction ID"
                    : paymentMode === "cheque"
                    ? "Cheque Number"
                    : "Cash Receipt No"}
                  {paymentMode !== "cash" && (
                    <span className="text-red-600">*</span>
                  )}
                </Label>
                <Input
                  placeholder={
                    paymentMode === "upi"
                      ? "e.g. 2025121512345678@ybl"
                      : paymentMode === "cheque"
                      ? "e.g. 123456"
                      : "e.g. CR-001 (optional)"
                  }
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  {paymentMode === "cash"
                    ? "Optional"
                    : "Required for UPI/Cheque"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Details (Note) */}
        <div className="space-y-2">
          <Label>Payment Details (Optional)</Label>
          <Input
            placeholder="Any additional note"
            value={paymentdetails}
            onChange={(e) => setPaymentdetails(e.target.value)}
          />
        </div>

        {/* Bank Details - Only for A/C */}
        {paymentMode === "ac" && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-blue-900 mb-6">
              Bank Transfer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Account Number</Label>
                <Input
                  type="number"
                  value={accNo}
                  onChange={(e) => setAccNo(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div>
                <Label>Branch Address</Label>
                <Input
                  type="text"
                  value={bankAddress}
                  onChange={(e) => setBankAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Installment - Simple Toggle */}
        <div className="space-y-4">
          <Label>Payment Type</Label>
          <div className="flex gap-8 items-center">
            <div className="flex gap-6">
              <Badge
                variant={!isInstallment ? "default" : "outline"}
                className="cursor-pointer px-8 py-3 text-base"
                onClick={() => setIsInstallment(false)}
              >
                Full Payment
              </Badge>
              <Badge
                variant={isInstallment ? "default" : "outline"}
                className="cursor-pointer px-8 py-3 text-base"
                onClick={() => setIsInstallment(true)}
              >
                Partial Payment (Installment)
              </Badge>
            </div>

            {isInstallment && (
              <div className="flex items-center gap-3 text-lg">
                <span className="text-gray-600">You're paying</span>
                <span className="font-bold text-blue-600">
                  {currency(Number(amount) || 0)}
                </span>
                <span className="text-gray-600">out of</span>
                <span className="font-bold text-orange-600">
                  {currency(totalDue)}
                </span>
              </div>
            )}
          </div>

          {isInstallment && (
            <p className="text-sm text-gray-500 mt-2">
              This payment will be recorded as a partial installment. Remaining
              balance:
              <span className="font-semibold text-red-600 ml-2">
                {currency(remaining - Number(amount) || 0)}
              </span>
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-8 rounded-2xl border-2 border-gray-300 shadow-md">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-gray-600 text-sm">Total Due</p>
              <p className="text-2xl font-bold mt-2">{currency(totalDue)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Paid So Far</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {currency(paidAmount)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Remaining</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {currency(remaining)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Paying Now</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {currency(Number(amount) || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
