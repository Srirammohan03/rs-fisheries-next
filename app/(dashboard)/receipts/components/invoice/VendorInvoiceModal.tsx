// app/(dashboard)/receipts/components/invoice/VendorInvoiceModal.tsx
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
import { Textarea } from "@/components/ui/textarea"; // ← Add this

interface Props {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  source: "farmer" | "agent";
  onSaved: () => void;
  paymentId: string;
}

export function VendorInvoiceModal({
  open,
  onClose,
  vendorId,
  vendorName,
  source,
  paymentId,
  onSaved,
}: Props) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [hsn, setHsn] = useState("");
  const [gstPercent, setGstPercent] = useState(18); // default 18%
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    axios
      .get("/api/invoices/next-number")
      .then((res) => setInvoiceNo(res.data.invoiceNumber))
      .catch(() => setInvoiceNo(""));
  }, [open]);

  const saveInvoice = async () => {
    try {
      setSaving(true);

      // ✅ Reserve invoice number ONLY on save
      const reserve = await axios.post("/api/invoices/next-number");
      const finalInvoiceNo = reserve.data.invoiceNumber;

      await axios.post("/api/invoices/vendor", {
        paymentId,
        vendorId,
        vendorName,
        source,
        invoiceNo: finalInvoiceNo, // ✅ guaranteed unique
        hsn,
        gstPercent,
        billTo,
        shipTo,
      });

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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vendor GST Invoice Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Invoice No</Label>
              <Input value={invoiceNo} disabled />
            </div>
            <div>
              <Label>Vendor Name</Label>
              <Input value={vendorName} disabled />
            </div>
            <div>
              <Label>HSN / SAC</Label>
              <Input
                value={hsn}
                onChange={(e) => setHsn(e.target.value)}
                placeholder="e.g. 721710"
              />
            </div>
            <div>
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                value={gstPercent}
                onChange={(e) => setGstPercent(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Bill To (Buyer)</Label>
              <Textarea
                rows={6}
                placeholder="Company Name&#10;Address Line 1&#10;Address Line 2&#10;City, State - PIN&#10;GSTIN: XXAAAAA0000X0XX&#10;State: State Name, Code: XX"
                value={billTo}
                onChange={(e) => setBillTo(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Consignee (Ship To)</Label>
              <Textarea
                rows={6}
                placeholder="Same as Bill To or different shipping address"
                value={shipTo}
                onChange={(e) => setShipTo(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={saveInvoice}
          disabled={saving || !invoiceNo || !hsn || !billTo}
          className="w-full mt-6"
        >
          {saving ? "Saving..." : "Save & Finalize Invoice"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
