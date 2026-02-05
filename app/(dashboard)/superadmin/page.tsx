// app\(dashboard)\superadmin\page.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import RoleGuard from "@/components/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const ALL_PERMISSIONS = [
  "dashboard",

  "loadings.view",
  "loadings.former.view",
  "loadings.client.view",
  "loadings.agent.view",

  "stock.view",
  "farmerBills.view",
  "partyBills.view",

  "payments.view",
  "receipts.view",
  "vehicles.view",

  "employees.view",
  "teams.view",
  "audit.view",
];

export default function SuperAdminPageWrapper() {
  return (
    <RoleGuard permission="teams.view">
      <SuperAdminPage />
    </RoleGuard>
  );
}

function SuperAdminPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState("admin");
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  async function fetchPermissions() {
    const res = await axios.get("/api/superadmin/permissions");
    setData(res.data.roles);
  }

  useEffect(() => {
    const rolePerms = data
      .filter((r) => r.role === selectedRole)
      .map((r) => r.permission);

    setChecked(rolePerms);
  }, [selectedRole, data]);

  async function save() {
    await axios.post("/api/superadmin/permissions", {
      role: selectedRole,
      permissions: checked,
    });

    alert("Permissions updated");
    window.dispatchEvent(new Event("role-updated"));
  }

  function toggle(p: string) {
    setChecked((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Role Permission Panel</h1>

      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border rounded-xl px-3 py-2"
          >
            {[
              "clerk",
              "sales",
              "finance",
              "partner",
              "documentation",
              "executive",
              "seniorExecutive",
              "juniorExecutive",
              "supervisor",
              "others",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ALL_PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-2">
                <Checkbox
                  checked={checked.includes(p)}
                  onCheckedChange={() => toggle(p)}
                />
                {p}
              </label>
            ))}
          </div>

          <Button onClick={save} className="rounded-xl">
            Save Permissions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
