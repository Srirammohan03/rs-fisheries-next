"use client";

import { useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Save } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/helpers/Field";

export function PackingAmount() {
  const [rajesh, setRajesh] = useState(0);
  const [kishan, setKishan] = useState(0);

  const handleSave = () => {
    console.log("Packing Amount:", { rajesh, kishan });
    toast("Packing amounts recorded");
  };

  return (
    <CardCustom
      title="3D. Packing Amount"
      actions={
        <Button onClick={handleSave} size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Rajesh">
          <Input
            type="number"
            value={rajesh || ""}
            onChange={(e) => setRajesh(parseFloat(e.target.value) || 0)}
            placeholder="Enter amount"
          />
        </Field>
        <Field label="Kishan">
          <Input
            type="number"
            value={kishan || ""}
            onChange={(e) => setKishan(parseFloat(e.target.value) || 0)}
            placeholder="Enter amount"
          />
        </Field>
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total:</span>
            <span className="text-xl font-bold">
              ₹{(rajesh + kishan).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
