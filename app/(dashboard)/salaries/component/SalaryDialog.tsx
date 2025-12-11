"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/helpers/Field";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { useUsers } from "@/utils/api-config";

export default function SalaryDialog({
  open,
  onClose,
  onSubmit,
  mode,
  defaultValues,
  isLoading,
}: any) {
  const { register, setValue, handleSubmit, reset, watch } = useForm<any>({
    defaultValues: {
      userId: "",
      month: "",
      amount: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && defaultValues) {
        const m = new Date(defaultValues.month);
        const monthStr = `${m.getFullYear()}-${String(
          m.getMonth() + 1
        ).padStart(2, "0")}`;

        reset({
          userId: defaultValues.userId,
          amount: defaultValues.amount,
          notes: defaultValues.notes,
          month: monthStr,
        });
      } else {
        reset({
          userId: "",
          amount: "",
          notes: "",
          month: "",
        });
      }
    }
  }, [open, defaultValues, reset, mode]);

  const { data: users } = useUsers();

  const submitHandler = (data: any) => {
    const finalPayload = {
      ...data,
      month: `${data.month}-01`,
      amount: Number(data.amount),
    };
    onSubmit(finalPayload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Salary" : "Edit Salary"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
          <Field label="Employee">
            <Select
              value={watch("userId")}
              onValueChange={(v) => setValue("userId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Month">
            <Input type="month" {...register("month")} />
          </Field>

          <Field label="Amount">
            <Input type="number" {...register("amount")} />
          </Field>

          <Field label="Notes">
            <Textarea rows={4} {...register("notes")} />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? mode === "add"
                  ? "Saving..."
                  : "Updating..."
                : mode === "add"
                ? "Save"
                : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
