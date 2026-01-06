"use client";

import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  FilterFn,
} from "@tanstack/react-table";
import axios from "axios";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Clock,
  Shield,
  Smartphone,
  Globe,
  Database,
  User,
  LayoutGrid,
  FileJson,
  AlertTriangle,
  ChevronDown,
  ArrowUpDown,
  Check,
} from "lucide-react";

// --- Shadcn UI Imports ---
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- Types ---

interface AuditLog {
  id: string;
  userId: string;
  userRole: string;
  module: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";
  recordId: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const StatusBadge = ({ action }: { action: string }) => {
  const styles = {
    CREATE:
      "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    UPDATE: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    DELETE: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    STATUS_CHANGE:
      "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  };

  const label = action.replace("_", " ");

  return (
    <Badge
      variant="outline"
      className={`${
        styles[action as keyof typeof styles] || "bg-gray-100 text-gray-700"
      } border`}
    >
      {label}
    </Badge>
  );
};

const RoleBadge = ({ role }: { role: string }) => (
  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md border">
    <Shield className="w-3 h-3" />
    {role}
  </span>
);

const DiffViewer = ({ oldVal, newVal }: { oldVal: any; newVal: any }) => {
  const allKeys = Array.from(
    new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})])
  );

  return (
    <div className="border rounded-md overflow-hidden text-sm">
      <div className="grid grid-cols-3 bg-muted/50 border-b px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
        <div>Field</div>
        <div>Old Value</div>
        <div>New Value</div>
      </div>
      <div className="divide-y">
        {allKeys.map((key) => {
          const val1 = oldVal?.[key];
          const val2 = newVal?.[key];
          // Simple equality check
          const isChanged = JSON.stringify(val1) !== JSON.stringify(val2);

          if (!isChanged) return null;

          return (
            <div
              key={key}
              className="grid grid-cols-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="font-mono text-muted-foreground text-xs flex items-center">
                {key}
              </div>
              <div className="text-red-600 dark:text-red-400 break-all bg-red-50 dark:bg-red-900/20 p-1 rounded -ml-1 text-xs font-mono">
                {val1 === undefined || val1 === null ? "null" : String(val1)}
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 break-all bg-emerald-50 dark:bg-emerald-900/20 p-1 rounded -ml-1 text-xs font-mono">
                {val2 === undefined || val2 === null ? "null" : String(val2)}
              </div>
            </div>
          );
        })}
        {allKeys.length === 0 && (
          <div className="p-4 text-center text-muted-foreground italic">
            No field changes detected
          </div>
        )}
      </div>
    </div>
  );
};

// --- Custom Filter Function for TanStack Table ---
const multiSelectFilter: FilterFn<AuditLog> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue || filterValue.length === 0) return true;
  const cellValue = row.getValue(columnId);
  return filterValue.includes(String(cellValue));
};

// --- Main Page Component ---

