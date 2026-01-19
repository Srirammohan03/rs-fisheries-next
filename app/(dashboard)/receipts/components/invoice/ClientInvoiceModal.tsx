// app/(dashboard)/receipts/components/invoice/ClientInvoiceModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onClose: () => void;
  clientDetailsId: string;
  clientName: string;
  paymentId: string;
  onSaved: () => void;
}

const hsnOptions = [
  { value: "0302", label: "0302 - Fresh or Chilled Fish" },
  { value: "0303", label: "0303 - Frozen Fish" },
  { value: "0304", label: "0304 - Fish Fillets & Other Fish Meat" },
  { value: "0305", label: "0305 - Dried, Salted or Smoked Fish" },
  { value: "0306", label: "0306 - Crustaceans (Prawns, Shrimps)" },
  { value: "0307", label: "0307 - Molluscs (Squid, Cuttlefish)" },
  { value: "1604", label: "1604 - Prepared or Preserved Fish" },
  { value: "1605", label: "1605 - Prepared Crustaceans & Molluscs" },
  { value: "other", label: "Other (Custom HSN)" },
];

const descriptionOptions = [
  { value: "Supply of Fresh Fish", label: "Supply of Fresh Fish" },
  { value: "Supply of Chilled Fish", label: "Supply of Chilled Fish" },
  { value: "Supply of Frozen Fish", label: "Supply of Frozen Fish" },
  { value: "Supply of Fish Fillets", label: "Supply of Fish Fillets" },
  { value: "Supply of Prawns/Shrimps", label: "Supply of Prawns/Shrimps" },
  { value: "Supply of Squid/Cuttlefish", label: "Supply of Squid/Cuttlefish" },
  { value: "Supply of Processed Seafood", label: "Supply of Processed Seafood" },
  { value: "other", label: "Other (Custom Description)" },
];

function buildBillToFromClient(client: any, fallbackName: string) {
  const lines = [
    client?.partyName || fallbackName,
    client?.billingAddress || "",
    client?.state ? `State: ${client.state}` : "",
    client?.gstin ? `GSTIN: ${client.gstin}` : "",
  ].filter(Boolean);

  return lines.join("\n").trim();
}

function looksLikeOnlyName(text: string) {
  const t = (text || "").trim();
  if (!t) return true;
  if (t.includes("\n")) return false;
  const hasDigits = /\d/.test(t);
  const hasComma = t.includes(",");
  const hasDash = t.includes("-");
  return !(hasDigits || hasComma || hasDash);
}

