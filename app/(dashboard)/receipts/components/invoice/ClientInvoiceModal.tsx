// app/(dashboard)/receipts/components/invoice/ClientInvoiceModal.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  paymentId: string;
  onSaved: () => void;
}

export function ClientInvoiceModal({
  open,
  onClose,
  clientId,
  clientName,
  paymentId,
  onSaved,
}: Props) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingInvoiceNo, setExistingInvoiceNo] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!open) return;

    setExistingInvoiceNo(null);
    setInvoiceNo("");

    (async () => {
      try {
        // 1️⃣ Check if invoice already exists
        const res = await axios.get(
          `/api/invoices/client/by-payment?paymentId=${paymentId}`
        );

        const inv = res.data.invoice;

        // Existing invoice → reuse number
        setInvoiceNo(inv.invoiceNo);
        setExistingInvoiceNo(inv.invoiceNo);
        setBillTo(inv.billTo ?? "");
        setShipTo(inv.shipTo ?? "");
      } catch (err: any) {
        // 2️⃣ No invoice → preview next invoice number
        if (err?.response?.status === 404) {
          const next = await axios.get("/api/invoices/next-number");

          setInvoiceNo(next.data.invoiceNumber);
          setBillTo("");
          setShipTo("");
        } else {
          console.error(err);
        }
      }
    })();
  }, [open, paymentId]);

  const saveInvoice = async () => {
    if (!billTo.trim() || !shipTo.trim()) {
      alert("Please fill both Bill To and Ship To");
      return;
    }

    try {
      setSaving(true);

      let finalInvoiceNo = invoiceNo;

      if (!existingInvoiceNo) {
        const reserve = await axios.post("/api/invoices/next-number");
        finalInvoiceNo = reserve.data.invoiceNumber;
      }

      await axios.post("/api/invoices/client", {
        paymentId,
        clientId,
        clientName,
        invoiceNo: finalInvoiceNo,
        billTo: billTo.trim(),
        shipTo: shipTo.trim(),
        hsn: "0302", // Fixed HSN for fish sales
        gstPercent: 0, // Common GST rate for clients
      });

      setInvoiceNo(finalInvoiceNo);
      setExistingInvoiceNo(finalInvoiceNo);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Client GST Invoice Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice No + Client Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Invoice No</Label>
              <Input value={invoiceNo} disabled className="bg-slate-50" />
            </div>
            <div>
              <Label>Client Name</Label>
              <Input value={clientName} disabled className="bg-slate-50" />
            </div>
          </div>

          {/* Bill To */}
          <div>
            <Label>Bill To (Buyer)</Label>
            <Textarea
              rows={6}
              placeholder="Client Company Name&#10;Address Line 1&#10;Address Line 2&#10;City, State - PIN&#10;GSTIN: XXAAAAA0000X0XX"
              value={billTo}
              onChange={(e) => setBillTo(e.target.value)}
              className="resize-none font-mono text-sm"
            />
          </div>

          {/* Ship To */}
          <div>
            <Label>Consignee (Ship To)</Label>
            <Textarea
              rows={6}
              placeholder="Same as Bill To or different shipping address"
              value={shipTo}
              onChange={(e) => setShipTo(e.target.value)}
              className="resize-none font-mono text-sm"
            />
          </div>
        </div>

        <div className="mt-8">
          <Button
            onClick={saveInvoice}
            disabled={saving || !invoiceNo || !billTo.trim() || !shipTo.trim()}
            className="w-full"
            size="lg"
          >
            {saving
              ? "Saving..."
              : existingInvoiceNo
              ? "Update Invoice"
              : "Save & Finalize Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