const AuditLogsPage = () => {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Table State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // --- Data Fetching ---
  const {
    data: logs = [],
    isLoading,
    isError,
    error,
  } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      // Replace with your actual API endpoint
      const { data } = await axios.get("/api/audit-logs");
      return data.data;
    },
    placeholderData: keepPreviousData,
  });

  // --- Column Definitions ---
  const columns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              <span>Timestamp</span>
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = new Date(row.getValue("createdAt"));
          return (
            <div className="flex flex-col">
              <span className="font-medium">{date.toLocaleDateString()}</span>
              <span className="text-xs text-muted-foreground">
                {date.toLocaleTimeString()}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "userRole",
        header: "Actor",
        filterFn: multiSelectFilter,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {(row.original.userRole || "U").substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">
                User {row.original.userId.substring(0, 4)}...
              </span>
              <RoleBadge role={row.getValue("userRole")} />
            </div>
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        filterFn: multiSelectFilter,
        cell: ({ row }) => <StatusBadge action={row.getValue("action")} />,
      },
      {
        accessorKey: "module",
        header: "Module",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{row.getValue("module")}</span>
          </div>
        ),
      },
      {
        accessorKey: "recordId",
        header: "Record ID",
        cell: ({ row }) => (
          <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
            {String(row.getValue("recordId")).substring(0, 15)}
          </code>
        ),
      },
      //   {
      //     id: "actions",
      //     enableHiding: false,
      //     cell: ({ row }) => {
      //       return (
      //         <DropdownMenu>
      //           <DropdownMenuTrigger asChild>
      //             <Button variant="ghost" className="h-8 w-8 p-0">
      //               <span className="sr-only">Open menu</span>
      //               <MoreHorizontal className="h-4 w-4" />
      //             </Button>
      //           </DropdownMenuTrigger>
      //           <DropdownMenuContent align="end">
      //             <DropdownMenuLabel>Actions</DropdownMenuLabel>
      //             <DropdownMenuItem
      //               onClick={() => navigator.clipboard.writeText(row.original.id)}
      //             >
      //               Copy Log ID
      //             </DropdownMenuItem>
      //             <DropdownMenuSeparator />
      //             <DropdownMenuItem onClick={() => setSelectedLog(row.original)}>
      //               View Details
      //             </DropdownMenuItem>
      //           </DropdownMenuContent>
      //         </DropdownMenu>
      //       );
      //     },
      //   },
    ],
    []
  );

  // --- Table Instance ---
  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      return String(value)
        .toLowerCase()
        .includes(String(filterValue).toLowerCase());
    },
  });

  // Calculate unique values for filters
  const uniqueActions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))),
    [logs]
  );

  // --- CSV Export Logic ---
  const handleExportCSV = () => {
    if (!logs.length) return;

    // Get the current rows from the table (respecting filters/sort)
    const rowsToExport = table
      .getFilteredRowModel()
      .rows.map((row) => row.original);

    if (rowsToExport.length === 0) return;

    const headers = [
      "Log ID",
      "Timestamp",
      "Actor Role",
      "User ID",
      "Module",
      "Action",
      "Target ID",
      "IP Address",
    ];

    const csvContent = [
      headers.join(","), // Header row
      ...rowsToExport.map((log) =>
        [
          log.id,
          new Date(log.createdAt).toISOString(),
          log.userRole,
          log.userId,
          log.module,
          log.action,
          log.recordId,
          log.ipAddress || "",
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`) // Escape quotes
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `audit_logs_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive gap-4">
        <AlertTriangle className="h-10 w-10" />
        <div className="text-center">
          <h3 className="font-semibold text-lg">Error Loading Logs</h3>
          <p className="text-muted-foreground">
            {axios.isAxiosError(error)
              ? error.response?.data.message
              : error.message || "Failed to load"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className=" p-2 font-sans text-gray-900 relative">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground mt-1">
              Track and monitor all system changes and user activities.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all columns..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 w-full bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-dashed">
                  <Filter className="w-4 h-4" />
                  Filter Action
                  {columnFilters.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1 h-5 rounded-sm"
                    >
                      {columnFilters.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Filter by Action</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniqueActions.map((action) => {
                  const currentFilter =
                    (table.getColumn("action")?.getFilterValue() as string[]) ||
                    [];
                  const isSelected = currentFilter.includes(action);
                  return (
                    <DropdownMenuCheckboxItem
                      key={action}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        const newFilter = checked
                          ? [...currentFilter, action]
                          : currentFilter.filter((f) => f !== action);
                        table
                          .getColumn("action")
                          ?.setFilterValue(
                            newFilter.length ? newFilter : undefined
                          );
                      }}
                    >
                      {action}
                    </DropdownMenuCheckboxItem>
                  );
                })}
                {columnFilters.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => table.resetColumnFilters()}
                      className="justify-center text-center font-medium"
                    >
                      Clear Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column Visibility Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Columns
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
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
        </div>

        {/* Data Table */}
        <div className="rounded-md border bg-background shadow-sm overflow-hidden">
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Loading audit data...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLog(row.original)}
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
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} entries
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Details Sheet (Drawer) */}
      <Sheet
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
          {selectedLog && (
            <>
              <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
                <SheetTitle>Log Details</SheetTitle>
                <SheetDescription>
                  Transaction ID:{" "}
                  <code className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono">
                    {selectedLog.id}
                  </code>
                </SheetDescription>
              </SheetHeader>

              <div className="p-6 space-y-8">
                {/* Meta Data Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Module
                    </span>
                    <div className="flex items-center gap-2 font-medium">
                      <Database className="w-4 h-4 text-primary" />
                      {selectedLog.module}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Action
                    </span>
                    <div>
                      <StatusBadge action={selectedLog.action} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </span>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actor
                    </span>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-sm">
                        {selectedLog.userRole}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Technical Details */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    Technical Context
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        IP Address
                      </span>
                      <div className="flex items-center gap-2 font-mono mt-1">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        {selectedLog.ipAddress || "N/A"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Record ID
                      </span>
                      <div className="flex items-center gap-2 font-mono mt-1">
                        <FileJson className="w-3 h-3 text-muted-foreground" />
                        {selectedLog.recordId}
                      </div>
                    </div>
                    <div className="col-span-full">
                      <span className="text-muted-foreground block text-xs">
                        User Agent
                      </span>
                      <div className="flex items-start gap-2 mt-1 bg-background p-2 rounded border shadow-sm">
                        <Smartphone className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
                        <span className="break-all text-xs leading-relaxed font-mono text-muted-foreground">
                          {selectedLog.userAgent}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Diff Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    Data Changes
                  </h3>
                  {selectedLog.action === "CREATE" ? (
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/30">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(selectedLog.newValues, null, 2)}
                      </pre>
                    </ScrollArea>
                  ) : selectedLog.action === "DELETE" ? (
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-red-50 dark:bg-red-950/20 text-red-600">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(selectedLog.oldValues, null, 2)}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <DiffViewer
                      oldVal={selectedLog.oldValues}
                      newVal={selectedLog.newValues}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AuditLogsPage;
