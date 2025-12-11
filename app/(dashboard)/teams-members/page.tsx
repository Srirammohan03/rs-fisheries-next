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
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">User Management</h2>
        <Button
          onClick={() => {
            setMode("add");
            setSelectedUser(null);
            setOpenDialog(true);
          }}
        >
          Add User
        </Button>
      </div>

      <div className="border border-gray-300 rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="outline"
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
            ))}
          </TableBody>
        </Table>
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
