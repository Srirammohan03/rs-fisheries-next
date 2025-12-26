"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import UserDialog from "@/components/helpers/UserDialog";
import DeleteDialog from "@/components/helpers/DeleteDialog";
import { User, UserFormValues } from "@/utils/user-types";
import {
  Loader2,
  Pencil,
  Trash,
  Mail,
  User as UserIcon,
  Shield,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useUsers } from "@/utils/api-config";

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function UserPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");

  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError } = useUsers();

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
    onError(error) {
      console.error("Error deleting user:", error);
    },
  });

  const handleCreate = (data: UserFormValues) => createMutation.mutate(data);

  const handleUpdate = (data: UserFormValues) => {
    if (!selectedUser) return;
    updateMutation.mutate({ id: selectedUser.id, payload: data });
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(selectedUser.id);
  };

  if (isError) return <div>Something went wrong</div>;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="animate-spin h-4 w-4" />
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
          className="w-full md:w-auto bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
        >
          Add User
        </Button>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 md:p-6">
          {users.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No users found
            </div>
          ) : (
            <>
              {/* ✅ Mobile Cards */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {users &&
                  users.length > 0 &&
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-slate-900 font-extrabold truncate">
                            <UserIcon className="h-4 w-4 text-slate-400" />
                            {user.employee.fullName || "—"}
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 break-all">
                            <Mail className="h-4 w-4 text-slate-400" />
                            {user.employee.email}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 capitalize">
                              <Shield className="h-3.5 w-3.5 text-slate-400" />
                              {user.employee.designation}
                            </span>

                            <span className="text-xs text-slate-500">
                              Created: {formatDate(user.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setMode("edit");
                            setSelectedUser(user);
                            setOpenDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>

                        {user.employee.designation !== "Admin" && (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setOpenDeleteDialog(true);
                            }}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* ✅ Desktop Table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
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
                    {users &&
                      users.length > 0 &&
                      users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="hover:bg-slate-50/60"
                        >
                          <TableCell className="text-slate-800">
                            {user.employee.email}
                          </TableCell>

                          <TableCell className="font-medium text-slate-900">
                            {user.employee.fullName || "—"}
                          </TableCell>

                          <TableCell>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 capitalize">
                              {user.employee.designation}
                            </span>
                          </TableCell>

                          <TableCell className="text-slate-600">
                            {formatDate(user.createdAt)}
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

                              {user.employee.designation !== "Admin" && (
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
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ADD / EDIT USER DIALOG */}
      <UserDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={mode === "add" ? handleCreate : handleUpdate}
        mode={mode}
        isLoading={
          mode === "add" ? createMutation.isPending : updateMutation.isPending
        }
        defaultValues={
          mode === "edit" && selectedUser
            ? { employeeId: selectedUser.employeeId }
            : null
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
