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

interface Props {
  open: boolean;
  onClose: () => void;
  clientDetailsId: string; // ✅ master Client.id
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
];

const descriptionOptions = [
  { value: "Supply of Fresh Fish", label: "Supply of Fresh Fish" },
  { value: "Supply of Chilled Fish", label: "Supply of Chilled Fish" },
  { value: "Supply of Frozen Fish", label: "Supply of Frozen Fish" },
  { value: "Supply of Fish Fillets", label: "Supply of Fish Fillets" },
  { value: "Supply of Prawns/Shrimps", label: "Supply of Prawns/Shrimps" },
  { value: "Supply of Squid/Cuttlefish", label: "Supply of Squid/Cuttlefish" },
  {
    value: "Supply of Processed Seafood",
    label: "Supply of Processed Seafood",
  },
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
  const [description, setDescription] = useState("");
  const [billTo, setBillTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingInvoiceNo, setExistingInvoiceNo] = useState<string | null>(
    null
  );

  const canSave = useMemo(() => {
    return (
      !saving &&
      invoiceNo.trim().length > 0 &&
      hsn.trim().length > 0 &&
      description.trim().length > 0 &&
      billTo.trim().length > 0
    );
  }, [saving, invoiceNo, hsn, description, billTo]);

  useEffect(() => {
    if (!open) return;

    setExistingInvoiceNo(null);
    setInvoiceNo("");
    setHsn("");
    setDescription("");
    setBillTo("");

    (async () => {
      let client: any = null;

      try {
        const clientRes = await axios.get(`/api/client/${clientDetailsId}`);
        client = clientRes?.data?.data ?? null;
      } catch (e) {
        client = null;
      }

      try {
        const res = await axios.get(
          `/api/invoices/client/by-payment?paymentId=${paymentId}`
        );
        const inv = res.data.invoice;

        setInvoiceNo(inv.invoiceNo);
        setExistingInvoiceNo(inv.invoiceNo);
        setHsn(inv.hsn ? String(inv.hsn) : "");
        setDescription(inv.description ? String(inv.description) : "");

        const autoBillTo = client
          ? buildBillToFromClient(client, clientName)
          : clientName;

        const savedBillTo = String(inv.billTo || "").trim();
        setBillTo(
          savedBillTo && !looksLikeOnlyName(savedBillTo)
            ? savedBillTo
            : autoBillTo
        );
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const next = await axios.get("/api/invoices/next-number");
          setInvoiceNo(next.data.invoiceNumber);

          const autoBillTo = client
            ? buildBillToFromClient(client, clientName)
            : clientName;
          setBillTo(autoBillTo);
        } else {
          console.error(err);
        }
      }
    })();
  }, [open, paymentId, clientDetailsId, clientName]);

  const saveInvoice = async () => {
    try {
      setSaving(true);

      let finalInvoiceNo = invoiceNo;

      if (!existingInvoiceNo) {
        const reserve = await axios.post("/api/invoices/next-number");
        finalInvoiceNo = reserve.data.invoiceNumber;
      }

      await axios.post("/api/invoices/client", {
        paymentId,
        clientId: clientDetailsId, // ✅ IMPORTANT: API expects clientId
        clientName,
        invoiceNo: finalInvoiceNo,
        billTo: billTo.trim(),
        hsn: hsn.trim(),
        description: description.trim(),
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
            {!hsn && (
              <div className="mt-1 text-xs text-red-600">HSN is required</div>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Select value={description} onValueChange={setDescription}>
              <SelectTrigger>
                <SelectValue placeholder="Select Description" />
              </SelectTrigger>
              <SelectContent>
                {descriptionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!description && (
              <div className="mt-1 text-xs text-red-600">
                Description is required
              </div>
            )}
          </div>

          <div>
            <Label>Bill To (Buyer)</Label>
            <div className="text-xs text-slate-500 mb-2">
              Auto-filled from client details (billingAddress + state + gstin).
              You can edit if needed.
            </div>
            <textarea
              rows={8}
              value={billTo}
              onChange={(e) => setBillTo(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#139BC3]/30"
            />
            {!billTo.trim() && (
              <div className="mt-1 text-xs text-red-600">
                Bill To is required
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Button
            onClick={saveInvoice}
            disabled={!canSave}
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
