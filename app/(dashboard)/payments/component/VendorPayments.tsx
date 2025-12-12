// app/(dashboard)/payments/component/VendorPayments.tsx
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
import { Label } from "@/components/ui/label";
import { Field } from "@/components/helpers/Field";
import { CardCustom } from "@/components/ui/card-custom";
import { Badge } from "@/components/ui/badge";
// import { Save, Bank, CreditCard, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Save } from "lucide-react";

/* ---------------- Types ---------------- */
type PaymentMode = "cash" | "ac" | "upi" | "cheque";
type VendorSource = "farmer" | "agent";

type FormerLoading = {
  id: string;
  FarmerName?: string | null;
  grandTotal?: number;
  totalPrice?: number;
  // optional fields (if you later add accounts)
  accountNumber?: string | null;
  ifsc?: string | null;
};

type AgentLoading = {
  id: string;
  agentName?: string;
  grandTotal?: number;
  totalPrice?: number;
  accountNumber?: string | null;
  ifsc?: string | null;
};

type VendorOption = {
  id: string; // composed id like `${source}:${name}`
  name: string;
  source: VendorSource;
  totalDue: number; // aggregated
  accountNumber?: string | null;
  ifsc?: string | null;
};

/* ---------------- Helpers ---------------- */
const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const currency = (v: number) =>
  v.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ---------------- Component ---------------- */
