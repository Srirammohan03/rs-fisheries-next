"use client";

import { OwnVehicleTable } from "@/components/helpers/OwnVehicleTable";
import { RentVehicleTable } from "@/components/helpers/RentVehicleTable";
import { VehicleDialog } from "@/components/helpers/VehicleDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function Vehicles() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground mt-1">
            Track vehicle expenses and rentals
          </p>
        </div>

        <VehicleDialog />
      </div>

      <Tabs defaultValue="OWN" className="mt-4 flex flex-col h-full">
        <TabsList>
          <TabsTrigger value="OWN">Own Vehicles</TabsTrigger>
          <TabsTrigger value="RENT">Rent Vehicles</TabsTrigger>
        </TabsList>

        <TabsContent value="OWN">
          <OwnVehicleTable />
        </TabsContent>
        <TabsContent value="RENT">
          <RentVehicleTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
