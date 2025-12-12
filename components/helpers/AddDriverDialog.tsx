"use client";

import { useState } from "react";
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
});

type DriverForm = z.infer<typeof driverSchema>;

export function AddDriverDialog({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: DriverForm) => {
      const { data: res } = await axios.post("/api/vehicles/add-driver", {
        ...data,
        vehicleId,
      });
      return res;
    },
    onSuccess: () => {
      toast.success("Driver added");
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Error");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add Driver
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Driver</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input {...register("name")} />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Phone</Label>
            <Input {...register("phone")} />
          </div>

          <div className="space-y-1">
            <Label>License Number</Label>
            <Input {...register("licenseNumber")} />
          </div>

          <Button
            className="w-full"
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            Save Driver
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
