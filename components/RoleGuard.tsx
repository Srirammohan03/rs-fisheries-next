"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

export default function RoleGuard({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { permissions, role, loading } = usePermissions();

  useEffect(() => {
    if (loading) return;

    // admin full access
    if (role === "admin") return;

    // if no permission → go stocks
    if (
      !permissions.includes("*") &&
      !permissions.includes(permission) &&
      !permissions.includes(permission.replace(".view", ""))
    ) {
      router.replace("/stocks");
    }
  }, [permissions, role, loading, permission, router]);

  if (loading) return null;

  if (
    role !== "admin" &&
    !permissions.includes("*") &&
    !permissions.includes(permission) &&
    !permissions.includes(permission.replace(".view", ""))
  ) {
    return null;
  }

  return <>{children}</>;
}
