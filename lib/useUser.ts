"use client";

import { useEffect, useState } from "react";

type User = {
    id: string;
    role: string;
    email: string;
    name?: string;
    designation?: string;
    photo?: string;
};

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/me", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                setUser(data?.user ?? null);
            })
            .finally(() => setLoading(false));
    }, []);

    return { user, loading };
}
