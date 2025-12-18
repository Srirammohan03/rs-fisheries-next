"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import SalaryDialog from "@/app/(dashboard)/salaries/component/SalaryDialog";
import DeleteDialog from "@/components/helpers/DeleteDialog";
import { Loader2, Pencil, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

function fmtMonth(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function fmtMoney(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

export default function SalariesPage() {
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");

  // Fetch salaries + user details
  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ["salaries"],
    queryFn: async () => {
      const { data } = await axios.get("/api/salaries");
      return data.data || [];
    },
  });

  // Create
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.post("/api/salaries", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      setOpenDialog(false);
    },
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: any) => {
      const { data } = await axios.put(`/api/salaries/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      setOpenDialog(false);
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/api/salaries/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      setOpenDeleteDialog(false);
    },
  });

  const handleCreate = (data: any) => createMutation.mutate(data);

  const handleUpdate = (data: any) => {
    if (!selectedSalary) return;
    updateMutation.mutate({ id: selectedSalary.id, payload: data });
  };

  const handleDelete = () => {
    if (selectedSalary) deleteMutation.mutate(selectedSalary.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Salary Records
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage monthly salary entries and notes
          </p>
        </div>

        <Button
          onClick={() => {
            setMode("add");
            setSelectedSalary(null);
            setOpenDialog(true);
          }}
          className="w-full md:w-auto bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
        >
          Add Salary
        </Button>
      </div>

      {/* Content Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 flex items-center gap-2 text-slate-600">
            <Loader2 className="animate-spin h-4 w-4" />
            Loading salary records...
          </div>
        ) : salaries.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No salaries found
          </div>
        ) : (
          <div className="p-4 md:p-6">
            {/* ✅ Mobile Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {salaries.map((sal: any) => (
                <div
                  key={sal.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">
                        {sal.user?.name || sal.user?.email || "—"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {fmtMonth(sal.month)}
                      </div>
                      <div className="mt-2 text-xl font-extrabold text-emerald-600">
                        {fmtMoney(sal.amount)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="text-xs font-semibold text-slate-500">
                      Notes
                    </div>
                    <div className="mt-1">{sal.notes || "—"}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="border-slate-200 text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedSalary(sal);
                        setMode("edit");
                        setOpenDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSelectedSalary(sal);
                        setOpenDeleteDialog(true);
                      }}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-slate-700 font-semibold">
                      Employee
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold">
                      Month
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold">
                      Amount
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold">
                      Notes
                    </TableHead>
                    <TableHead className="text-right text-slate-700 font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {salaries.map((sal: any) => (
                    <TableRow key={sal.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-medium text-slate-900">
                        {sal.user?.name || sal.user?.email || "—"}
                      </TableCell>

                      <TableCell className="text-slate-700">
                        {fmtMonth(sal.month)}
                      </TableCell>

                      <TableCell className="font-semibold text-emerald-600">
                        {fmtMoney(sal.amount)}
                      </TableCell>

                      <TableCell className="text-slate-600">
                        {sal.notes || "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                            onClick={() => {
                              setSelectedSalary(sal);
                              setMode("edit");
                              setOpenDialog(true);
                            }}
                          >
                            <Pencil size={16} />
                          </Button>

                          <Button
                            size="icon"
                            variant="destructive"
                            className="shadow-sm"
                            onClick={() => {
                              setSelectedSalary(sal);
                              setOpenDeleteDialog(true);
                            }}
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <SalaryDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        mode={mode}
        defaultValues={selectedSalary}
        onSubmit={mode === "add" ? handleCreate : handleUpdate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
