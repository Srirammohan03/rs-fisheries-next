"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^[6789]\d{9}$/,
      "Invalid phone number format or Must be 10 digits."
    ),
  licenseNumber: z
    .string()
    .min(1, "License number is required")
    .regex(
      /^[A-Z]{2}\s?\d{2}\s?\d{4}\s?\d{7}$/,
      "Invalid license number format (e.g., MH 12 2010 0123456)"
    ),
  address: z.string().min(1, "address is required"),
  age: z
    .string()
    .regex(/^(1[89]|[2-9]\d|100)$/, "Age must be between 18 and 100"),
  aadharNumber: z
    .string()
    .regex(/^[2-9]{1}[0-9]{11}$/, "Invalid Aadhar number format"),
});

type DriverForm = z.infer<typeof schema>;

export function AddDriverDialog() {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const addMutation = useMutation({
    mutationFn: async (payload: DriverForm) => {
      const { data: res } = await axios.post("/api/driver", payload, {
        withCredentials: true,
      });
      return res;
    },
    onSuccess: async (data) => {
      toast.success(data.message ?? "Driver added successfully");
      reset();
      setOpen(false);
    },
    onError: async (err: any) => {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to add driver";

      toast.error(msg);
    },
  });

  const onSubmit = (data: DriverForm) => {
    const payload = {
      ...data,
    };

    addMutation.mutate(payload);
  };

  const fields: { label: string; name: keyof DriverForm }[] = [
    { label: "Name", name: "name" },
    { label: "Phone", name: "phone" },
    { label: "License Number", name: "licenseNumber" },
    { label: "Address", name: "address" },
    { label: "Age", name: "age" },
    { label: "Aadhar Number", name: "aadharNumber" },
  ];

  const loading = addMutation.isPending;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Driver</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Driver</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map(({ label, name }) => (
            <div key={name} className="space-y-1">
              <Label>{label}</Label>

              <Input {...register(name)} />

              {errors[name] && (
                <p className="text-red-600 text-sm">
                  {errors[name]?.message?.toString()}
                </p>
              )}
            </div>
          ))}

          <Button className="w-full" type="submit" disabled={loading}>
            {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            Save Driver
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
