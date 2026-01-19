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
    maximumFractionDigits: 0,
  }).format(v);

export function ClientPayments() {
  const queryClient = useQueryClient();

  const [clientDetailsId, setClientDetailsId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentdetails, setPaymentdetails] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [isPartial, setIsPartial] = useState(false);
  const [installments, setInstallments] = useState("");
  const [installmentNumber, setInstallmentNumber] = useState("");
  const [accNo, setAccNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  const { data: billData = [], isLoading: loadingBills } = useQuery<
    {
      id: string; // Use loading ID as the key for payment
      loadingId: string; // or whatever the loading record ID is
      clientDetailsId: string;
      clientName: string;
      billAmount: number; // grandTotal of this loading
      totalPaid: number;
      remaining: number;
      accountNumber?: string;
      ifsc?: string;
      bankName?: string;
      bankAddress?: string;
    }[]
  >({
    queryKey: ["bills-for-payment"],
    queryFn: async () => {
      const [loadingsRes, paymentsRes] = await Promise.all([
        axios.get("/api/client-loading"),
        axios.get("/api/payments/client"),
      ]);

      const loadings: any[] = loadingsRes.data?.data || [];
      const payments: any[] = paymentsRes.data?.data || [];

      if (loadings.length === 0) return [];

      // Calculate total paid per loading
      const paidMap = new Map<string, number>();
      payments.forEach((p: any) => {
        const loadingId = p.clientId?.toString();
        if (loadingId) {
          paidMap.set(
            loadingId,
            (paidMap.get(loadingId) || 0) + Number(p.amount || 0)
          );
        }
      });

      const result = loadings
        .map((load: any) => {
          const loadingId = load.id?.toString();
          const billAmount = Math.round(Number(load.grandTotal || 0)); // Round bill
          const totalPaid = paidMap.get(loadingId) || 0;
          const remaining = Math.max(0, billAmount - Math.round(totalPaid)); // Round paid too

          const hasCharges =
            load.dispatchChargesTotal > 0 || load.packingAmountTotal > 0;

          if (remaining > 0 && (billAmount >= 20000 || hasCharges)) {
            return {
              id: loadingId,
              loadingId,
              clientName: load.clientName?.trim() || "Unknown",
              clientDetailsId: load.clientId?.toString(),
              billAmount,
              totalPaid,
              remaining,
              accountNumber: load.accountNumber || undefined,
              ifsc: load.ifsc || undefined,
              bankName: load.bankName || undefined,
              bankAddress: load.bankAddress || undefined,
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => a!.clientName.localeCompare(b!.clientName));

      return result as any[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const selectedClient = billData.find((c) => c.id === clientDetailsId);

  const totalBilled = Math.round(selectedClient?.billAmount || 0);
  const paidAmount = Math.round(selectedClient?.totalPaid || 0);
  const remaining = Math.round(selectedClient?.remaining || 0);

  useEffect(() => {
    if (paymentMode === "ac" && selectedClient) {
      setAccNo(selectedClient.accountNumber || "");
      setIfsc(selectedClient.ifsc || "");
      setBankName(selectedClient.bankName || "");
      setBankAddress(selectedClient.bankAddress || "");
    } else {
      setAccNo("");
      setIfsc("");
      setBankName("");
      setBankAddress("");
    }
  }, [paymentMode, selectedClient]);

  const validateForm = () => {
    if (!clientDetailsId) return "Please select a bill";
    if (!amount || Number(amount) <= 0) return "Enter a valid amount";

    const enteredAmount = Math.round(Number(amount)); // Allow only whole rupees
    const maxAllowed = Math.round(remaining);

    if (enteredAmount > maxAllowed)
      return `Amount exceeds remaining due ${currency(maxAllowed)}`;

    return null;
  };

  const saveMutation = useMutation({
    mutationFn: (payload: any) => axios.post("/api/payments/client", payload),
    onSuccess: () => {
      toast.success("Client payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["bills-for-payment"] });
      queryClient.refetchQueries({ queryKey: ["bills-for-payment"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save payment");
    },
  });

  const handleSave = () => {
    const error = validateForm();
    if (error) return toast.error(error);

    const payload = {
      clientDetailsId: selectedClient!.clientDetailsId,
      loadingId: selectedClient!.id, // Send the selected loading ID to apply payment to this bill only
      clientName: selectedClient!.clientName,
      date,
      amount: Math.round(Number(amount)),
      paymentMode: paymentMode.toUpperCase(),
      referenceNo: referenceNo || null,
      paymentRef: paymentRef || null,
      accountNumber: paymentMode === "ac" ? accNo.trim() || null : null,
      ifsc: paymentMode === "ac" ? ifsc.trim().toUpperCase() || null : null,
      bankName: paymentMode === "ac" ? bankName.trim() || null : null,
      bankAddress: paymentMode === "ac" ? bankAddress.trim() || null : null,
      paymentdetails: paymentdetails || null,
      isInstallment: isPartial,
      installments: isPartial ? Number(installments) || null : null,
      installmentNumber: isPartial ? Number(installmentNumber) || null : null,
    };
    saveMutation.mutate(payload);
  };

  const resetForm = () => {
    setClientDetailsId("");
    setAmount("");
    setPaymentdetails("");
    setReferenceNo("");
    setPaymentRef("");
    setIsPartial(false);
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
      title="Client Payments"
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
          {/* Client Selection */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-end">
              <div className="col-span-full lg:col-span-6 space-y-2">
                <Label className="text-slate-700 text-base sm:text-lg">
                  Select Bill
                </Label>
                <Select
                  value={clientDetailsId}
                  onValueChange={setClientDetailsId}
                  disabled={loadingBills}
                >
                  <SelectTrigger className="w-full py-8 h-12 sm:h-14 border-slate-200 bg-white shadow-sm text-left">
                    <SelectValue
                      placeholder={
                        loadingBills
                          ? "Loading bills..."
                          : "Select a bill with pending dues"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {billData.length === 0 ? (
                      <div className="px-6 py-8 text-center text-slate-500">
                        {loadingBills
                          ? "Loading..."
                          : "No bills with pending payments"}
                      </div>
                    ) : (
                      billData.map((c) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          className="py-4 px-4"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-slate-800 text-base">
                              {c.clientName}
                            </span>
                            <span className="text-sm text-slate-500 leading-tight">
                              Bill: {currency(c.billAmount)} | Remaining:{" "}
                              {currency(c.remaining)}
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
                    Bill Amount
                  </p>
                  <p className="mt-1 font-bold text-slate-900 text-xl sm:text-2xl">
                    {currency(totalBilled)}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-emerald-50 p-4 text-center">
                  <p className="text-xs font-medium text-slate-600">
                    Remaining Due
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
                <Label>Amount Received</Label>
                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, ""); // Only digits
                    if (val === "") {
                      setAmount("");
                      return;
                    }
                    const num = Number(val);
                    const roundedRemaining = Math.round(remaining);
                    if (num > roundedRemaining) {
                      toast.error(
                        `Cannot exceed ${currency(roundedRemaining)}`
                      );
                      return;
                    }
                    setAmount(val);
                  }}
                  placeholder="1318037"
                  className="h-11 font-mono text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Max allowed: {currency(Math.round(remaining))}
                </p>
                {/* {remaining > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Max allowed: {currency(remaining)}
                  </p>
                )} */}
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
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Any remarks"
                  value={paymentdetails}
                  onChange={(e) => setPaymentdetails(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* References */}
            {paymentMode !== "ac" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>Reference No</Label>
                    <Input
                      placeholder="e.g. REC2025-001"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="h-11 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {paymentMode === "upi"
                        ? "UPI Transaction ID"
                        : paymentMode === "cheque"
                        ? "Cheque Number"
                        : "Cash Receipt No"}
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

            {/* Bank Details */}
            {paymentMode === "ac" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Bank Transfer Details
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
                  <p className="text-xs text-slate-600">Bill Amount</p>
                  <p className="mt-1 font-bold text-slate-900 text-xl">
                    {currency(totalBilled)}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-600">Paid So Far</p>
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
                  <p className="text-xs text-slate-600">Receiving Now</p>
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
