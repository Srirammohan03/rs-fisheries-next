// app/(dashboard)/vehicles/page.tsx
"use client";

import { useState } from "react";

import { DriverDialog } from "@/components/helpers/AddDriverDialog";
import { DriverTable } from "@/components/helpers/DriverTable";
import { OwnVehicleTable } from "@/components/helpers/OwnVehicleTable";
import { RentVehicleTable } from "@/components/helpers/RentVehicleTable";
import { VehicleDialog } from "@/components/helpers/VehicleDialog";
import { ActiveTripsTable } from "@/components/helpers/ActiveTripsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverRow } from "@/components/helpers/DriverTable";

type TabKey = "OWN" | "RENT" | "ACTIVE" | "DRIVERS";

export default function Vehicles() {
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("OWN");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Vehicles
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track vehicle expenses, drivers & active trips
          </p>
        </div>

        {/* ✅ show Add Vehicle only for OWN/RENT */}
        {(activeTab === "OWN" || activeTab === "RENT") && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="[&>button]:bg-[#139BC3] [&>button]:text-white [&>button]:hover:bg-[#1088AA] [&>button]:shadow-sm [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-[#139BC3]/40">
              <VehicleDialog />
            </div>
          </div>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="flex flex-col h-full"
      >
        <TabsList className="inline-flex w-fit items-center gap-1 rounded-2xl border border-slate-200 bg-white/70 px-2 py-6 shadow-sm backdrop-blur">
          <TabsTrigger
            value="OWN"
            className="rounded-2xl px-5 py-4 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#139BC3] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Own Vehicles
          </TabsTrigger>

          <TabsTrigger
            value="RENT"
            className="rounded-2xl px-5 py-4 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#139BC3] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Rent Vehicles
          </TabsTrigger>

          {/* ✅ NEW TAB */}
          <TabsTrigger
            value="ACTIVE"
            className="rounded-2xl px-5 py-4 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#139BC3] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Active Trips
          </TabsTrigger>

          <TabsTrigger
            value="DRIVERS"
            className="rounded-2xl px-5 py-4 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#139BC3] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Drivers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="OWN" className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6">
            <OwnVehicleTable />
          </div>
        </TabsContent>

        <TabsContent value="RENT" className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6">
            <RentVehicleTable />
          </div>
        </TabsContent>

        {/* ✅ Active Trips */}
        <TabsContent value="ACTIVE" className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6">
            <ActiveTripsTable />
          </div>
        </TabsContent>

        <TabsContent value="DRIVERS" className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6">
            <DriverTable
              onRequestEdit={(driver: DriverRow) => {
                setEditingDriver(driver);
                setDriverDialogOpen(true);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      <DriverDialog
        open={driverDialogOpen}
        onOpenChange={(open) => {
          setDriverDialogOpen(open);
          if (!open) setEditingDriver(null);
        }}
        driver={editingDriver}
      />
    </div>
  );
}
