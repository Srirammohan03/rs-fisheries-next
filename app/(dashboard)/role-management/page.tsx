// app/(dashboard)/role-management/page.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import RoleGuard from "@/components/RoleGuard";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Shield } from "lucide-react";

/* ---------------- TYPES ---------------- */
type Role =
  | "finance"
  | "clerk"
  | "documentation"
  | "sales"
  | "partner"
  | "seniorExecutive"
  | "juniorExecutive"
  | "executive"
  | "supervisor"
  | "others";

interface UserRow {
  id: string;
  email: string;
  role: Role;
  employee?: {
    fullName?: string;
    designation?: string;
  };
}

const roles: Role[] = [
  "finance",
  "clerk",
  "documentation",
  "sales",
  "partner",
  "seniorExecutive",
  "juniorExecutive",
  "executive",
  "supervisor",
  "others",
];

/* ---------------- WRAPPER (PROTECT PAGE) ---------------- */
export default function RoleManagementWrapper() {
  return (
    <RoleGuard permission="teams.view">
      <RoleManagementPage />
    </RoleGuard>
  );
}

/* ---------------- MAIN PAGE ---------------- */
function RoleManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await axios.get("/api/admin/users");
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Fetch users failed", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, role: Role) {
    try {
      setSavingId(userId);

      await axios.put("/api/admin/users", { userId, role });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u)),
      );

      // 🔥 refresh sidebar + permissions live
      window.dispatchEvent(new Event("role-updated"));
    } catch (err) {
      console.error(err);
      alert("Failed to update role");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <div className="p-6">Loading users...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-[#139BC3]" />
        <h1 className="text-3xl font-bold">Role Management</h1>
      </div>

      {/* USERS */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            System Users
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border rounded-2xl p-4"
            >
              {/* USER INFO */}
              <div>
                <p className="font-semibold text-slate-900">
                  {user.employee?.fullName || "Unknown"}
                </p>
                <p className="text-sm text-slate-500">{user.email}</p>

                <div className="mt-2 flex gap-2">
                  <Badge variant="secondary">
                    {user.employee?.designation}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700">
                    {user.role}
                  </Badge>
                </div>
              </div>

              {/* ROLE SELECT */}
              <div className="flex items-center gap-3">
                <Select
                  defaultValue={user.role}
                  onValueChange={(val: Role) => updateRole(user.id, val)}
                >
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>

                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button disabled={savingId === user.id} className="rounded-xl">
                  {savingId === user.id ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
