"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserFormValues, UserValidationSchema } from "@/utils/user-types";
import { useEffect, useState } from "react";
import { Employee, useEmployee } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormValues) => void;
  mode: "add" | "edit";
  defaultValues?: { employeeId: string } | null;
  isLoading: boolean;
}

export default function UserDialog({
  open,
  onClose,
  onSubmit,
  mode,
  defaultValues,
  isLoading,
}: Props) {
  const { handleSubmit, reset, control } = useForm<UserFormValues>({
    resolver: zodResolver(UserValidationSchema),
    defaultValues: {
      employeeId: "",
      password: "",
    },
  });

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  const {
    data: res,
    isLoading: isEmployeeLoading,
    isError: isEmployeeError,
  } = useEmployee();

  useEffect(() => {
    if (!open || !res?.data) return;

    if (mode === "edit" && defaultValues) {
      const emp = res.data.find((e) => e.id === defaultValues.employeeId);

      reset({
        employeeId: defaultValues.employeeId,
        password: "",
      });

      if (emp) setSelectedEmployee(emp);
    } else {
      reset({
        employeeId: "",
        password: "",
      });
      setSelectedEmployee(null);
    }
  }, [open, mode, defaultValues, res?.data, reset]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl p-0">
        {/* Header */}
        <div className="p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {mode === "add" ? "Add User" : "Edit User"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form
          onSubmit={handleSubmit((data) => {
            const payload = { ...data };

            if (
              mode === "edit" &&
              (!payload.password || payload.password.trim() === "")
            ) {
              delete payload.password;
            }

            onSubmit(payload);
          })}
          className="p-6 space-y-5"
        >
          {/* Employee */}
          <div className="space-y-2">
            <Label>Employee</Label>
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <Select
                  disabled={
                    isEmployeeLoading || isEmployeeError || mode === "edit"
                  }
                  value={field.value}
                  onValueChange={(id) => {
                    const emp = res?.data.find((e) => e.id === id);
                    if (!emp) return;

                    field.onChange(id);
                    setSelectedEmployee(emp);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>

                  <SelectContent>
                    {res?.data.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Employee Details (Read-only) */}
          {selectedEmployee && (
            <>
              <div className="space-y-2">
                <Label>Employee Name</Label>
                <Input value={selectedEmployee.fullName} readOnly />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={selectedEmployee.email ?? ""} readOnly />
              </div>

              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={selectedEmployee.designation} readOnly />
              </div>
            </>
          )}

          {/* Password */}
          <div className="space-y-2">
            <Label>
              {mode === "add" ? "Password" : "New Password (optional)"}
            </Label>
            <Input
              type="password"
              placeholder={
                mode === "add"
                  ? "Enter password"
                  : "Leave blank to keep existing password"
              }
              {...control.register("password")}
            />
          </div>

          {/* Footer */}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button type="submit" disabled={isLoading}>
              {mode === "add" ? "Create User" : "Update User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
