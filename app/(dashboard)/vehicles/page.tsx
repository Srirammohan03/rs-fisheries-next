"use client";

import { OwnVehicles } from "@/components/helpers/OwnVehicles";
import { RentVehicles } from "@/components/helpers/RentVehicles";

export default function Vehicles() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
        <p className="text-muted-foreground mt-1">
          Track vehicle expenses and rentals
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OwnVehicles />
        <RentVehicles />
      </div>
    </div>
  );
}