export function VendorPayments() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // data
  const [formerLoadings, setFormerLoadings] = useState<FormerLoading[]>([]);
  const [agentLoadings, setAgentLoadings] = useState<AgentLoading[]>([]);

  // form state
  const [vendorId, setVendorId] = useState<string>(""); // VendorOption.id
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [amount, setAmount] = useState<number | "">("");
  const [methodNote, setMethodNote] = useState<string>("");

  // installment controls
  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [installments, setInstallments] = useState<number>(2);
  const [installmentNumber, setInstallmentNumber] = useState<number>(1);

  // account details (shown when paymentMode === 'ac')
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifsc, setIfsc] = useState<string>("");

  // small local paid tracker (in real app read from payments table)
  const [paidMap, setPaidMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      axios.get("/api/former-loading"),
      axios.get("/api/agent-loading"),
    ])
      .then(([fRes, aRes]) => {
        if (!mounted) return;
        // tolerant parsing: the API might wrap in { data: [...] } or return [...]
        const farmers = (fRes.data?.data ?? fRes.data ?? []) as FormerLoading[];
        const agents = (aRes.data?.data ?? aRes.data ?? []) as AgentLoading[];
        setFormerLoadings(farmers);
        setAgentLoadings(agents);
      })
      .catch((err) => {
        console.error("Failed to load vendor lists:", err);
        if (!mounted) return;
        setError("Failed to load vendor names");
        toast.error("Failed to load vendor names");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  // Build vendor options: unique by name inside source
  const vendorOptions = useMemo<VendorOption[]>(() => {
    const map = new Map<string, VendorOption>();

    // farmers
    formerLoadings.forEach((l) => {
      const name = (l.FarmerName ?? "Unknown Farmer").trim();

      // calculate total money from items
      const itemTotal = Array.isArray(l.items)
        ? l.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0)
        : 0;

      const key = `farmer:${name}`;
      const existing = map.get(key);

      map.set(key, {
        id: key,
        name,
        source: "farmer",
        totalDue: (existing?.totalDue ?? 0) + itemTotal,
        accountNumber: existing?.accountNumber ?? l.accountNumber ?? null,
        ifsc: existing?.ifsc ?? l.ifsc ?? null,
      });
    });

    // agents
    agentLoadings.forEach((l) => {
      const name = (l.agentName ?? "Unknown Agent").trim();

      const itemTotal = Array.isArray(l.items)
        ? l.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0)
        : 0;

      const key = `agent:${name}`;
      const existing = map.get(key);

      map.set(key, {
        id: key,
        name,
        source: "agent",
        totalDue: (existing?.totalDue ?? 0) + itemTotal,
        accountNumber: existing?.accountNumber ?? l.accountNumber ?? null,
        ifsc: existing?.ifsc ?? l.ifsc ?? null,
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [formerLoadings, agentLoadings]);

  // selected vendor derived
  const selectedVendor = useMemo(
    () => vendorOptions.find((v) => v.id === vendorId) ?? null,
    [vendorId, vendorOptions]
  );

  // computed metrics
  const totalDue = selectedVendor?.totalDue ?? 0;
  const alreadyPaid = paidMap[vendorId] ?? 0;
  const remaining = Math.max(0, totalDue - alreadyPaid);

  // computed installment amount if installment mode selected
  const installmentAmount =
    isInstallment && installments > 0
      ? Number((remaining / installments || 0).toFixed(2))
      : 0;

  // prefill account details when vendor changes and vendor has stored details
  useEffect(() => {
    if (selectedVendor) {
      setAccountNumber(selectedVendor.accountNumber ?? "");
      setIfsc(selectedVendor.ifsc ?? "");
    } else {
      setAccountNumber("");
      setIfsc("");
    }
  }, [selectedVendor]);

  // Input validation
  const validate = () => {
    if (!vendorId) return "Please select a vendor";
    if (!date) return "Please select a date";
    const amt = Number(amount || 0);
    if (amt <= 0) return "Enter a valid payment amount";
    if (amt > remaining) return "Payment amount cannot exceed remaining due";
    if (paymentMode === "ac" && (!accountNumber.trim() || !ifsc.trim()))
      return "Please provide account details for A/C payments";
    if (isInstallment) {
      if (installments <= 0) return "Installments must be at least 1";
      if (installmentNumber <= 0 || installmentNumber > installments)
        return "Invalid installment number";
    }
    return null;
  };

  // Save handler
  const handleSave = useCallback(async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload = {
      vendorId,
      vendorName: selectedVendor?.name,
      source: selectedVendor?.source,
      date,
      amount: Number(amount),
      paymentMode,
      accountNumber: paymentMode === "ac" ? accountNumber : undefined,
      ifsc: paymentMode === "ac" ? ifsc : undefined,
      isInstallment,
      installments: isInstallment ? installments : undefined,
      installmentNumber: isInstallment ? installmentNumber : undefined,
      note: methodNote || undefined,
    };

    try {
      setSaving(true);
      // POST to your payments API — create this endpoint to persist in DB
      await axios.post("/api/payments/vendor", payload);

      // optimistic update for local paid map
      setPaidMap((prev) => ({
        ...prev,
        [vendorId]: (prev[vendorId] ?? 0) + Number(amount),
      }));

      toast.success("Payment recorded");
      // reset amount & notes
      setAmount("");
      setMethodNote("");
    } catch (e: any) {
      console.error("Save payment failed:", e);
      toast.error(e?.response?.data?.message ?? "Failed to save payment");
    } finally {
      setSaving(false);
    }
  }, [
    vendorId,
    date,
    amount,
    paymentMode,
    accountNumber,
    ifsc,
    isInstallment,
    installments,
    installmentNumber,
    methodNote,
    selectedVendor,
  ]);

  return (
    <CardCustom
      title="3A. Vendor Payments"
      actions={
        <Button onClick={handleSave} disabled={saving || loading} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save"}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Vendor selector + totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <Label className="text-sm">Vendor (Farmer / Agent)</Label>
            <Select value={vendorId} onValueChange={(v) => setVendorId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={loading ? "Loading vendors..." : "Select vendor"}
                />
              </SelectTrigger>
              <SelectContent>
                {vendorOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{v.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {v.source === "farmer" ? "Farmer" : "Agent"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        ₹{currency(v.totalDue)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Field label="Total Due">
              <div className="text-lg font-semibold">₹{currency(totalDue)}</div>
            </Field>
          </div>

          <div>
            <Field label="Remaining">
              <div className="text-lg font-semibold text-emerald-600">
                ₹{currency(remaining)}
              </div>
            </Field>
          </div>
        </div>

        {/* Payment row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-sm">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Field label="Amount">
              <Input
                type="number"
                min={0}
                value={amount === "" ? "" : String(amount)}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Enter amount"
              />
            </Field>
          </div>

          <div>
            <Label className="text-sm">Payment Mode</Label>
            <div className="flex gap-2 flex-wrap">
              {(["cash", "ac", "upi", "cheque"] as PaymentMode[]).map((m) => (
                <Badge
                  key={m}
                  className={`cursor-pointer ${
                    paymentMode === m
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => setPaymentMode(m)}
                >
                  {m === "ac"
                    ? "A/C"
                    : m === "upi"
                    ? "UPI/PhonePe"
                    : m.charAt(0).toUpperCase() + m.slice(1)}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Field label="Payment Note (optional)">
              <Input
                value={methodNote}
                onChange={(e) => setMethodNote(e.target.value)}
                placeholder="Cheque no / UPI ref"
              />
            </Field>
          </div>
        </div>

        {/* A/C details if selected */}
        {paymentMode === "ac" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Field label="Account number">
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account number"
                />
              </Field>
            </div>
            <div>
              <Field label="IFSC">
                <Input
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  placeholder="IFSC code"
                />
              </Field>
            </div>
          </div>
        )}

        {/* Installment toggle */}
        <div className="flex items-center gap-4">
          <div>
            <Label className="text-sm">Payment Type</Label>
            <div className="flex gap-2 mt-2">
              <Badge
                className={`cursor-pointer ${
                  !isInstallment
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
                onClick={() => setIsInstallment(false)}
              >
                One-time
              </Badge>
              <Badge
                className={`cursor-pointer ${
                  isInstallment
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
                onClick={() => setIsInstallment(true)}
              >
                Installment
              </Badge>
            </div>
          </div>

          {isInstallment && (
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-sm">Installments</Label>
                <Input
                  type="number"
                  min={1}
                  value={String(installments)}
                  onChange={(e) =>
                    setInstallments(Math.max(1, Number(e.target.value || 1)))
                  }
                  className="w-28"
                />
              </div>

              <div>
                <Label className="text-sm">This installment #</Label>
                <Input
                  type="number"
                  min={1}
                  max={installments}
                  value={String(installmentNumber)}
                  onChange={(e) =>
                    setInstallmentNumber(
                      Math.min(
                        Math.max(1, Number(e.target.value || 1)),
                        installments
                      )
                    )
                  }
                  className="w-28"
                />
              </div>

              <div>
                <Label className="text-sm">Est. per installment</Label>
                <div className="text-sm font-semibold">
                  ₹{currency(installmentAmount)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* small summary & action row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm text-gray-600">
            <div>
              Total Due:{" "}
              <span className="font-medium">₹{currency(totalDue)}</span>
            </div>
            <div>
              Already Paid:{" "}
              <span className="font-medium">₹{currency(alreadyPaid)}</span>
            </div>
            <div>
              Remaining:{" "}
              <span className="font-medium text-emerald-600">
                ₹{currency(remaining)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 mr-2">Mode details</div>
            <Button onClick={handleSave} disabled={saving || loading} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Payment"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // quick quick-reset
                setVendorId("");
                setAmount("");
                setIsInstallment(false);
                setInstallments(2);
                setInstallmentNumber(1);
                setMethodNote("");
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
