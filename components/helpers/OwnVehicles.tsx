"use client";

import { useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/helpers/Field";
import { Save } from "lucide-react";
import { toast } from "sonner";

export function OwnVehicles() {
  const [trip, setTrip] = useState("");
  const [date, setDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [diesel, setDiesel] = useState(0);
  const [service, setService] = useState(0);
  const [fastag, setFastag] = useState(0);
  const [eChallan, setEChallan] = useState(0);
  const [tyres, setTyres] = useState(0);

  const total = diesel + service + fastag + eChallan + tyres;

  const handleSave = () => {
    console.log("Own Vehicle:", {
      trip,
      date,
      vehicleNo,
      diesel,
      service,
      fastag,
      eChallan,
      tyres,
      total,
    });
    toast.success("Successfully added Vehicle expenses recorded");
  };

  return (
    <CardCustom
      title="5A. RSF Vehicles (Own)"
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

        <div className="grid grid-cols-2 gap-4">
          <Field label="Diesel">
            <Input
              type="number"
              value={diesel || ""}
              onChange={(e) => setDiesel(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Service">
            <Input
              type="number"
              value={service || ""}
              onChange={(e) => setService(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Fastag">
            <Input
              type="number"
              value={fastag || ""}
              onChange={(e) => setFastag(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="E-challan">
            <Input
              type="number"
              value={eChallan || ""}
              onChange={(e) => setEChallan(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Tyres">
            <Input
              type="number"
              value={tyres || ""}
              onChange={(e) => setTyres(parseFloat(e.target.value) || 0)}
            />
          </Field>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Expense:</span>
            <span className="text-xl font-bold">₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
