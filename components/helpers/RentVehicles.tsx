"use client";

import { useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Save } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/helpers/Field";
import { Badge } from "@/components/ui/badge";

type PaymentMode = "cash" | "ac" | "upi";

export function RentVehicles() {
  const [trip, setTrip] = useState("");
  const [date, setDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [rentAmount, setRentAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");

  const handleSave = () => {
    console.log("Rent Vehicle:", {
      trip,
      date,
      vehicleNo,
      rentAmount,
      paymentMode,
    });
    toast.success("Successfully added Rent vehicle recorded");
  };

  return (
    <CardCustom
      title="5B. Rent Vehicles"
      actions={
        <Button onClick={handleSave} size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Trip">
            <Input
              value={trip}
              onChange={(e) => setTrip(e.target.value)}
              placeholder="Enter trip"
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Vehicle No.">
            <Input
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              placeholder="Vehicle number"
            />
          </Field>
        </div>

        <Field label="Rent Amount">
          <Input
            type="number"
            value={rentAmount || ""}
            onChange={(e) => setRentAmount(parseFloat(e.target.value) || 0)}
            placeholder="Enter amount"
          />
        </Field>

        <div>
          <label className="text-sm font-medium mb-2 block">Payment Mode</label>
          <div className="flex gap-2 flex-wrap">
            {(["ac", "upi", "cash"] as PaymentMode[]).map((mode) => (
              <Badge
                key={mode}
                variant={paymentMode === mode ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setPaymentMode(mode)}
              >
                {mode === "ac"
                  ? "A/C"
                  : mode === "upi"
                  ? "UPI"
                  : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
