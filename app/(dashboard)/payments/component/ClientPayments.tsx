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

type ClientRow = {
  id: string; // Client.id (master)
  name: string;
  totalBilled: number;
  totalPaid: number;
  remaining: number;
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

  // Fetch clients with pending dues (ALL loadings, calculate remaining)
  const { data: clientData = [], isLoading: loadingClients } = useQuery<
    ClientRow[]
  >({
    queryKey: ["clients-for-payment"],
    queryFn: async () => {
      const [loadingsRes, paymentsRes] = await Promise.all([
        axios.get("/api/client-loading"),
        axios.get("/api/payments/client"),
      ]);

      const loadings: any[] = loadingsRes.data?.data || [];
      const payments: any[] = paymentsRes.data?.data || [];

      if (loadings.length === 0) return [];

      // Group by master clientId
      const clientMap = new Map<
        string,
        {
          name: string;
          totalBilled: number;
          accountNumber?: string;
          ifsc?: string;
          bankName?: string;
          bankAddress?: string;
        }
      >();

      loadings.forEach((load: any) => {
        const masterId = load.clientId?.toString();
        const name = (load.clientName || "").trim();
        if (!masterId || !name) return;

        // Use grandTotal which already includes dispatch + packing charges
        const billed = Number(load.grandTotal || 0);

        if (!clientMap.has(masterId)) {
          clientMap.set(masterId, {
            name,
            totalBilled: billed,
            accountNumber: load.accountNumber || undefined,
            ifsc: load.ifsc || undefined,
            bankName: load.bankName || undefined,
            bankAddress: load.bankAddress || undefined,
          });
        } else {
          const existing = clientMap.get(masterId)!;
          existing.totalBilled += billed;

          // Keep best bank details
          if (!existing.accountNumber && load.accountNumber) {
            existing.accountNumber = load.accountNumber;
            existing.ifsc = load.ifsc;
            existing.bankName = load.bankName;
            existing.bankAddress = load.bankAddress;
          }
        }
      });

      // Total paid per client
      const paidMap = new Map<string, number>();
      payments.forEach((p: any) => {
        const clientId = p.clientDetailsId?.toString();
        if (clientId) {
          const amt = Number(p.amount || 0);
          paidMap.set(clientId, (paidMap.get(clientId) || 0) + amt);
        }
      });

      const result: ClientRow[] = [];

      for (const [id, client] of clientMap) {
        const totalPaid = paidMap.get(id) || 0;
        const remaining = client.totalBilled - totalPaid;

        // Must have some remaining AND either:
        // - Decent amount (≥ ₹20,000) OR
        // - Has dispatch/packing charges (real trip)
        const hasCharges = loadings
          .filter((l: any) => l.clientId?.toString() === id)
          .some(
            (l: any) => l.dispatchChargesTotal > 0 || l.packingAmountTotal > 0
          );

        if (remaining > 0 && (client.totalBilled >= 20000 || hasCharges)) {
          result.push({
            id,
            name: client.name,
            totalBilled: client.totalBilled,
            totalPaid,
            remaining,
            accountNumber: client.accountNumber,
            ifsc: client.ifsc,
            bankName: client.bankName,
            bankAddress: client.bankAddress,
          });
        }
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const selectedClient = clientData.find((c) => c.id === clientDetailsId);

  const totalBilled = selectedClient?.totalBilled || 0;
  const paidAmount = selectedClient?.totalPaid || 0;
  const remaining = selectedClient?.remaining || 0;

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
    if (!clientDetailsId) return "Please select a client";
    if (!amount || Number(amount) <= 0) return "Enter a valid amount";
    if (Number(amount) > remaining)
      return `Amount exceeds remaining due ${currency(remaining)}`;

    return null;
  };

  const saveMutation = useMutation({
    mutationFn: (payload: any) => axios.post("/api/payments/client", payload),
    onSuccess: () => {
      toast.success("Client payment recorded successfully!");
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

    const payload = {
      clientDetailsId: selectedClient!.id,
      clientName: selectedClient!.name,
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
              <div className="lg:col-span-6 space-y-2">
                <Label className="text-slate-700">Client Name</Label>
                <Select
                  value={clientDetailsId}
                  onValueChange={setClientDetailsId}
                  disabled={loadingClients}
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm">
                    <SelectValue
                      placeholder={
                        loadingClients
                          ? "Loading clients..."
                          : "Select a client with pending dues"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clientData.length === 0 ? (
                      <div className="px-6 py-4 text-center text-slate-500">
                        {loadingClients
                          ? "Loading..."
                          : "No clients with pending payments"}
                      </div>
                    ) : (
                      clientData.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">
                              {c.name}
                            </span>
                            <span className="text-sm text-slate-500">
                              Billed: {currency(c.totalBilled)} | Remaining:{" "}
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
                    Total Billed
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
                    const val = e.target.value;
                    if (!/^\d*\.?\d*$/.test(val)) return;
                    const num = val === "" ? 0 : parseFloat(val);
                    if (num > remaining) {
                      toast.error(
                        `Cannot exceed remaining: ${currency(remaining)}`
                      );
                      return;
                    }
                    setAmount(val);
                  }}
                  placeholder="100000"
                  className="h-11 font-mono text-lg"
                />
                {remaining > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Max allowed: {currency(remaining)}
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
                  <p className="text-xs text-slate-600">Total Billed</p>
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
