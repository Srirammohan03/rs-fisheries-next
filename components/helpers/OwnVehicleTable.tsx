"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { AddDriverDialog } from "./AddDriverDialog";
import { DataTable } from "../ui/data-table";
import { AssignDriverDialog } from "./AssignDriverDialog";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../ui/button";
import { UnassignDriverDialog } from "./UnassignDriverDialog";

export type OwnVehicle = {
  id: string;
  vehicleNumber: string;
  manufacturer: string | null;
  fuelType: string;
  capacityInTons: string | null;
  assignedDriver?: { name: string | null };
};

const columns: ColumnDef<OwnVehicle>[] = [
  {
    accessorKey: "vehicleNumber",
    header: "Vehicle No",
  },
  {
    accessorKey: "manufacturer",
    header: "Manufacturer",
    cell: ({ row }) => row.original.manufacturer || "-",
  },
  {
    accessorKey: "fuelType",
    header: "Fuel",
  },
  {
    accessorKey: "capacityInTons",
    header: "Capacity",
    cell: ({ row }) => row.original.capacityInTons || "-",
  },
  {
    accessorKey: "assignedDriver",
    header: "Driver",
    cell: ({ row }) =>
      row.original.assignedDriver?.name ?? "No Driver Assigned",
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) =>
      row.original.assignedDriver ? (
        <UnassignDriverDialog vehicleId={row.original.id} />
      ) : (
        <AssignDriverDialog vehicleId={row.original.id} />
      ),
  },
];

export function OwnVehicleTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["own-vehicles"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/vehicles/own");
      return res.data;
    },
  });

  const [filters, setFilters] = useState({
    search: "",
    fuelType: "ALL",
    assigned: "ALL",
    sortBy: "NONE",
  });

  const filtered = useMemo(() => {
    if (!data) return [];

    let list = [...data];

    const s = filters.search.toLowerCase();

    // Search
    list = list.filter((v: any) => {
      return (
        v.vehicleNumber.toLowerCase().includes(s) ||
        v.manufacturer?.toLowerCase().includes(s) ||
        v.assignedDriver?.name?.toLowerCase().includes(s)
      );
    });

    // Fuel type filter
    list = list.filter((v: any) => {
      return filters.fuelType === "ALL"
        ? true
        : v.fuelType === filters.fuelType;
    });

    // Assigned filter
    list = list.filter((v: any) => {
      if (filters.assigned === "ALL") return true;
      if (filters.assigned === "ASSIGNED") return !!v.assignedDriver;
      if (filters.assigned === "AVAILABLE") return !v.assignedDriver;
    });

    // Sort by date
    if (filters.sortBy === "NEWEST") {
      list.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    if (filters.sortBy === "OLDEST") {
      list.sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    return list;
  }, [data, filters]);

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Own Vehicles</h2>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter and manage your fleet
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            setFilters({
              search: "",
              assigned: "ALL",
              fuelType: "ALL",
              sortBy: "NONE",
            })
          }
          className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          Clear Filters
        </Button>
      </div>

      {/* Filters */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Search */}
          <div className="lg:col-span-4">
            <Input
              className="h-11 w-full border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              placeholder="Search vehicle / driver / manufacturer"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>

          {/* Fuel Type */}
          <div className="lg:col-span-2">
            <Select
              value={filters.fuelType}
              onValueChange={(v) => setFilters({ ...filters, fuelType: v })}
            >
              <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                <SelectValue placeholder="Fuel Type" />
              </SelectTrigger>
              <SelectContent className="border-slate-200">
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="DIESEL">Diesel</SelectItem>
                <SelectItem value="PETROL">Petrol</SelectItem>
                <SelectItem value="CNG">CNG</SelectItem>
                <SelectItem value="ELECTRIC">Electric</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Driver Assignment */}
          <div className="lg:col-span-2">
            <Select
              value={filters.assigned}
              onValueChange={(v) => setFilters({ ...filters, assigned: v })}
            >
              <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                <SelectValue placeholder="Driver" />
              </SelectTrigger>
              <SelectContent className="border-slate-200">
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="lg:col-span-2">
            <Select
              value={filters.sortBy}
              onValueChange={(v) => setFilters((p) => ({ ...p, sortBy: v }))}
            >
              <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="border-slate-200">
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="NEWEST">Newest → Oldest</SelectItem>
                <SelectItem value="OLDEST">Oldest → Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Spacer / actions on large */}
          <div className="lg:col-span-2 flex items-center justify-start lg:justify-end">
            <div className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filtered.length}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <DataTable columns={columns} data={filtered} />
        </div>
      </div>
    </div>
  );
}
