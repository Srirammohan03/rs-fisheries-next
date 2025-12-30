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
import EditOwnVehicle from "./forms/EditOwnVehicle";
import { Props } from "./forms/types";

const EditOwnVehicleDialog = ({ vehicle, open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[60%] max-h-[85vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <EditOwnVehicle vehicle={vehicle} />
      </DialogContent>
    </Dialog>
  );
};

export default EditOwnVehicleDialog;
