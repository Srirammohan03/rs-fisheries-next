// app/(dashboard)/payments/component/PackingAmount.tsx
"use client";

import React, { useEffect, useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/helpers/Field";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "loading" | "unloading";
type PaymentMode = "CASH" | "AC" | "UPI" | "CHEQUE";

interface Bill {
  id: string;
  billNo: string;
  clientName?: string;
  FarmerName?: string;
  agentName?: string;
}

export function PackingAmount() {
  const [mode, setMode] = useState<Mode>("loading");
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [workers, setWorkers] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");
  const [total, setTotal] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [reference, setReference] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadBills() {
      setIsLoading(true);
      try {
        let data: Bill[] = [];
        if (mode === "loading") {
          const res = await fetch("/api/client-loading");
          const json = await res.json();
          data = json.data || [];
        } else {
          const [formerRes, agentRes] = await Promise.all([
            fetch("/api/former-loading"),
            fetch("/api/agent-loading"),
          ]);
          const f = await formerRes.json();
          const a = await agentRes.json();
          data = [...(f.data || []), ...(a.data || [])];
        }
        setBills(data);
      } catch {
        toast.error("Failed to load bills");
      } finally {
        setIsLoading(false);
      }
    }
    loadBills();
  }, [mode]);

  const handleSave = async () => {
    const workersNum = parseInt(workers);
    const tempNum = parseFloat(temperature);
    const totalNum = parseFloat(total);

    if (workersNum <= 0 || isNaN(tempNum) || totalNum <= 0) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    if (paymentMode !== "CASH" && !reference.trim()) {
      toast.error("Reference number is required for non-cash payments");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/payments/packing-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sourceRecordId: selectedBillId || null,
          workers: workersNum,
          temperature: tempNum,
          totalAmount: totalNum,
          paymentMode,
          reference: reference.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      toast.success("Packing amount saved successfully!");

      // Reset
      setWorkers("");
      setTemperature("");
      setTotal("0");
      setSelectedBillId("");
      setPaymentMode("CASH");
      setReference("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const showReference = paymentMode !== "CASH";

  return (
    <CardCustom title="Packing Amount">
      <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setMode("loading")}
            size="sm"
            className={[
              "h-9 px-4 rounded-full border transition shadow-sm",
              mode === "loading"
                ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            Loading
          </Button>

          <Button
            variant="outline"
            onClick={() => setMode("unloading")}
            size="sm"
            className={[
              "h-9 px-4 rounded-full border transition shadow-sm",
              mode === "unloading"
                ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            Unloading
          </Button>
        </div>

        {/* Main Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field label={mode === "loading" ? "Client Bill" : "Vendor Bill"}>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Loading...
                </div>
              ) : (
                <Select
                  value={selectedBillId}
                  onValueChange={setSelectedBillId}
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                    <SelectValue placeholder="Select bill (optional)" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200">
                    {bills.map((bill) => (
                      <SelectItem
                        key={bill.id}
                        value={bill.id}
                        className="py-3"
                      >
                        {bill.billNo} —{" "}
                        {bill.clientName ||
                          bill.FarmerName ||
                          bill.agentName ||
                          "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field label="Number of Workers">
              <Input
                type="number"
                value={workers}
                onChange={(e) => setWorkers(e.target.value)}
                placeholder="e.g. 8"
                min="1"
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>

            <Field label="Temperature (°C)">
              <Input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g. 24.5"
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          </div>

          <Field label="Total Packing Amount (₹)">
            <Input
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="Enter total amount"
              min="0"
              step="100"
              className="h-12 border-slate-200 bg-white shadow-sm text-2xl font-bold focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>

          {/* Payment Mode */}
          <div className="space-y-3">
            <Label className="text-slate-700">Payment Mode</Label>
            <div className="flex flex-wrap gap-2">
              {(["CASH", "AC", "UPI", "CHEQUE"] as const).map((pm) => {
                const selected = paymentMode === pm;
                return (
                  <Badge
                    key={pm}
                    onClick={() => {
                      setPaymentMode(pm);
                      if (pm === "CASH") setReference("");
                    }}
                    className={[
                      "cursor-pointer select-none px-4 py-2 rounded-full border transition shadow-sm",
                      selected
                        ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {pm === "CASH" && "Cash"}
                    {pm === "AC" && "A/C Transfer"}
                    {pm === "UPI" && "UPI / PhonePe"}
                    {pm === "CHEQUE" && "Cheque"}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Reference Field */}
          {showReference && (
            <Field
              label={
                paymentMode === "AC"
                  ? "Bank Reference / UTR No. *"
                  : paymentMode === "UPI"
                  ? "UPI Transaction ID *"
                  : "Cheque Number *"
              }
            >
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter reference"
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          )}

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="lg"
              className="bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save Packing Amount
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setWorkers("");
                setTemperature("");
                setTotal("0");
                setSelectedBillId("");
                setPaymentMode("CASH");
                setReference("");
              }}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
