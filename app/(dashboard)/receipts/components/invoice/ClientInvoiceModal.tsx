"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ClientInvoiceModalProps = {
  open: boolean;
  clientId: string;
  clientName: string;
  paymentId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ClientInvoiceModal({
  open,
  clientId,
  clientName,
  paymentId,
  onClose,
  onSaved,
}: ClientInvoiceModalProps) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [hsn, setHsn] = useState("");
  const [gstPercent, setGstPercent] = useState("5");
  const [taxableValue, setTaxableValue] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any>(null);

  useEffect(() => {
    if (!open) return;

    async function loadExisting() {
      try {
        const res = await fetch(
          `/api/invoices/client/by-payment?paymentId=${paymentId}`
        );
        if (res.ok) {
          const data = await res.json();
          const inv = data.invoice;
          setExisting(inv);
          setInvoiceNo(inv.invoiceNo);
          setInvoiceDate(new Date(inv.invoiceDate).toISOString().slice(0, 10));
          setHsn(inv.hsn || "");
          setGstPercent(String(inv.gstPercent || 5));
          setTaxableValue(String(inv.taxableValue || ""));
          setDescription(inv.description || "");
        }
      } catch (err) {
        // No existing invoice
      }
    }

    loadExisting();
  }, [open, paymentId]);

  const handleSave = async () => {
    if (!invoiceNo || !taxableValue) {
      toast.error("Invoice No and Taxable Value are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invoices/client", {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          clientId,
          clientName,
          invoiceNo,
          invoiceDate,
          hsn,
          gstPercent: Number(gstPercent),
          taxableValue: Number(taxableValue),
          description,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(existing ? "Invoice updated" : "Invoice created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900">
          {existing ? "Edit" : "Create"} Client Invoice
        </h2>
        <p className="mt-1 text-sm text-slate-600">For: {clientName}</p>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice No</Label>
              <Input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="RS-CLI-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>HSN/SAC Code (Optional)</Label>
            <Input value={hsn} onChange={(e) => setHsn(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GST %</Label>
              <Input
                type="number"
                value={gstPercent}
                onChange={(e) => setGstPercent(e.target.value)}
                min="0"
                max="28"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Taxable Value (₹)</Label>
              <Input
                type="number"
                value={taxableValue}
                onChange={(e) => setTaxableValue(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Supply of fresh fish"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : existing ? "Update" : "Save"} Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
