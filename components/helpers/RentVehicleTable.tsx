"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTable } from "../ui/data-table";
import { AssignDriverDialog } from "./AssignDriverDialog";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type RentVehicle = {
  id: string;
  vehicleNumber: string;
  rentalAgency: string | null;
  rentalRatePerDay: string;
  assignedDriver?: { name: string | null };
  createdAt?: string;
};

const columns: ColumnDef<RentVehicle>[] = [
  { accessorKey: "vehicleNumber", header: "Vehicle No" },
  {
    accessorKey: "rentalAgency",
    header: "Agency",
    cell: ({ row }) => row.original.rentalAgency || "-",
  },
  { accessorKey: "rentalRatePerDay", header: "Rental Rate / Day" },
  {
    accessorKey: "assignedDriver",
    header: "Driver",
    cell: ({ row }) =>
      row.original.assignedDriver?.name ?? "No Driver Assigned",
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => <AssignDriverDialog vehicleId={row.original.id} />,
  },
];

export function RentVehicleTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["rent-vehicles"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/vehicles/rent");
      return res.data as RentVehicle[];
    },
  });

  const [filters, setFilters] = useState({
    search: "",
    assigned: "ALL",
    sortBy: "NONE",
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = [...data];

    const s = filters.search.trim().toLowerCase();
    if (s) {
      list = list.filter((v: any) => {
        return (
          v.vehicleNumber?.toLowerCase().includes(s) ||
          v.rentalAgency?.toLowerCase().includes(s) ||
          v.assignedDriver?.name?.toLowerCase().includes(s)
        );
      });
    }

    list = list.filter((v: any) => {
      if (filters.assigned === "ALL") return true;
      if (filters.assigned === "ASSIGNED") return !!v.assignedDriver;
      if (filters.assigned === "AVAILABLE") return !v.assignedDriver;
      return true;
    });

    if (filters.sortBy === "NEWEST") {
      list.sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
      );
    }
    if (filters.sortBy === "OLDEST") {
      list.sort(
        (a: any, b: any) =>
          new Date(a.createdAt ?? 0).getTime() -
          new Date(b.createdAt ?? 0).getTime()
      );
    }

    return list;
  }, [data, filters]);

  if (isLoading) {
    return <div className="py-10 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Rent Vehicles
          </h2>
          <p className="text-sm text-slate-500">
            Search, filter and manage rented vehicles
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            setFilters({
              search: "",
              assigned: "ALL",
              sortBy: "NONE",
            })
          }
          className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          Clear Filters
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5">
          <Input
            placeholder="Search vehicle / driver / agency"
            className="h-11 w-full border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            value={filters.search}
            onChange={(e) =>
              setFilters((p) => ({ ...p, search: e.target.value }))
            }
          />
        </div>

        <div className="lg:col-span-3">
          <Select
            value={filters.assigned}
            onValueChange={(v) => setFilters((p) => ({ ...p, assigned: v }))}
          >
            <SelectTrigger className="h-11 w-full border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
              <SelectValue placeholder="Driver filter" />
            </SelectTrigger>
            <SelectContent className="border-slate-200">
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-3">
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

        <div className="lg:col-span-1 flex items-center justify-between sm:justify-end">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-900">
              {filtered.length}
            </span>
          </div>
        </div>
      </div>

      {/* ✅ Mobile Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filtered.map((v) => (
          <div
            key={v.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-slate-900">
                  {v.vehicleNumber}
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Agency: {v.rentalAgency || "-"}
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Rate/Day:{" "}
                  <span className="font-semibold text-slate-900">
                    {v.rentalRatePerDay}
                  </span>
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-800">
                  Driver:{" "}
                  <span className="font-medium text-slate-600">
                    {v.assignedDriver?.name ?? "No Driver Assigned"}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <AssignDriverDialog vehicleId={v.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  );
}
