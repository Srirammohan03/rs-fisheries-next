"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  FileEdit,
  Trash2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Client } from "./types/type";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import DeleteDialog from "@/components/helpers/DeleteDialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PaginatedResponse } from "@/components/helpers/forms/types";

export default function ClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(
    null
  );
  const [search, setSearch] = React.useState<string | "">("");
  const [page, setPage] = React.useState(1);
  const limit = 15;

  const debouncedSearch = useDebouncedValue(search, 400);

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "partyName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Party Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-base">
            {row.getValue("partyName")}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.partyGroup || "No Group"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm">{row.getValue("phone")}</span>
          {row.original.email && (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              {row.original.email}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "gstType",
      header: "GST Info",
      cell: ({ row }) => {
        const type = row.getValue("gstType") as string;
        return (
          <div className="flex flex-col gap-1">
            <Badge
              variant={type === "REGISTERED" ? "default" : "secondary"}
              className="w-fit text-[10px]"
            >
              {type}
            </Badge>
            {row.original.gstin && (
              <span className="text-xs font-mono text-muted-foreground">
                {row.original.gstin}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "creditLimit",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="w-full justify-end"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Credit Limit
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const raw = row.getValue("creditLimit");
        const amount = typeof raw === "number" ? raw : 0;
        const formatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(amount);
        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive");
        return (
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isActive ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const client = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  if (!client.email) {
                    toast.error("Email not available");
                    return;
                  }

                  navigator.clipboard.writeText(client.email);
                  toast.success("Email copied to clipboard");
                }}
              >
                Copy Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push(`/client/${client.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push(`/client/${client.id}/edit`)}
              >
                <FileEdit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={() => {
                  setSelectedClientId(client.id);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const { data, isLoading, isError, error } = useQuery<
    PaginatedResponse<Client>
  >({
    queryKey: ["clients", debouncedSearch, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
      });

      const { data } = await axios.get(`/api/client?${params.toString()}`, {
        withCredentials: true,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
  const clients = data?.data ?? [];
  const meta = data?.meta;

  const table = useReactTable({
    data: clients,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/client/${id}`, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success("Client deleted successfully");
      setDeleteOpen(false);
      setSelectedClientId(null);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: any) => {
      toast.error(
        axios.isAxiosError(error)
          ? error.response?.data?.message || "Delete failed"
          : "Delete failed"
      );
    },
  });

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle />
        {axios.isAxiosError(error)
          ? error.response?.data?.message || "Failed to load"
          : error.message || "Failed to load"}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full p-6 space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-28 ml-auto" />
        </div>

        {/* Table Skeleton */}
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {/* Party Name */}
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </TableCell>

                  {/* GST */}
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>

                  {/* Credit Limit */}
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2.5 w-2.5 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your parties and their balances.
          </p>
        </div>
        <Button onClick={() => router.push("/client/add-client")}>
          <Plus className="mr-2 h-4 w-4" /> Add Party
        </Button>
      </div>

      {/* Table Toolbar */}
      <div className="flex items-center py-4 gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by party name..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-end py-4">
          <Pagination>
            <PaginationContent>
              {/* Previous */}
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={
                    page <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {/* Page Numbers */}
              {Array.from({ length: meta.totalPages })
                .slice(
                  Math.max(0, page - 3),
                  Math.min(meta.totalPages, page + 2)
                )
                .map((_, idx) => {
                  const pageNumber = idx + Math.max(1, page - 2);

                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        isActive={page === pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

              {/* Ellipsis (optional, UX polish) */}
              {meta.totalPages > 5 && page < meta.totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Next */}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setPage((p) =>
                      meta ? Math.min(meta.totalPages, p + 1) : p
                    )
                  }
                  className={
                    page >= meta.totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedClientId(null);
        }}
        onConfirm={() => {
          if (!selectedClientId) return;
          deleteMutation.mutate(selectedClientId);
        }}
      />
    </div>
  );
}
