// hooks\useUserRole.ts
"use client";

import { useEffect, useState } from "react";

export function useUserRole() {
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchRole() {
        try {
            const res = await fetch(`/api/me?ts=${Date.now()}`, {
                cache: "no-store",
            });

            const data = await res.json();
            setRole(data?.user?.role || null);
        } catch {
            setRole(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchRole();

        // 🔥 LIVE ROLE UPDATE LISTENER
        const refetch = () => fetchRole();
        window.addEventListener("role-updated", refetch);

        return () => window.removeEventListener("role-updated", refetch);
    }, []);

    return { role, loading };
}
