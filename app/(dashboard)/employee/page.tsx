"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import {
  Download,
  Plus,
  Search,
  MoreHorizontal,
  FileUser,
  Building2,
  CalendarDays,
  User,
  Clock,
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Logic/Types
import { generateJoiningFormPDF } from "./components/generateJoiningFormPDF";
import { useEmployee } from "@/lib/types";
import DeleteDialog from "@/components/helpers/DeleteDialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const EmployeePage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"new" | "old">("new");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [designationFilter, setDesignationFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 15;
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const queryClient = useQueryClient();
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useEmployee({
    page,
    search: debouncedSearch,
    limit,
    fromDate,
    toDate,
    sortOrder,
    shiftType: shiftFilter === "all" ? undefined : shiftFilter,
    designation: designationFilter === "all" ? undefined : designationFilter,
  });

  const deleteMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const res = await axios.delete(`/api/employee/${employeeId}`);
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(data.message || "Employee deleted successfully");
      setOpenDeleteDialog(false);
      setEmployeeToDelete(null);
    },
    onError: (error: any) => {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to delete employee"
        );
      } else {
        toast.error("An unexpected error occurred");
      }
    },
  });

  const employees = response?.data || [];
  const meta = response?.meta;

  const uniqueDesignations = Array.from(
    new Set(
      employees
        .map((e) => e.designation)
        .filter((des): des is string => Boolean(des))
    )
  );

  // Helper for Initials
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const handleDelete = () => {
    if (!employeeToDelete) return;
    deleteMutation.mutate(employeeToDelete);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortOrder("new");
    setShiftFilter("all");
    setDesignationFilter("all");
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  if (isError) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8">
      {/* ---------------- Header Section ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Employee Directory
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's roster and joining documentation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={generateJoiningFormPDF}
            className="bg-white"
          >
            <Download className="mr-2 h-4 w-4 text-muted-foreground" />
            Export Forms
          </Button>

          <Button
            onClick={() => router.push("/employee/form")}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* ---------------- Filters & Controls ---------------- */}
      <Card className="border-none shadow-sm bg-transparent">
        <div
          className="
      grid
      grid-cols-1
      gap-3
      px-4

      sm:grid-cols-2
      lg:grid-cols-12
      lg:gap-4
    "
        >
          {/* Search */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              className="pl-10 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Date Range */}
          <div className="lg:col-span-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 bg-white border-slate-200"
                >
                  <Clock className="h-4 w-4" />
                  <span className="truncate">
                    {fromDate && toDate
                      ? `${fromDate.toLocaleDateString()} → ${toDate.toLocaleDateString()}`
                      : "Date range"}
                  </span>
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-auto p-2">
                <Calendar
                  mode="range"
                  selected={{
                    from: fromDate ?? undefined,
                    to: toDate ?? undefined,
                  }}
                  onSelect={(range) => {
                    setFromDate(range?.from ?? null);
                    setToDate(range?.to ?? null);
                    setPage(1);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear Date */}
          {(fromDate || toDate) && (
            <div className="lg:col-span-1 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="w-full lg:w-auto"
                onClick={() => {
                  setFromDate(null);
                  setToDate(null);
                  setPage(1);
                }}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Sort */}
          <div className="lg:col-span-2">
            <Select
              value={sortOrder}
              onValueChange={(v: "new" | "old") => setSortOrder(v)}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Sort by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New → Old</SelectItem>
                <SelectItem value="old">Old → New</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Designation Filter */}
          <div className="lg:col-span-2">
            <Select
              value={designationFilter}
              onValueChange={setDesignationFilter}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Filter by designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {uniqueDesignations.map((des) => (
                  <SelectItem key={des} value={des}>
                    {des}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Clear Filters */}
        <div className="flex items-center  px-4 gap-3">
          <Button
            variant="outline"
            className="w-full lg:w-auto bg-white border-slate-200 text-slate-700"
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* ---------------- Main Table Card ---------------- */}
      <Card className="rounded-xl border shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[300px] pl-6">
                  Employee Profile
                </TableHead>
                <TableHead>Role & Department</TableHead>
                <TableHead>Status / Type</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : employees && employees.length === 0 ? (
                // Empty State
                <TableRow>
                  <TableCell colSpan={5} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Search className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-lg font-medium text-slate-900">
                        No employees found
                      </p>
                      <p className="text-sm">
                        Try adjusting your search terms or add a new employee.
                      </p>
                      <Button
                        variant="link"
                        onClick={() => setSearchTerm("")}
                        className="mt-2 text-blue-600"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // Data Rows
                employees &&
                employees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Column 1: Identity */}
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-slate-200">
                          {/* Use emp.photo if available in your type, otherwise fallback */}
                          <AvatarImage src={emp.photo || undefined} />
                          <AvatarFallback className="bg-blue-50 text-blue-600 font-medium">
                            {getInitials(emp.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900">
                            {emp.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {emp.employeeId}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Column 2: Role */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-700 text-sm">
                          {emp.designation}
                        </span>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Building2 className="mr-1 h-3 w-3" />
                          {emp.department}
                        </div>
                      </div>
                    </TableCell>

                    {/* Column 3: Badges */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-normal text-slate-600 bg-slate-100 border-slate-200"
                      >
                        Full Time
                      </Badge>
                    </TableCell>

                    {/* Column 4: Date */}
                    <TableCell>
                      <div className="flex items-center text-sm text-slate-600">
                        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                        {new Date(emp.doj).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </TableCell>

                    {/* Column 5: Actions */}
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-slate-900"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => router.push(`/employee/${emp.id}`)}
                          >
                            <User className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/employee/${emp.id}/edit`)
                            }
                          >
                            <FileUser className="mr-2 h-4 w-4" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              setEmployeeToDelete(emp.id);
                              setOpenDeleteDialog(true);
                            }}
                          >
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-end py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className={
                    page <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
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
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

function ErrorState({ error }: { error: Error | AxiosError }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-bold">
        {axios.isAxiosError(error)
          ? error.response?.data.message
          : error.message || "Client not found"}
      </h2>
      <Button onClick={() => window.history.back()}>Go Back</Button>
    </div>
  );
}

export default EmployeePage;
