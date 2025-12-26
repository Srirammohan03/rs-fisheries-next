// app/(dashboard)/payments/component/ClientPayments.tsx
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

type ClientRow = {
  id: string; // clientLoading.id
  name: string; // clientName
  billNos: string[];
  totalBilled: number; // sum of grandTotal (what client owes)
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  bankAddress?: string;
};

type ClientPayment = {
  id: string;
  clientId: string;
  clientName: string;
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
};

const currency = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

export function ClientPayments() {
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentdetails, setPaymentdetails] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [isPartial, setIsPartial] = useState(false);
  const [accNo, setAccNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  // Fetch all client loadings to build client list with total billed
  const { data: clientData = [], isLoading: loadingClients } = useQuery<
    ClientRow[]
  >({
    queryKey: ["clients-for-payment"],
    queryFn: async () => {
      // Fetch both loadings and payments in parallel
      const [loadingRes, paymentRes] = await Promise.all([
        axios.get("/api/client-loading"),
        axios.get("/api/payments/client"),
      ]);

      const loadings = (loadingRes.data?.data || []) as any[];
      const payments = (paymentRes.data?.data || []) as any[];

      // Build map of total billed per client
      const clientMap = new Map<
        string,
        {
          id: string;
          name: string;
          billNos: string[];
          totalBilled: number;
          accountNumber?: string;
          ifsc?: string;
          bankName?: string;
          bankAddress?: string;
        }
      >();

      loadings.forEach((load: any) => {
        const name = (load.clientName || "").trim();
        if (!name || !load.id) return;

        const billed = Number(load.grandTotal || 0);
        const billNo = load.billNo || "";

        const key = name.toLowerCase();

        if (!clientMap.has(key)) {
          clientMap.set(key, {
            id: load.id,
            name,
            billNos: billNo ? [billNo] : [],
            totalBilled: billed,
            accountNumber: load.accountNumber || undefined,
            ifsc: load.ifsc || undefined,
            bankName: load.bankName || undefined,
            bankAddress: load.bankAddress || undefined,
          });
        } else {
          const existing = clientMap.get(key)!;
          existing.totalBilled += billed;
          if (billNo) existing.billNos.push(billNo);
          existing.id = load.id;
        }
      });

      // Calculate total paid per client
      const paidMap = new Map<string, number>();
      payments.forEach((p: any) => {
        const name = (p.clientName || "").trim().toLowerCase();
        if (!name) return;
        const amount = Number(p.amount || 0);
        paidMap.set(name, (paidMap.get(name) || 0) + amount);
      });

      // Build final list: only clients with remaining > 0
      const result: ClientRow[] = [];

      for (const [key, client] of clientMap) {
        const totalPaid = paidMap.get(key) || 0;
        const remaining = client.totalBilled - totalPaid;

        if (remaining > 0) {
          result.push({
            ...client,
            // Keep totalBilled for display
          });
        }
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 30, // Optional: cache for 30 seconds
  });

  // Fetch all client payments
  const { data: payments = [] } = useQuery<ClientPayment[]>({
    queryKey: ["client-payments"],
    queryFn: () =>
      axios.get("/api/payments/client").then((res) => res.data?.data || []),
  });

  const selectedClient = clientData.find((c) => c.id === clientId);

  const paidAmount = useMemo(() => {
    if (!clientId) return 0;
    return payments
      .filter((p) => p.clientId === clientId)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments, clientId]);

  const totalBilled = selectedClient?.totalBilled || 0;
  const remaining = Math.max(0, totalBilled - paidAmount);

  // Auto-fill bank details when A/C selected
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
    if (!clientId) return "Please select a client";
    if (!amount || Number(amount) <= 0) return "Enter a valid amount";
    if (Number(amount) > remaining)
      return `Amount exceeds remaining due ${currency(remaining)}`;

    if (paymentMode !== "ac") {
      if (!referenceNo.trim()) return "Reference No is required";
      if (
        (paymentMode === "upi" || paymentMode === "cheque") &&
        !paymentRef.trim()
      ) {
        return paymentMode === "upi"
          ? "UPI Transaction ID required"
          : "Cheque Number required";
      }
    }

    if (paymentMode === "ac") {
      if (!accNo.trim()) return "Account number required for A/C transfer";
      if (!ifsc.trim()) return "IFSC code required";
      if (!bankName.trim()) return "Bank name required";
    }

    return null;
  };

  const saveMutation = useMutation({
    mutationFn: (payload: any) => axios.post("/api/payments/client", payload),
    onSuccess: () => {
      toast.success("Client payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["client-payments"] });
      queryClient.invalidateQueries({ queryKey: ["clients-for-payment"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save payment");
    },
  });

  const handleSave = () => {
    const error = validateForm();
    if (error) return toast.error(error);
    if (!selectedClient) return;

    const latestBillNo =
      selectedClient.billNos[selectedClient.billNos.length - 1] || "";

    const payload = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      billNo: latestBillNo,
      date,
      amount: Number(amount),
      paymentMode: paymentMode.toUpperCase(),
      referenceNo: referenceNo || null,
      paymentRef: paymentRef || null,
      accountNumber: paymentMode === "ac" ? accNo.trim() || null : null,
      ifsc: paymentMode === "ac" ? ifsc.trim().toUpperCase() || null : null,
      bankName: paymentMode === "ac" ? bankName.trim() || null : null,
      bankAddress: paymentMode === "ac" ? bankAddress.trim() || null : null,
      paymentdetails: paymentdetails || null,
      isInstallment: isPartial,
    };

    saveMutation.mutate(payload);
  };

  const resetForm = () => {
    setClientId("");
    setAmount("");
    setPaymentdetails("");
    setReferenceNo("");
    setPaymentRef("");
    setIsPartial(false);
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
            disabled={saveMutation.isPending || loadingClients}
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
          {/* Client Selection + Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-end">
              <div className="lg:col-span-6 space-y-2">
                <Label className="text-slate-700">Client Name</Label>
                <Select
                  value={clientId}
                  onValueChange={setClientId}
                  disabled={loadingClients}
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm">
                    <SelectValue
                      placeholder={
                        loadingClients ? "Loading..." : "Select client"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clientData.length === 0 ? (
                      <div className="px-6 py-4 text-center text-slate-500">
                        No clients with pending dues
                      </div>
                    ) : (
                      clientData.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="py-3">
                          <div className="flex justify-between items-center gap-3">
                            <span className="font-medium text-slate-800">
                              {c.name}
                            </span>
                            <span className="text-sm font-semibold text-[#139BC3]">
                              {currency(c.totalBilled)}
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
                    Total Billed
                  </p>
                  <p className="mt-1 font-bold text-slate-900 text-xl sm:text-2xl">
                    {currency(totalBilled)}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
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
                  onChange={(e) =>
                    /^\d*\.?\d*$/.test(e.target.value) &&
                    setAmount(e.target.value)
                  }
                  placeholder="100000"
                  className="h-11 font-mono text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="flex flex-wrap gap-2">
                  {(["cash", "ac", "upi", "cheque"] as const).map((m) => {
                    const selected = paymentMode === m;
                    return (
                      <Badge
                        key={m}
                        onClick={() => setPaymentMode(m)}
                        className={`cursor-pointer px-4 py-2 rounded-full border transition ${
                          selected
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
                    );
                  })}
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

            {/* Non-AC Payment References */}
            {paymentMode !== "ac" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>
                      Reference No <span className="text-rose-600">*</span>
                    </Label>
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
                      className="h-11 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bank Details for A/C Transfer */}
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

            {/* Full / Partial Toggle */}
            <div className="mt-8">
              <Label className="text-base font-semibold">Payment Type</Label>
              <div className="flex flex-col lg:flex-row gap-4 mt-3">
                <div className="grid grid-cols-2 sm:flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPartial(false)}
                    className={`px-5 py-2 rounded-full border font-semibold transition ${
                      !isPartial
                        ? "bg-[#139BC3] text-white border-[#139BC3]"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Full Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPartial(true)}
                    className={`px-5 py-2 rounded-full border font-semibold transition ${
                      isPartial
                        ? "bg-[#139BC3] text-white border-[#139BC3]"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Partial Payment
                  </button>
                </div>
                {isPartial && (
                  <div className="text-sm text-slate-700 self-center">
                    Receiving <strong>{currency(Number(amount) || 0)}</strong>{" "}
                    of <strong>{currency(totalBilled)}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-600">Total Billed</p>
                  <p className="mt-1 font-bold text-slate-900 text-xl">
                    {currency(totalBilled)}
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