export function ClientInvoiceModal({
  open,
  onClose,
  clientDetailsId,
  clientName,
  paymentId,
  onSaved,
}: Props) {
  const [invoiceNo, setInvoiceNo] = useState("");

  const [hsn, setHsn] = useState("");
  const [customHsn, setCustomHsn] = useState("");

  const [description, setDescription] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  const [billTo, setBillTo] = useState("");

  const [saving, setSaving] = useState(false);
  const [existingInvoiceNo, setExistingInvoiceNo] = useState<string | null>(null);

  const isHsnOther = hsn === "other";
  const isDescriptionOther = description === "other";

  const finalHsn = isHsnOther ? customHsn.trim() : hsn.trim();
  const finalDescription = isDescriptionOther
    ? customDescription.trim()
    : description.trim();

  const canSave = useMemo(() => {
    return (
      !saving &&
      invoiceNo.trim().length > 0 &&
      finalHsn.length > 0 &&
      finalDescription.length > 0 &&
      billTo.trim().length > 0
    );
  }, [saving, invoiceNo, finalHsn, finalDescription, billTo]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    // reset
    setExistingInvoiceNo(null);
    setInvoiceNo("");
    setHsn("");
    setCustomHsn("");
    setDescription("");
    setCustomDescription("");
    setBillTo("");

    (async () => {
      let client: any = null;

      // 1) fetch client (for billTo)
      try {
        const clientRes = await axios.get(`/api/client/${clientDetailsId}`);
        client = clientRes?.data?.data ?? null;
      } catch {
        client = null;
      }

      // 2) fetch invoice by payment
      try {
        const res = await axios.get(
          `/api/invoices/client/by-payment?paymentId=${paymentId}`
        );

        if (cancelled) return;

        const inv = res.data.invoice;

        setInvoiceNo(inv.invoiceNo);
        setExistingInvoiceNo(inv.invoiceNo);

        // ✅ HSN: map to option or custom
        const savedHsn = String(inv.hsn || "").trim();
        const hsnMatch = hsnOptions.find(
          (o) => o.value !== "other" && o.value === savedHsn
        );
        if (hsnMatch) {
          setHsn(hsnMatch.value);
        } else if (savedHsn) {
          setHsn("other");
          setCustomHsn(savedHsn);
        }

        // ✅ Description: map to option or custom
        const savedDesc = String(inv.description || "").trim();
        const descMatch = descriptionOptions.find(
          (o) => o.value !== "other" && o.value === savedDesc
        );
        if (descMatch) {
          setDescription(descMatch.value);
        } else if (savedDesc) {
          setDescription("other");
          setCustomDescription(savedDesc);
        }

        const autoBillTo = client ? buildBillToFromClient(client, clientName) : clientName;
        const savedBillTo = String(inv.billTo || "").trim();

        setBillTo(
          savedBillTo && !looksLikeOnlyName(savedBillTo) ? savedBillTo : autoBillTo
        );
      } catch (err: any) {
        if (cancelled) return;

        // invoice not found -> create next number + auto billTo
        if (err?.response?.status === 404) {
          try {
            const next = await axios.get("/api/invoices/next-number?type=client");
            setInvoiceNo(next.data.invoiceNumber);
          } catch {
            setInvoiceNo("Error loading number");
          }

          const autoBillTo = client ? buildBillToFromClient(client, clientName) : clientName;
          setBillTo(autoBillTo);
        } else {
          console.error(err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, paymentId, clientDetailsId, clientName]);

  const saveInvoice = async () => {
    try {
      setSaving(true);

      let finalInvoiceNo = invoiceNo;

      // reserve only when new invoice
      if (!existingInvoiceNo) {
        const reserve = await axios.post("/api/invoices/next-number", {
          type: "client",
        });
        finalInvoiceNo = reserve.data.invoiceNumber;
      }

      await axios.post("/api/invoices/client", {
        paymentId,
        clientId: clientDetailsId,
        clientName,
        invoiceNo: finalInvoiceNo,
        billTo: billTo.trim(),
        hsn: finalHsn,
        description: finalDescription,
        gstPercent: 0,
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
          <DialogTitle>Client GST Invoice Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* HSN */}
          <div>
            <Label>HSN Code</Label>
            <Select value={hsn} onValueChange={setHsn}>
              <SelectTrigger>
                <SelectValue placeholder="Select HSN Code" />
              </SelectTrigger>
              <SelectContent>
                {hsnOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isHsnOther && (
              <div className="mt-3">
                <Label>Custom HSN</Label>
                <Input
                  value={customHsn}
                  onChange={(e) => setCustomHsn(e.target.value)}
                  placeholder="Enter custom HSN"
                />
              </div>
            )}

            {!finalHsn && (
              <div className="mt-1 text-xs text-red-600">HSN is required</div>
            )}
          </div>

          {/* ✅ Description (fixed) */}
          <div>
            <Label>Description of Supply</Label>
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

            {isDescriptionOther && (
              <div className="mt-3">
                <Label>Custom Description</Label>
                <Textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Enter custom description"
                />
              </div>
            )}

            {!finalDescription && (
              <div className="mt-1 text-xs text-red-600">
                Description is required
              </div>
            )}
          </div>

          {/* Bill To */}
          <div>
            <Label>Bill To (Buyer)</Label>
            <div className="text-xs text-slate-500 mb-2">
              Auto-filled from client details. You can edit if needed.
            </div>
            <Textarea
              rows={8}
              value={billTo}
              onChange={(e) => setBillTo(e.target.value)}
              className="resize-none font-mono"
            />
            {!billTo.trim() && (
              <div className="mt-1 text-xs text-red-600">
                Bill To is required
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Button onClick={saveInvoice} disabled={!canSave} className="w-full" size="lg">
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
