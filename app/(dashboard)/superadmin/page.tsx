// app\(dashboard)\superadmin\page.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import RoleGuard from "@/components/RoleGuard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, Save, UserCog, Shield, LockKeyhole } from "lucide-react";

// --- CONSTANTS ---
const THEME_COLOR = "#139bc3"; // Your brand color
const ALL_PERMISSIONS = [
  "dashboard.view",
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

const ROLES = [
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
];

// --- WRAPPER ---
export default function SuperAdminPageWrapper() {
  return (
    <RoleGuard permission="teams.view">
      <SuperAdminPage />
    </RoleGuard>
  );
}

// --- MAIN COMPONENT ---
function SuperAdminPage() {
  const [data, setData] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState("admin");
  const [checked, setChecked] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  // 1. Fetch Data
  useEffect(() => {
    fetchPermissions();
  }, []);

  async function fetchPermissions() {
    try {
      const res = await axios.get("/api/superadmin/permissions");
      setData(res.data.roles);
    } catch (error) {
      console.error("Failed to fetch permissions", error);
    }
  }

  // 2. Sync State when Role changes
  useEffect(() => {
    const rolePerms = data
      .filter((r) => r.role === selectedRole)
      .map((r) => r.permission);
    setChecked(rolePerms || []);
  }, [selectedRole, data]);

  // 3. Save Function
  async function save() {
    setIsLoading(true);
    try {
      await axios.post("/api/superadmin/permissions", {
        role: selectedRole,
        permissions: checked,
      });
      setSuccessOpen(true); // Trigger Success Dialog
      window.dispatchEvent(new Event("role-updated"));
    } catch (error) {
      alert("Failed to save permissions");
    } finally {
      setIsLoading(false);
    }
  }

  // 4. Toggle Logic
  function toggle(p: string) {
    setChecked((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  // 5. Formatter
  const formatPermission = (perm: string) => {
    return perm
      .replace(".view", "")
      .split(".")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="min-h-screen bg-gray-50/30 p-6 md:p-8 space-y-8 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8" style={{ color: THEME_COLOR }} />
            Role Permission Panel
          </h1>
          <p className="text-muted-foreground mt-1 ml-10">
            Configure access levels and security protocols for{" "}
            <b>{selectedRole}</b>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Active Access
            </span>
            <span
              className="text-xl font-bold leading-none"
              style={{ color: THEME_COLOR }}
            >
              {checked.length}{" "}
              <span className="text-gray-400 text-sm font-normal">
                / {ALL_PERMISSIONS.length}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Role Selector */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <Card className="border-0 shadow-lg ring-1 ring-gray-200 bg-white">
            <CardHeader className="bg-gray-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="w-5 h-5" style={{ color: THEME_COLOR }} />
                Select Role
              </CardTitle>
              <CardDescription>Target role to modify</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:ring-2 focus:ring-[#139bc3]/20">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin" className="font-semibold">
                    Admin
                  </SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace(/([A-Z])/g, " $1").trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-6 p-4 rounded-lg text-sm border bg-[#139bc3]/5 border-[#139bc3]/20">
                <div className="flex items-start gap-3">
                  <LockKeyhole
                    className="w-5 h-5 mt-0.5 shrink-0"
                    style={{ color: THEME_COLOR }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">Security Note</p>
                    <p className="mt-1 text-gray-600 leading-relaxed">
                      Permissions are applied immediately after saving. Ensure
                      you verify sensitive modules like <b>Payments</b> or{" "}
                      <b>Audit</b>.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Permissions Matrix */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="border-0 shadow-lg ring-1 ring-gray-200 h-full">
            <CardHeader className="border-b pb-4 mb-4 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-xl">Access Matrix</CardTitle>
                <CardDescription>Toggle modules for this role</CardDescription>
              </div>

              <Button
                onClick={save}
                disabled={isLoading}
                className="min-w-[140px] shadow-md text-white transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: THEME_COLOR }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#118aa0")
                } // slightly darker
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = THEME_COLOR)
                }
              >
                {isLoading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ALL_PERMISSIONS.map((p) => {
                  const isActive = checked.includes(p);
                  return (
                    <div
                      key={p}
                      onClick={() => toggle(p)}
                      className={`
                                        group relative flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all duration-200
                                        ${
                                          isActive
                                            ? "bg-[#139bc3]/5 border-[#139bc3] shadow-sm"
                                            : "bg-white border-gray-100 hover:border-[#139bc3]/50 hover:shadow-md"
                                        }
                                    `}
                    >
                      <div className="space-y-1">
                        <Label
                          htmlFor={p}
                          className={`text-sm font-semibold cursor-pointer block ${isActive ? "text-[#139bc3]" : "text-gray-700"}`}
                        >
                          {formatPermission(p)}
                        </Label>
                        <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wide opacity-70">
                          {p}
                        </p>
                      </div>
                      <Switch
                        id={p}
                        checked={isActive}
                        onCheckedChange={() => toggle(p)}
                        // We use data-state to override the default shadcn color with your custom hex
                        className="data-[state=checked]:bg-[#139bc3]"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- SUCCESS DIALOG --- */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="flex flex-col items-center gap-4 py-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300"
              style={{ backgroundColor: `${THEME_COLOR}20` }} // 20% opacity hex
            >
              <CheckCircle2
                className="h-8 w-8"
                style={{ color: THEME_COLOR }}
              />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl">Permissions Updated</DialogTitle>
              <DialogDescription className="text-center max-w-[300px] mx-auto">
                The security profile for{" "}
                <strong className="text-gray-900 capitalize">
                  {selectedRole}
                </strong>{" "}
                has been successfully saved.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              className="w-full sm:w-auto min-w-[120px] text-white"
              style={{ backgroundColor: THEME_COLOR }}
              onClick={() => setSuccessOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
