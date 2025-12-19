"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export type DriverRow = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  address: string;
  age: number;
  aadharNumber: string;
  identityProof?: string | null; // ← Added
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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/driver");
      return res.data as DriverRow[];
    },
  });

  const [filters, setFilters] = useState({
    search: "",
    assigned: "ALL",
    sortBy: "NONE",
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

  const filtered = useMemo(() => {
    if (!data) return [];

    let list = [...data];
    const s = filters.search.trim().toLowerCase();

    if (s) {
      list = list.filter((d: any) => {
        return (
          d.name?.toLowerCase().includes(s) ||
          d.phone?.toLowerCase().includes(s) ||
          d.licenseNumber?.toLowerCase().includes(s) ||
          d.aadharNumber?.toLowerCase().includes(s) ||
          d.assignedVehicle?.vehicleNumber?.toLowerCase().includes(s)
        );
      });
    }

    list = list.filter((d: any) => {
      if (filters.assigned === "ALL") return true;
      if (filters.assigned === "ASSIGNED") return !!d.assignedVehicle;
      if (filters.assigned === "AVAILABLE") return !d.assignedVehicle;
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
        const url = row.original.identityProof;
        if (!url) return <span className="text-slate-500">None</span>;

        const isPdf = url.toLowerCase().endsWith(".pdf");

        return (
          <div className="flex items-center gap-4 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            >
              {isPdf ? "View PDF" : "View Full Image"}
            </Button>
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
                sortBy: "NONE",
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
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="NEWEST">Newest → Oldest</SelectItem>
              <SelectItem value="OLDEST">Oldest → Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No drivers found
          </div>
        ) : (
          filtered.map((d) => {
            const vehicle = d.assignedVehicle?.vehicleNumber;

            return (
              <div
                key={d.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-extrabold text-slate-900 truncate">
                      {d.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Phone: <span className="font-semibold">{d.phone}</span>
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                      License:{" "}
                      <span className="font-semibold">{d.licenseNumber}</span>
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                      Aadhar:{" "}
                      <span className="font-semibold">{d.aadharNumber}</span>
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                      Age: <span className="font-semibold">{d.age}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {vehicle ? (
                      <Badge
                        variant="outline"
                        className="text-green-700 border-green-600"
                      >
                        {vehicle}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-red-700 border-red-600"
                      >
                        None
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="font-semibold text-slate-700">Address</div>
                  <div className="mt-1">{d.address || "-"}</div>
                </div>

                {/* Identity Proof in mobile */}
                {d.identityProof && (
                  <div className="mt-3">
                    <div className="font-semibold text-slate-700 mb-2">
                      Identity Proof
                    </div>
                    {(() => {
                      const isPdf = d.identityProof
                        .toLowerCase()
                        .endsWith(".pdf");
                      if (isPdf) {
                        return (
                          <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-between">
                            <span className="font-medium">PDF Document</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  d.identityProof!,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                            >
                              View PDF
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-4">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              window.open(
                                d.identityProof!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            View Full Image
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Actions in mobile */}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onRequestEdit?.(d)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setDeletedId(d.id);
                      setOpenDeleteDialog(true);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
        <DataTable columns={columns} data={filtered} />
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
