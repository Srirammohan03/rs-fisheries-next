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
    if (open) {
      if (mode === "edit" && defaultValues) {
        reset({
          email: defaultValues.email,
          name: defaultValues.name || "",
          role: defaultValues.role,
          password: "",
        });
      } else {
        reset({
          email: "",
          name: "",
          role: "readOnly",
          password: "",
        });
      }
    }
  }, [open, mode, defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add User" : "Edit User"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label>Email</label>
            <Input {...register("email")} placeholder="user@example.com" />
          </div>

          {mode === "add" && (
            <div>
              <label>Password</label>
              <Input
                type="password"
                {...register("password")}
                placeholder="Enter password"
              />
            </div>
          )}

          <div>
            <label>Name</label>
            <Input {...register("name")} placeholder="John Doe" />
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <Select
              defaultValue={watch("role")}
              onValueChange={(value) => setValue("role", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="clerk">Clerk</SelectItem>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="readOnly">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
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
