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
  const [paymentdetails, setPaymentdetails] = useState("");
  const [referenceNo, setReferenceNo] = useState(""); // Internal bill no
  const [paymentRef, setPaymentRef] = useState(""); // UPI ID / Cheque No
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // Bank fields
  const [accNo, setAccNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  // Load vendors
  const { data: vendorData, isLoading: loadingVendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const [fRes, aRes] = await Promise.all([
        axios.get("/api/former-loading"),
        axios.get("/api/agent-loading"),
      ]);

      const farmers = (fRes.data?.data || []) as any[];
      const agents = (aRes.data?.data || []) as any[];

      const map = new Map();

      [...farmers, ...agents].forEach((item: any) => {
        const name = (item.FarmerName || item.agentName || "").trim();
        if (!name) return;
        const source = item.FarmerName ? "farmer" : "agent";
        const key = `${source}:${name}`;

        const total =
          item.items?.reduce(
            (s: number, i: any) => s + Number(i.totalPrice || 0),
            0
          ) || Number(item.grandTotal || 0);

        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name,
            source,
            totalDue: total,
            accountNumber: item.accountNumber,
            ifsc: item.ifsc,
            bankName: item.bankName,
            bankAddress: item.bankAddress,
          });
        } else {
          const existing = map.get(key);
          existing.totalDue += total;
        }
      });

      return Array.from(map.values()).sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      );
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["vendor-payments"],
    queryFn: () =>
      axios.get("/api/payments/vendor").then((res) => res.data?.data || []),
  });

  const selected = vendorData?.find((v: any) => v.id === vendorId);
  const paidAmount = React.useMemo(() => {
    if (!vendorId) return 0;
    return payments
      .filter((p: any) => p.vendorId === vendorId)
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
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

  const handleSave = () => {
    const error = validateForm();
    if (error) return toast.error(error);

    saveMutation.mutate({
      source: selected.source, // "farmer" | "agent"
      sourceRecordId: selected.loadingId, // MUST be UUID
      vendorName: selected.name,
      date,
      amount: Number(amount),
      paymentMode,
      referenceNo,
      paymentRef,

      // ✅ FIXED NAMES
      accountNumber: accNo,
      ifsc,
      bankName,
      bankAddress,
      paymentdetails,

      // ✅ backend expects isInstallment
      isInstallment: isPartialPayment,
    });
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => axios.post("/api/payments/vendor", data),
    onSuccess: () => {
      toast.success("Payment saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
      resetForm();
    },
    onError: (err: any) => {
      console.error("Save error:", err.response?.data || err);
      toast.error(err.response?.data?.message || "Failed to save");
    },
  });

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
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || loadingVendors}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Payment"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
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
                {vendorData?.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex justify-between items-center w-full gap-4">
                      <span className="font-medium">{v.name}</span>
                      <Badge variant="secondary">{v.source}</Badge>
                      <span className="text-sm font-bold text-blue-600">
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

        {/* Main Payment Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
              value={amount}
              onChange={(e) =>
                /^\d*\.?\d*$/.test(e.target.value) && setAmount(e.target.value)
              }
              placeholder="100000000"
              className="font-mono text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <div className="flex flex-wrap gap-3">
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

          <div className="space-y-2">
            <Label>Payment Details (Optional)</Label>
            <Input
              placeholder="Any note"
              value={paymentdetails}
              onChange={(e) => setPaymentdetails(e.target.value)}
            />
          </div>
        </div>

        {/* Reference No + UPI/Cheque No */}
        {paymentMode !== "ac" && (
          <div className="bg-gray-50 p-6 rounded-xl border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
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
                  placeholder={paymentMode === "upi" ? "123@ybl" : "123456"}
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bank Details */}
        {paymentMode === "ac" && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
            <h3 className="text-xl font-bold text-blue-900 mb-6">
              Bank Transfer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  type="number"
                  min={0}
                  value={accNo}
                  onChange={(e) => setAccNo(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
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

        {/* Simple Partial Payment Toggle */}
        <div className="">
          <Label className="text-lg font-semibold">Payment Type</Label>
          <div className="flex gap-8 items-center mt-4">
            <div className="flex gap-3">
              <Badge
                variant={!isPartialPayment ? "default" : "outline"}
                className="cursor-pointer px-8 py-2 text-md"
                onClick={() => setIsPartialPayment(false)}
              >
                Full Payment
              </Badge>
              <Badge
                variant={isPartialPayment ? "default" : "outline"}
                className="cursor-pointer px-10 py-4 text-md"
                onClick={() => setIsPartialPayment(true)}
              >
                Partial Payment
              </Badge>
            </div>
            {isPartialPayment && (
              <span className="text-lg font-medium text-amber-800">
                Paying {currency(Number(amount) || 0)} of {currency(totalDue)}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-8 rounded-2xl border-2 border-gray-300 shadow-md">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-sm text-gray-600">Total Due</p>
              <p className="text-2xl font-bold">{currency(totalDue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-orange-600">
                {currency(paidAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-2xl font-bold text-green-600">
                {currency(remaining)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paying Now</p>
              <p className="text-2xl font-bold text-blue-600">
                {currency(Number(amount) || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
