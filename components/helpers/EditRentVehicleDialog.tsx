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
import { Props, RentProps } from "./forms/types";
import EditRentVehicle from "./EditRentVehicle";

const EditRentVehicleDialog = ({ vehicle, open, onOpenChange }: RentProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[60%] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <EditRentVehicle vehicle={vehicle} />
      </DialogContent>
    </Dialog>
  );
};

export default EditRentVehicleDialog;
