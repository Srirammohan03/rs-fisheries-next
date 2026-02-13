// components/layout/top-nav.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, PanelLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const BRAND = "#139BC3";

/* ✅ Match /api/me response */
type AuthUser = {
  id: string;
  email: string;
  role: string;
  name?: string;
  photo?: string;
  designation?: string;
};

const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (mounted) setUser(json.user ?? null);
      } catch {
        if (mounted) setUser(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { user };
};

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

export function TopNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();

  const userInitials = useMemo(() => initials(user?.name), [user?.name]);

  async function handleLogout() {
    try {
      await axios.post("/api/logout");
    } finally {
      router.replace("/");
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="h-16 w-full px-3 sm:px-6 flex items-center overflow-x-hidden">
        {/* Sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="shrink-0 rounded-xl hover:bg-slate-50"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5 text-slate-700" />
        </Button>

        <div className="flex-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm hover:shadow-md transition"
              type="button"
            >
              {/* Avatar */}
              <div
                className="h-9 w-9 rounded-2xl grid place-items-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${BRAND} 0%, #0ea5e9 100%)`,
                  boxShadow: "0 10px 25px rgba(19,155,195,0.22)",
                }}
              >
                <Avatar className="h-9 w-9 bg-transparent">
                  <AvatarImage src={user?.photo || undefined} />
                  <AvatarFallback className="bg-transparent text-white font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Text */}
              <div className="hidden sm:flex min-w-0 flex-col items-start leading-tight pr-1">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {user?.name || "User"}
                </span>
                <span className="text-xs text-slate-500 truncate">
                  {user?.email || "user@example.com"}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-72 rounded-2xl border border-slate-200 p-2 shadow-xl"
          >
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 truncate">
                  {user?.name || "User"}
                </span>
                <span className="text-xs text-slate-500 truncate">
                  {user?.email || "user@example.com"}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer rounded-xl px-3 py-2 text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
