"use client";

import { useEffect, useState } from "react";

export function usePermissions() {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [role, setRole] = useState<string>("");
    const [loading, setLoading] = useState(true);

    async function load() {
        try {
            const res = await fetch("/api/me", { cache: "no-store" });
            const data = await res.json();

            const userRole = data?.user?.role || "";
            setRole(userRole);

            // admin gets all access
            if (userRole === "admin") {
                setPermissions(["*"]);
                setLoading(false);
                return;
            }

            // fetch role permissions from DB
            const permRes = await fetch("/api/superadmin/permissions", {
                cache: "no-store",
            });

            const permData = await permRes.json();

            const rolePerms =
                permData?.roles
                    ?.filter((p: any) => p.role === userRole)
                    ?.map((p: any) => p.permission) || [];

            setPermissions(rolePerms);
        } catch (e) {
            console.error("Permission load error", e);
            setPermissions([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();

        // 🔥 realtime update after superadmin change
        const refresh = () => load();
        window.addEventListener("role-updated", refresh);
        return () => window.removeEventListener("role-updated", refresh);
    }, []);

    return { permissions, role, loading };
}
