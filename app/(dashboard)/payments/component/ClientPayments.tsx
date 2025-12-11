"use client";

import { useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/helpers/Field";

type PaymentMode = "cash" | "ac" | "upi" | "cheque";

export function ClientPayments() {
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");

  const handleSave = () => {
    console.log("Client Payment:", { clientName, date, amount, paymentMode });
    toast.success("Client payment recorded");
  };

  return (
    <CardCustom
      title="3B. Client Payments"
      actions={
        <Button onClick={handleSave} size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Client Name">
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter name"
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Amount">
          <Input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            placeholder="Enter amount"
          />
        </Field>
        <div>
          <label className="text-sm font-medium mb-2 block">Payment Mode</label>
          <div className="flex gap-2 flex-wrap">
            {(["cash", "ac", "upi", "cheque"] as PaymentMode[]).map((mode) => (
              <Badge
                key={mode}
                variant={paymentMode === mode ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setPaymentMode(mode)}
              >
                {mode === "ac"
                  ? "A/C"
                  : mode === "upi"
                  ? "UPI/PhonePe"
                  : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
