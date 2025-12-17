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

export default function SalariesPage() {
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");

  // Fetch salaries + user details
  const { data: salaries, isLoading } = useQuery({
    queryKey: ["salaries"],
    queryFn: async () => {
      const { data } = await axios.get("/api/salaries");
      return data.data;
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
          className="bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
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
        ) : (
          <div className="p-4 md:p-6">
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
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
                  {salaries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-10 text-slate-500"
                      >
                        No salaries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    salaries?.map((sal: any) => (
                      <TableRow key={sal.id} className="hover:bg-slate-50/60">
                        <TableCell className="font-medium text-slate-900">
                          {sal.user?.name || sal.user?.email}
                        </TableCell>

                        <TableCell className="text-slate-700">
                          {new Date(sal.month).toLocaleDateString("en-IN", {
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>

                        <TableCell className="font-semibold text-emerald-600">
                          ₹{sal.amount.toLocaleString("en-IN")}
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
                    ))
                  )}
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
