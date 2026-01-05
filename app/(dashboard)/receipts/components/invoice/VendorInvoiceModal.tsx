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
import { Textarea } from "@/components/ui/textarea";

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
  const [description, setDescription] = useState("");
  // const [vendorAddress, setVendorAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const [existingInvoiceNo, setExistingInvoiceNo] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!open) return;

    setExistingInvoiceNo(null);

    (async () => {
      try {
        // Load existing invoice if exists
        const res = await axios.get(
          `/api/invoices/vendor/by-payment?paymentId=${paymentId}`
        );
        const inv = res.data.invoice;

        setInvoiceNo(inv.invoiceNo);
        setExistingInvoiceNo(inv.invoiceNo);
        setDescription(inv.description ?? "");
        // setVendorAddress(inv.vendorAddress ?? "");
      } catch (err: any) {
        if (err?.response?.status === 404) {
          // New invoice - fetch next number
          try {
            const next = await axios.get("/api/invoices/next-number");
            setInvoiceNo(next.data.invoiceNumber);
          } catch {
            setInvoiceNo("");
          }

          // Reset fields
          setDescription("");
          // setVendorAddress("");
        } else {
          console.error(err);
          setInvoiceNo("");
        }
      }
    })();
  }, [open, paymentId]);

  const saveInvoice = async () => {
    if (!description.trim()) {
      alert("Please enter a description");
      return;
    }

    try {
      setSaving(true);

      let finalInvoiceNo = invoiceNo;

      if (!existingInvoiceNo) {
        const reserve = await axios.post("/api/invoices/next-number");
        finalInvoiceNo = reserve.data.invoiceNumber;
      }

      await axios.post("/api/invoices/vendor", {
        paymentId,
        vendorId,
        vendorName,
        source,
        invoiceNo: finalInvoiceNo,
        hsn: "0303", // Fixed for fish
        gstPercent: 0, // 0% GST
        description,
        // vendorAddress: vendorAddress.trim() || null,
        // No other optional fields sent
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
          <DialogTitle>Vendor GST Invoice Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice No + Vendor Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Invoice No</Label>
              <Input value={invoiceNo} disabled className="bg-slate-50" />
            </div>
            <div>
              <Label>Vendor Name</Label>
              <Input value={vendorName} disabled className="bg-slate-50" />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description (Goods / Service)</Label>
            <Textarea
              rows={4}
              placeholder="e.g. Purchase of fresh fish / Loading charges / Agent commission"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Vendor Address */}
          {/* <div>
            <Label>Vendor Address</Label>
            <Textarea
              rows={5}
              placeholder="Full address: Village, Taluk, District, State - PIN Code"
              value={vendorAddress}
              onChange={(e) => setVendorAddress(e.target.value)}
              className="resize-none"
            />
          </div> */}
        </div>

        <div className="mt-8">
          <Button
            onClick={saveInvoice}
            disabled={saving || !invoiceNo || !description.trim()}
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
