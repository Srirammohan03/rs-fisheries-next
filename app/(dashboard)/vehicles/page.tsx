"use client";

import { AddDriverDialog } from "@/components/helpers/AddDriverDialog";
import { DriverTable } from "@/components/helpers/DriverTable";
import { OwnVehicleTable } from "@/components/helpers/OwnVehicleTable";
import { RentVehicleTable } from "@/components/helpers/RentVehicleTable";
import { VehicleDialog } from "@/components/helpers/VehicleDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function cn(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function Vehicles() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Vehicles
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track vehicle expenses and rentals
          </p>
        </div>

        {/* Buttons: desktop same, mobile stacked */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <div className="[&>button]:w-full sm:[&>button]:w-auto [&>button]:bg-[#139BC3] [&>button]:text-white [&>button]:hover:bg-[#1088AA] [&>button]:shadow-sm [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-[#139BC3]/40">
            <VehicleDialog />
          </div>

          <div className="[&>button]:w-full sm:[&>button]:w-auto [&>button]:bg-black [&>button]:text-white [&>button]:hover:bg-black/90 [&>button]:shadow-sm [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-black/30">
            <AddDriverDialog />
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="OWN" className="flex flex-col">
        {/* ✅ FIX: remove shadcn default bg/height on mobile + stack nicely */}
        <TabsList
          className={cn(
            // override shadcn defaults (important)
            "!h-auto !bg-transparent !p-0",
            // mobile layout
            "w-full grid grid-cols-1 gap-3",
            // desktop layout (your old look)
            "sm:inline-flex sm:w-fit sm:grid-cols-none sm:gap-1 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white/70 sm:px-2 sm:py-4 sm:shadow-sm sm:backdrop-blur"
          )}
        >
          {[
            { value: "OWN", label: "Own Vehicles" },
            { value: "RENT", label: "Rent Vehicles" },
            { value: "DRIVERS", label: "Drivers" },
          ].map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className={cn(
                // base (kill weird outlines / black strip)
                "w-full justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#139BC3]/30",

                // mobile active (NO extra shadow -> avoids that black bar look)
                "data-[state=active]:bg-[#139BC3] data-[state=active]:text-white data-[state=active]:border-[#139BC3] data-[state=active]:shadow-none",

                // desktop revert to your original styling
                "sm:w-auto sm:justify-start sm:border-0 sm:bg-transparent sm:shadow-none sm:px-5 sm:py-3 sm:text-slate-600 sm:hover:bg-slate-50",
                "sm:data-[state=active]:bg-white sm:data-[state=active]:text-[#139BC3] sm:data-[state=active]:shadow-sm sm:data-[state=active]:border sm:data-[state=active]:border-slate-200"
              )}
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ✅ NO LAG: keep contents mounted (forceMount) */}
        <TabsContent value="OWN" forceMount className="mt-4 sm:mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6">
            <OwnVehicleTable />
          </div>
        </TabsContent>

        <TabsContent value="RENT" forceMount className="mt-4 sm:mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6">
            <RentVehicleTable />
          </div>
        </TabsContent>

        <TabsContent value="DRIVERS" forceMount className="mt-4 sm:mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6">
            <DriverTable />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
