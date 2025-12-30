"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { DataTable } from "@/components/ui/data-table";
import { AssignDriverDialog } from "./AssignDriverDialog";
import { UnassignDriverDialog } from "./UnassignDriverDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useRouter } from "next/navigation";
import EditOwnVehicleDialog from "./EditOwnVehicleDialog";
import { EllipsisVertical, Eye } from "lucide-react";
import { Vehicle } from "./forms/types";
import DeleteDialog from "./DeleteDialog";
import { toast } from "sonner";

const VehicleActions = ({ vehicle }: { vehicle: Vehicle }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/api/vehicles/own/${id}`, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message ?? "Vehicle deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["own-vehicles"] });
      setDeleteId(null);
      setOpenDelete(false);
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message ?? "Error deleting vehicle");
      } else {
        toast.error("Error updating vehicle");
      }
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="
              flex h-8 w-8 items-center justify-center
              rounded-md border border-border
              text-muted-foreground
              hover:bg-accent hover:text-accent-foreground
              focus:outline-none focus:ring-2 focus:ring-ring
              transition-colors
            "
          >
            <EllipsisVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="center"
          className="flex flex-col justify-center w-48 rounded-lg border bg-popover p-1 shadow-lg"
        >
          {/* View Details */}
          <DropdownMenuItem
            className="
              flex items-center justify-center gap-2 rounded-md px-2 py-2 text-sm
              hover:bg-accent hover:text-accent-foreground
              cursor-pointer
            "
            onClick={() => {
              router.push(`/vehicles/details/${vehicle.id}`);
            }}
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            View Details
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="flex items-center justify-center"
          >
            Edit Own Vehicle
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => {
              setDeleteId(vehicle.id);
              setOpenDelete(true);
            }}
            className="flex items-center justify-center"
          >
            Delete Own Vehicle
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />

          {/* Assign / Unassign */}
          <DropdownMenuItem
            asChild
            className="
              flex items-center gap-2 rounded-md px-2 py-2 text-sm
              hover:bg-accent hover:text-accent-foreground
              cursor-pointer
            "
          >
            {vehicle.assignedDriver ? (
              <UnassignDriverDialog vehicleId={vehicle.id} />
            ) : (
              <AssignDriverDialog vehicleId={vehicle.id} />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditOwnVehicleDialog
        vehicle={vehicle}
        open={open}
        onOpenChange={setOpen}
      />
      <DeleteDialog
        onClose={() => setOpenDelete(false)}
        open={openDelete}
        onConfirm={handleDelete}
      />
    </>
  );
};

const columns: ColumnDef<Vehicle>[] = [
  { accessorKey: "vehicleNumber", header: "Vehicle No" },
  {
    accessorKey: "manufacturer",
    header: "Manufacturer",
    cell: ({ row }) => row.original.manufacturer || "-",
  },
  { accessorKey: "fuelType", header: "Fuel" },
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
    cell: ({ row }) => <VehicleActions vehicle={row.original} />,
  },
];

export function OwnVehicleTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["own-vehicles"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/vehicles/own");
      return res.data as Vehicle[];
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

    const s = filters.search.trim().toLowerCase();

    if (s) {
      list = list.filter((v: any) => {
        return (
          v.vehicleNumber?.toLowerCase().includes(s) ||
          v.manufacturer?.toLowerCase().includes(s) ||
          v.assignedDriver?.name?.toLowerCase().includes(s)
        );
      });
    }

    list = list.filter((v: any) =>
      filters.fuelType === "ALL" ? true : v.fuelType === filters.fuelType
    );

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
      {/* Header (no extra card wrapper - avoids double card on mobile) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Own Vehicles</h2>
          <p className="text-sm text-slate-500">
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
          className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          Clear Filters
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4">
          <Input
            className=" w-full border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            placeholder="Search vehicle / driver / manufacturer"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

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
      </div>

      {/* ✅ Mobile Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No vehicles found
          </div>
        ) : (
          filtered.map((v) => (
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
                    {v.manufacturer || "-"} • {v.fuelType}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Capacity: {v.capacityInTons || "-"}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">
                    Driver:{" "}
                    <span className="font-medium text-slate-600">
                      {v.assignedDriver?.name ?? "No Driver Assigned"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {v.assignedDriver ? (
                    <UnassignDriverDialog vehicleId={v.id} />
                  ) : (
                    <AssignDriverDialog vehicleId={v.id} />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ✅ Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  );
}
