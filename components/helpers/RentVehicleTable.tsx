"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { EllipsisVertical, Eye } from "lucide-react";
import { UnassignDriverDialog } from "./UnassignDriverDialog";
import { PaginatedResponse, RentVehicle } from "./forms/types";
import EditRentVehicleDialog from "./EditRentVehicleDialog";
import DeleteDialog from "./DeleteDialog";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";

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
    cell: ({ row }) => {
      const vehicle = row.original;
      const router = useRouter();
      const [open, setOpen] = useState(false);
      const [openDelete, setOpenDelete] = useState(false);
      const [deleteId, setDeleteId] = useState<string | null>(null);
      const queryClient = useQueryClient();

      const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
          const { data } = await axios.delete(`/api/vehicles/rent/${id}`, {
            withCredentials: true,
          });
          return data;
        },
        onSuccess: (data) => {
          toast.success(data?.message ?? "Vehicle deleted successfully");
          queryClient.invalidateQueries({ queryKey: ["rent-vehicles"] });
          setDeleteId(null);
          setOpenDelete(false);
        },
        onError: (err: unknown) => {
          if (err instanceof AxiosError) {
            toast.error(
              err.response?.data?.message ?? "Error deleting vehicle"
            );
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
              align="end"
              className="flex flex-col items-center justify-center w-48 rounded-lg border bg-popover p-1 shadow-lg"
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
                  console.log("View details", vehicle.id);
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
                Edit Rent Vehicle
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => {
                  setDeleteId(vehicle.id);
                  setOpenDelete(true);
                }}
                className="flex items-center justify-center"
              >
                Delete Rent Vehicle
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

          <EditRentVehicleDialog
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
    },
  },
];

export function RentVehicleTable() {
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const [filters, setFilters] = useState({
    search: "",
    assigned: "ALL",
    sortBy: "NEWEST",
  });
  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const { data, isLoading } = useQuery<PaginatedResponse<RentVehicle>>({
    queryKey: [
      "rent-vehicles",
      page,
      limit,
      debouncedSearch,
      filters.assigned,
      filters.sortBy,
    ],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/vehicles/rent", {
        params: {
          page,
          limit,
          search: debouncedSearch,
          assigned: filters.assigned,
          sortBy: filters.sortBy,
        },
      });
      return res;
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return <div className="py-10 text-center text-slate-500">Loading...</div>;
  }

  const vehicles = data?.data ?? [];

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
              sortBy: "NEWEST",
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
            className="w-full border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
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
              <SelectItem value="NEWEST">Newest → Oldest</SelectItem>
              <SelectItem value="OLDEST">Oldest → Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ✅ Mobile Cards */}
      {/* <div className="grid grid-cols-1 gap-3 md:hidden">
        {vehicles.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No vehicles found
          </div>
        ) : (
          vehicles.map((v) => (
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
          ))
        )}
      </div> */}

      {/* ✅ Desktop Table */}
      <div className="overflow-x-auto">
        <DataTable columns={columns} data={vehicles} />
        {data?.meta && (
          <div className="flex w-full flex-col items-center justify-between gap-4 border-t py-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Page{" "}
              <span className="font-medium text-foreground">
                {data.meta.page}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {data.meta.totalPages}
              </span>{" "}
              •{" "}
              <span className="font-medium text-foreground">
                {data.meta.total}
              </span>{" "}
              vehicles
            </p>
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage((p) => p - 1);
                    }}
                    className={
                      page === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < data.meta.totalPages) {
                        setPage((p) => p + 1);
                      }
                    }}
                    className={
                      page === data.meta.totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
