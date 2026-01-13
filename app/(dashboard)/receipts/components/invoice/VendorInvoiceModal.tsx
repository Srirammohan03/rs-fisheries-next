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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  source: "farmer" | "agent";
  paymentId: string;
  onSaved: () => void;
}

const descriptionOptions = [
  { value: "Supply of Fresh Raw Fish", label: "Supply of Fresh Raw Fish" },
  { value: "Supply of Chilled Seafood", label: "Supply of Chilled Seafood" },
  {
    value: "Live Fish/Prawns for Farming",
    label: "Live Fish/Prawns for Farming",
  },
  {
    value: "Fresh Harvested Prawns (Head-on)",
    label: "Fresh Harvested Prawns (Head-on)",
  },
  {
    value: "Fresh Harvested Prawns (HL/PUD)",
    label: "Fresh Harvested Prawns (HL/PUD)",
  },
  {
    value: "Bulk Supply of Fresh Squid/Cuttlefish",
    label: "Bulk Supply of Fresh Squid/Cuttlefish",
  },
  { value: "other", label: "Other (Please specify)" },
];

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
  const [customDescription, setCustomDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingInvoiceNo, setExistingInvoiceNo] = useState<string | null>(
    null
  );

  const isOtherSelected = description === "other";

  const finalDescription = isOtherSelected
    ? customDescription.trim()
    : description;

  useEffect(() => {
    if (!open) return;

    setExistingInvoiceNo(null);
    setInvoiceNo("");
    setDescription("");
    setCustomDescription("");

    (async () => {
      try {
        const res = await axios.get(
          `/api/invoices/vendor/by-payment?paymentId=${paymentId}`
        );
        const inv = res.data.invoice;

        setInvoiceNo(inv.invoiceNo);
        setExistingInvoiceNo(inv.invoiceNo);

        const savedDesc = (inv.description || "").trim();
        const matched = descriptionOptions.find(
          (opt) => opt.value !== "other" && opt.value === savedDesc
        );

        if (matched) {
          setDescription(matched.value);
        } else if (savedDesc) {
          setDescription("other");
          setCustomDescription(savedDesc);
        }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          try {
            const next = await axios.get(
              "/api/invoices/next-number?type=vendor"
            );
            setInvoiceNo(next.data.invoiceNumber);
          } catch {
            setInvoiceNo("Error loading number");
          }
        } else {
          console.error(err);
        }
      }
    })();
  }, [open, paymentId]);

  const saveInvoice = async () => {
    if (!finalDescription) {
      alert("Please enter a description");
      return;
    }

    try {
      setSaving(true);

      let finalInvoiceNo = invoiceNo;

      if (!existingInvoiceNo) {
        const reserve = await axios.post("/api/invoices/next-number", {
          type: "vendor",
        });
        finalInvoiceNo = reserve.data.invoiceNumber;
      }

      await axios.post("/api/invoices/vendor", {
        paymentId,
        vendorId,
        vendorName,
        source,
        invoiceNo: finalInvoiceNo,
        hsn: "0303",
        gstPercent: 0,
        description: finalDescription,
      });

      setInvoiceNo(finalInvoiceNo);
      setExistingInvoiceNo(finalInvoiceNo);

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to save invoice");
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

          <div>
            <Label>Description / Particulars</Label>
            <Select value={description} onValueChange={setDescription}>
              <SelectTrigger>
                <SelectValue placeholder="Select description" />
              </SelectTrigger>
              <SelectContent>
                {descriptionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isOtherSelected && (
              <div className="mt-3">
                <Label>Please specify</Label>
                <Textarea
                  rows={3}
                  placeholder="Type custom description here..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                />
                {!customDescription.trim() && isOtherSelected && (
                  <div className="mt-1 text-xs text-red-600">
                    Please enter custom description
                  </div>
                )}
              </div>
            )}

            {!description && (
              <div className="mt-1 text-xs text-red-600">
                Description is required
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Button
            onClick={saveInvoice}
            disabled={saving || !invoiceNo || !finalDescription}
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
