"use client";

import { useForm } from "react-hook-form";
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
import { UserFormValues, UserValidationSchema, User } from "@/utils/user-types";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormValues) => void;
  mode: "add" | "edit";
  defaultValues?: User | null;
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
  const { register, handleSubmit, setValue, reset, watch } =
    useForm<UserFormValues>({
      resolver: zodResolver(UserValidationSchema),
      defaultValues: {
        email: "",
        name: "",
        role: "readOnly",
        password: "",
      },
    });

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && defaultValues) {
      reset({
        email: defaultValues.email,
        name: defaultValues.name || "",
        role: defaultValues.role,
        password: "", // ✅ keep empty (optional update)
      });
    } else {
      reset({
        email: "",
        name: "",
        role: "readOnly",
        password: "",
      });
    }
  }, [open, mode, defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-xl p-0">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-slate-900">
              {mode === "add" ? "Add User" : "Edit User"}
            </DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "add"
              ? "Create a new user and assign access role."
              : "Update user details and permissions."}
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((data) => {
            // ✅ If edit mode and password is empty, remove it so API won't update it
            const payload = { ...data };
            if (
              mode === "edit" &&
              (!payload.password || payload.password.trim() === "")
            ) {
              delete (payload as any).password;
            }
            onSubmit(payload);
          })}
          className="p-6 space-y-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <Input
              {...register("email")}
              placeholder="user@example.com"
              className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </div>

          {/* ✅ Password field: Add mode = required visually, Edit mode = optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {mode === "add" ? "Password" : "New Password (optional)"}
            </label>

            <Input
              type="password"
              {...register("password")}
              placeholder={
                mode === "add"
                  ? "Enter password"
                  : "Leave blank to keep current password"
              }
              className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />

            <p className="text-xs text-slate-500">
              {mode === "add"
                ? "Use a strong password (minimum 8 characters recommended)."
                : "If you enter a password, it will replace the current one."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <Input
              {...register("name")}
              placeholder="John Doe"
              className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Role</label>
            <Select
              value={watch("role")}
              onValueChange={(value) => setValue("role", value as any)}
            >
              <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>

              <SelectContent className="border-slate-200">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="clerk">Clerk</SelectItem>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="readOnly">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
                  ? "Creating..."
                  : "Updating..."
                : mode === "add"
                ? "Create"
                : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
