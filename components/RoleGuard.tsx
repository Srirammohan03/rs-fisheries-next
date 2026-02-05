// components/RoleGuard.tsx
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
  const { permissions, role, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // admin always allowed
    if (role === "admin") return;

    // no permission
    if (!permissions.includes(permission)) {
      router.replace("/dashboard");
    }
  }, [permissions, role, loading, permission, router]);

  // wait until permission loads
  if (loading) return null;

  if (role !== "admin" && !permissions.includes(permission)) {
    return null;
  }

  return <>{children}</>;
}
