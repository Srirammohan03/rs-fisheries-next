"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTable } from "../ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DriverDialog } from "./AddDriverDialog";
import DeleteDialog from "./DeleteDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PaginatedResponse } from "./forms/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";

export type DriverRow = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  address: string;
  age: number;
  aadharNumber: string;
  aadharProof?: string | null;
  licenseProof?: string | null;
  assignedVehicle?: {
    vehicleNumber: string | null;
  } | null;
  createdAt?: string;
};

type DriverTableProps = {
  onRequestEdit?: (driver: DriverRow) => void;
};

export function DriverTable({ onRequestEdit }: DriverTableProps = {}) {
  const queryClient = useQueryClient();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const [filters, setFilters] = useState({
    search: "",
    assigned: "ALL",
    sortBy: "NEWEST",
  });
  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const { data, isLoading, isError, refetch } = useQuery<
    PaginatedResponse<DriverRow>
  >({
    queryKey: [
      "drivers",
      page,
      limit,
      filters.assigned,
      debouncedSearch,
      filters.sortBy,
    ],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/driver", {
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<DriverRow | null>(null);
  const [deletedId, setDeletedId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/driver?id=${id}`),
    onSuccess: () => {
      toast.success("Driver deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setOpenDeleteDialog(false);
      setDeletedId(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to delete driver"),
  });

  const handleEdit = (driver: DriverRow) => {
    setCurrentDriver(driver);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deletedId) {
      toast.error("No driver selected for deletion");
      return;
    }
    deleteMutation.mutate(deletedId!);
  };

  const drivers = data?.data || [];

  const columns: ColumnDef<DriverRow>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "licenseNumber", header: "License No" },
    { accessorKey: "aadharNumber", header: "Aadhar No" },
    { accessorKey: "age", header: "Age" },
    { accessorKey: "address", header: "Address" },
    {
      accessorKey: "assignedVehicle",
      header: "Assigned Vehicle",
      cell: ({ row }) =>
        row.original.assignedVehicle?.vehicleNumber ? (
          <Badge variant="outline" className="text-green-700 border-green-600">
            {row.original.assignedVehicle.vehicleNumber}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-700 border-red-600">
            None
          </Badge>
        ),
    },
    {
      id: "identityProof",
      header: "Identity Proof",
      cell: ({ row }) => {
        const aadharProofUrl = row.original.aadharProof;
        const licenseProofUrl = row.original.licenseProof;
        if (!aadharProofUrl && !licenseProofUrl)
          return <span className="text-slate-500">None</span>;

        const isAadharPdf = aadharProofUrl?.toLowerCase().endsWith(".pdf");
        const isLicensePdf = licenseProofUrl?.toLowerCase().endsWith(".pdf");

        return (
          <div className="flex items-center justify-center gap-4 py-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-slate-200">
                {aadharProofUrl &&
                  (isAadharPdf ? (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          aadharProofUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      View Pdf
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          aadharProofUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      View Image
                    </DropdownMenuItem>
                  ))}
                {licenseProofUrl &&
                  (isLicensePdf ? (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          licenseProofUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      View Pdf
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          licenseProofUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      View Image
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const driver = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(driver)}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeletedId(driver.id);
                setOpenDeleteDialog(true);
              }}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="py-10 text-center text-slate-500">Loading...</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <p className="text-red-600 text-sm">Failed to load drivers.</p>
        <button
          onClick={() => refetch()}
          className="px-6 py-2 border rounded-md hover:bg-gray-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Drivers</h2>
          <p className="text-sm text-slate-500">
            Search, filter and manage drivers
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                search: "",
                assigned: "ALL",
                sortBy: "NEWEST",
              })
            }
            className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            Clear Filters
          </Button>

          <Button
            onClick={() => {
              setCurrentDriver(null);
              setDialogOpen(true);
            }}
          >
            Add Driver
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-6">
          <Input
            placeholder="Search name / phone / license / vehicle"
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
              <SelectValue placeholder="Assigned" />
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

      {/* Desktop Table */}
      <div className="overflow-x-auto rounded-2xl">
        <DataTable columns={columns} data={drivers} />
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

      {/* Reusable Dialog */}
      <DriverDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setCurrentDriver(null);
        }}
        driver={currentDriver}
      />

      <DeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
