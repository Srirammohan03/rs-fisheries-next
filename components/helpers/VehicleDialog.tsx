"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OwnVehicleForm } from "./forms/OwnVehicleForm";
import { RentVehicleForm } from "./forms/RentVehicleForm";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

export function VehicleDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Vehicle</Button>
      </DialogTrigger>

      <DialogContent className="w-[60%] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
        </DialogHeader>

        {/* TABS (FIXED - NOT SCROLLABLE) */}
        <Tabs defaultValue="own" className="mt-4 flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="own">Own Vehicle</TabsTrigger>
            <TabsTrigger value="rent">Rent Vehicle</TabsTrigger>
          </TabsList>

          {/* SCROLL CONTAINER FOR FORMS */}
          <div className="flex-1 overflow-y-auto mt-4 pr-2 pb-4 max-h-[calc(85vh-150px)]">
            <TabsContent value="own">
              <OwnVehicleForm onSuccess={() => setOpen(false)} />
            </TabsContent>

            <TabsContent value="rent">
              <RentVehicleForm onSuccess={() => setOpen(false)} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
