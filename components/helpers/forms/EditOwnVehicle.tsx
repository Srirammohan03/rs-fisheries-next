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
import { useState, useEffect } from "react";
import { OwnFormType, ownSchema, Props } from "./types";

const EditOwnVehicle = ({ vehicle }: Props) => {
  const queryClient = useQueryClient();
  const NO_DRIVER = "NONE";
  const [selected, setSelected] = useState<string>(NO_DRIVER);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<OwnFormType>({
    resolver: zodResolver(ownSchema),
  });

  useEffect(() => {
    if (vehicle) {
      reset({
        vehicleNumber: vehicle.vehicleNumber?.toUpperCase() ?? "",
        manufacturer: vehicle.manufacturer ?? "",
        model: vehicle.model ?? "",
        yearOfManufacture: vehicle.yearOfManufacture?.toString() ?? "",
        fuelType: vehicle.fuelType ?? undefined,
        engineNumber: vehicle.engineNumber ?? "",
        chassisNumber: vehicle.chassisNumber ?? "",
        capacityInTons: vehicle.capacityInTons?.toString() ?? "",
        bodyType: vehicle.bodyType ?? "",
        rcValidity: vehicle.rcValidity ? vehicle.rcValidity.slice(0, 10) : "",
        insuranceExpiry: vehicle.insuranceExpiry
          ? vehicle.insuranceExpiry.slice(0, 10)
          : "",
        fitnessExpiry: vehicle.fitnessExpiry
          ? vehicle.fitnessExpiry.slice(0, 10)
          : "",
        pollutionExpiry: vehicle.pollutionExpiry
          ? vehicle.pollutionExpiry.slice(0, 10)
          : "",
        permitExpiry: vehicle.permitExpiry
          ? vehicle.permitExpiry.slice(0, 10)
          : "",
        roadTaxExpiry: vehicle.roadTaxExpiry
          ? vehicle.roadTaxExpiry.slice(0, 10)
          : "",
        remarks: vehicle.remarks ?? "",
      });
      const driverId = vehicle.assignedDriver?.id || vehicle.assignedDriverId;
      setSelected(driverId ? driverId : NO_DRIVER);
    }
  }, [vehicle, reset]);

  const updateMutation = useMutation({
    mutationFn: async (formData: OwnFormType) => {
      let payload: any = {
        ...formData,
        id: vehicle.id,
        assignedDriverId: selected === "None" ? null : selected,
      };

      if (!payload.yearOfManufacture?.trim()) {
        delete payload.yearOfManufacture;
      }

      if (!payload.capacityInTons?.trim()) {
        delete payload.capacityInTons;
      }

      const { data: res } = await axios.put(
        `/api/vehicles/own/${vehicle.id}`,
        payload,
        { withCredentials: true }
      );
      return res;
    },
    onSuccess: () => {
      toast.success("Own vehicle updated successfully");
      queryClient.invalidateQueries({ queryKey: ["own-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["available-drivers"] });
    },
    onError: (err: any) => {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message ?? "Something went wrong");
      } else {
        toast.error("Something went wrong");
      }
    },
  });

  const onSubmit = (data: OwnFormType) => {
    updateMutation.mutate(data);
  };

  const loading = updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Vehicle Number */}
      <div className="flex flex-col space-y-1">
        <Label>Vehicle Number *</Label>
        <Input
          {...register("vehicleNumber")}
          placeholder="Enter vehicle number"
          onChange={(e) => {
            const value = e.target.value.toUpperCase();
            setValue("vehicleNumber", value, { shouldValidate: true });
          }}
        />
        {errors.vehicleNumber && (
          <p className="text-red-600 text-sm">{errors.vehicleNumber.message}</p>
        )}
      </div>

      {/* Basic */}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col space-y-1">
          <Label>Manufacturer</Label>
          <Input {...register("manufacturer")} placeholder="Manufacturer" />
          {errors.manufacturer && (
            <p className="text-red-600 text-sm">
              {errors.manufacturer.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Model</Label>
          <Input {...register("model")} placeholder="Model" />
          {errors.model && (
            <p className="text-red-600 text-sm">{errors.model.message}</p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Year of Manufacture</Label>
          <Input {...register("yearOfManufacture")} placeholder="2020" />
          {errors.yearOfManufacture && (
            <p className="text-red-600 text-sm">
              {errors.yearOfManufacture.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Fuel Type *</Label>
          <select
            {...register("fuelType")}
            className="border rounded-md px-3 py-2"
          >
            <option value="">Select Fuel</option>
            <option value="DIESEL">Diesel</option>
            <option value="PETROL">Petrol</option>
            <option value="CNG">CNG</option>
            <option value="ELECTRIC">Electric</option>
          </select>
          {errors.fuelType && (
            <p className="text-red-600 text-sm">{errors.fuelType.message}</p>
          )}
        </div>
      </div>

      {/* Technical */}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col space-y-1">
          <Label>Engine Number</Label>
          <Input {...register("engineNumber")} placeholder="Engine number" />
          {errors.engineNumber && (
            <p className="text-red-600 text-sm">
              {errors.engineNumber.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Chassis Number</Label>
          <Input {...register("chassisNumber")} placeholder="Chassis number" />
          {errors.chassisNumber && (
            <p className="text-red-600 text-sm">
              {errors.chassisNumber.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Capacity (Tons)</Label>
          <Input {...register("capacityInTons")} placeholder="e.g. 10.5" />
          {errors.capacityInTons && (
            <p className="text-red-600 text-sm">
              {errors.capacityInTons.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Body Type</Label>
          <Input {...register("bodyType")} placeholder="Open / Container" />
          {errors.bodyType && (
            <p className="text-red-600 text-sm">{errors.bodyType.message}</p>
          )}
        </div>
      </div>

      {/* Compliance */}
      <div className="grid grid-cols-2 gap-6">
        {[
          ["RC Validity", "rcValidity"],
          ["Insurance Expiry", "insuranceExpiry"],
          ["Fitness Expiry", "fitnessExpiry"],
          ["Pollution Expiry", "pollutionExpiry"],
          ["Permit Expiry", "permitExpiry"],
          ["Road Tax Expiry", "roadTaxExpiry"],
        ].map(([label, field]) => (
          <div key={field} className="flex flex-col space-y-1">
            <Label>{label}</Label>
            <Input type="date" {...register(field as any)} />
            {errors[field as keyof OwnFormType] && (
              <p className="text-red-600 text-sm">
                {errors[field as keyof OwnFormType]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Driver */}
      {/* <div className="flex flex-col space-y-1">
        <Label>Assigned Driver ID (optional)</Label>

        <div className="space-y-3">
          <label className="text-sm font-medium">Select Driver</label>

          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choose driver" />
            </SelectTrigger>

            <SelectContent>
              {!isLoading && selectedDriverOption && (
                <SelectItem value={selectedDriverOption.id}>
                  {selectedDriverOption.name}
                </SelectItem>
              )}

              {!isLoading &&
                drivers
                  .filter((d: any) => d.id !== selectedDriverOption?.id)
                  .map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}

              <SelectItem value={NO_DRIVER}>No driver assigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {errors.assignedDriverId && (
          <p className="text-red-600 text-sm">
            {errors.assignedDriverId.message}
          </p>
        )}
      </div> */}

      {/* Remarks */}
      <div className="flex flex-col space-y-1">
        <Label>Remarks</Label>
        <Input {...register("remarks")} placeholder="Any notes" />
        {errors.remarks && (
          <p className="text-red-600 text-sm">{errors.remarks.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
        Save Own Vehicle
      </Button>
    </form>
  );
};

export default EditOwnVehicle;
