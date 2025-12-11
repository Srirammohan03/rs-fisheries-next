"use client";

import { useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/helpers/Field";

export default function Salaries() {
  const [employeeName, setEmployeeName] = useState("");
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    console.log("Salary:", { employeeName, month, amount, notes });
    toast.success("Salary record saved successfully");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Salaries</h1>
        <p className="text-muted-foreground mt-1">
          Manage employee salary records
        </p>
      </div>

      <CardCustom
        title="Employee Salary"
        actions={
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        }
      >
        <div className="space-y-4 max-w-2xl">
          <Field label="Employee Name">
            <Input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Enter employee name"
            />
          </Field>

          <Field label="Month">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </Field>

          <Field label="Amount">
            <Input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter salary amount"
            />
          </Field>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={4}
            />
          </Field>
        </div>
      </CardCustom>
    </div>
  );
}
