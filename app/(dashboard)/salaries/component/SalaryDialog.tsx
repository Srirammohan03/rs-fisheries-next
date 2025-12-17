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
      <DialogContent className="sm:max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-xl p-0">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-slate-900">
              {mode === "add" ? "Add Salary" : "Edit Salary"}
            </DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "add"
              ? "Create a new salary entry for an employee."
              : "Update salary amount and notes."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(submitHandler)} className="p-6 space-y-5">
          <Field label="Employee">
            <Select
              value={watch("userId")}
              onValueChange={(v) => setValue("userId", v)}
            >
              <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="border-slate-200">
                {users?.map((u: any) => (
                  <SelectItem key={u.id} value={u.id} className="py-3">
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Month">
              <Input
                type="month"
                {...register("month")}
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>

            <Field label="Amount">
              <Input
                type="number"
                {...register("amount")}
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              rows={4}
              {...register("notes")}
              className="border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              placeholder="Add any notes (optional)"
            />
          </Field>

          {/* Footer */}
          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              type="button"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
            >
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
