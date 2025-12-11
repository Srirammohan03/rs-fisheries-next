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
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Salary Records</h2>
        <Button
          onClick={() => {
            setMode("add");
            setSelectedSalary(null);
            setOpenDialog(true);
          }}
        >
          Add Salary
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin" />
          Loading salary records...
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {salaries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No salaries found
                  </TableCell>
                </TableRow>
              ) : (
                salaries?.map((sal: any) => (
                  <TableRow key={sal.id}>
                    <TableCell>{sal.user?.name || sal.user?.email}</TableCell>
                    <TableCell>
                      {new Date(sal.month).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>₹{sal.amount}</TableCell>
                    <TableCell>{sal.notes}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
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
      )}

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
