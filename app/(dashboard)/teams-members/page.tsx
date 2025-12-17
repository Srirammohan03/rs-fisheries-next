"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import UserDialog from "@/components/helpers/UserDialog";
import DeleteDialog from "@/components/helpers/DeleteDialog";
import { User, UserFormValues } from "@/utils/user-types";
import { Loader2, Pencil, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useUsers } from "@/utils/api-config";

export default function UserPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");

  const queryClient = useQueryClient();

  const { data: users, isLoading, isError } = useUsers();

  const createMutation = useMutation({
    mutationFn: async (payload: UserFormValues) => {
      const { data } = await axios.post("/api/team-member", payload, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setOpenDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UserFormValues;
    }) => {
      const { data } = await axios.put(`/api/team-member/${id}`, payload, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setOpenDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/api/team-member/${id}`, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setOpenDeleteDialog(false);
    },
  });

  const handleCreate = (data: UserFormValues) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: UserFormValues) => {
    if (!selectedUser) return;
    updateMutation.mutate({ id: selectedUser.id, payload: data });
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(selectedUser.id);
  };

  if (isError) {
    return <div>Something went wrong</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="animate-spin" />
        Loading users...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            User Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage users, roles and access permissions
          </p>
        </div>

        <Button
          onClick={() => {
            setMode("add");
            setSelectedUser(null);
            setOpenDialog(true);
          }}
          className="bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
        >
          Add User
        </Button>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 md:p-6">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold text-slate-700">
                    Email
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    Name
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    Role
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    Created At
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {users?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-slate-500"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/60">
                      <TableCell className="text-slate-800">
                        {user.email}
                      </TableCell>

                      <TableCell className="font-medium text-slate-900">
                        {user.name || "—"}
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 capitalize">
                          {user.role}
                        </span>
                      </TableCell>

                      <TableCell className="text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                            onClick={() => {
                              setMode("edit");
                              setSelectedUser(user);
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
                              setSelectedUser(user);
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
      </div>

      {/* ADD / EDIT USER DIALOG */}
      <UserDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={mode === "add" ? handleCreate : handleUpdate}
        mode={mode}
        defaultValues={selectedUser}
        isLoading={
          mode === "add" ? createMutation.isPending : updateMutation.isPending
        }
      />

      {/* DELETE CONFIRMATION DIALOG */}
      <DeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
