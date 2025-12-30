"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import axios, { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RentFormType, RentProps, rentSchema } from "./forms/types";

const EditRentVehicle = ({ vehicle }: RentProps) => {
  console.log(vehicle);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RentFormType>({
    resolver: zodResolver(rentSchema),
    defaultValues: {
      vehicleNumber: vehicle.vehicleNumber ?? "",
      rentalAgency: vehicle.rentalAgency ?? "",
      rentalRatePerDay: vehicle.rentalRatePerDay?.toString() ?? "",
      assignedDriverId: vehicle.assignedDriverId ?? "",
      remarks: vehicle.remarks ?? "",
    },
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: RentFormType) => {
      const res = await axios.put(`/api/vehicles/rent/${vehicle.id}`, data, {
        withCredentials: true,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message ?? "Rent vehicle updated successfully");
      queryClient.invalidateQueries({ queryKey: ["rent-vehicles"] });
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message ?? "Error updating vehicle");
      } else {
        toast.error("Error updating vehicle");
      }
    },
  });

  const onSubmit = (data: RentFormType) => {
    const payload = {
      id: vehicle.id,
      ...data,
    };
    updateMutation.mutate(payload);
  };

  const loading = updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* VEHICLE NUMBER */}
      <div className="flex flex-col space-y-1">
        <Label>Vehicle Number *</Label>
        <Input
          {...register("vehicleNumber")}
          placeholder="Enter vehicle number"
        />
        {errors.vehicleNumber && (
          <p className="text-red-600 text-sm">{errors.vehicleNumber.message}</p>
        )}
      </div>

      {/* RENTAL AGENCY */}
      <div className="flex flex-col space-y-1">
        <Label>Rental Agency *</Label>
        <Input {...register("rentalAgency")} placeholder="Rental agency name" />
        {errors.rentalAgency && (
          <p className="text-red-600 text-sm">{errors.rentalAgency.message}</p>
        )}
      </div>

      {/* RATE PER DAY */}
      <div className="flex flex-col space-y-1">
        <Label>Rate Per Day *</Label>
        <Input {...register("rentalRatePerDay")} placeholder="Daily rate" />
        {errors.rentalRatePerDay && (
          <p className="text-red-600 text-sm">
            {errors.rentalRatePerDay.message}
          </p>
        )}
      </div>

      {/* DRIVER ID */}
      {/* <div className="flex flex-col space-y-1">
        <Label>Assigned Driver ID (optional)</Label>
        <Input {...register("assignedDriverId")} placeholder="Driver ID" />
        {errors.assignedDriverId && (
          <p className="text-red-600 text-sm">
            {errors.assignedDriverId.message}
          </p>
        )}
      </div> */}

      {/* REMARKS */}
      <div className="flex flex-col space-y-1">
        <Label>Remarks</Label>
        <Input {...register("remarks")} placeholder="Any notes" />
        {errors.remarks && (
          <p className="text-red-600 text-sm">{errors.remarks.message}</p>
        )}
      </div>

      {/* SUBMIT BUTTON */}
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
        Update Rent Vehicle
      </Button>
    </form>
  );
};

export default EditRentVehicle;
