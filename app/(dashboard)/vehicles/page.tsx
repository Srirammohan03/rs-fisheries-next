"use client";

import { AddDriverDialog } from "@/components/helpers/AddDriverDialog";
import { DriverTable } from "@/components/helpers/DriverTable";
import { OwnVehicleTable } from "@/components/helpers/OwnVehicleTable";
import { RentVehicleTable } from "@/components/helpers/RentVehicleTable";
import { VehicleDialog } from "@/components/helpers/VehicleDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

        <div className="flex items-center gap-3">
          <VehicleDialog />
          <AddDriverDialog />
        </div>
      </div>

      <Tabs defaultValue="OWN" className="mt-4 flex flex-col h-full">
        <TabsList>
          <TabsTrigger value="OWN">Own Vehicles</TabsTrigger>
          <TabsTrigger value="RENT">Rent Vehicles</TabsTrigger>
          <TabsTrigger value="DRIVERS">Drivers</TabsTrigger>
        </TabsList>

        <TabsContent value="OWN">
          <OwnVehicleTable />
        </TabsContent>
        <TabsContent value="RENT">
          <RentVehicleTable />
        </TabsContent>
        <TabsContent value="DRIVERS">
          <DriverTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
