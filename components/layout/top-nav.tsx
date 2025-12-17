"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, LogOut, PanelLeft } from "lucide-react";
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

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const BRAND = "#139BC3";

// TEMP user hook (replace later with JWT decode)
const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const json = await res.json();
        if (mounted) setUser(json.user);
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
  const userInitials = useMemo(() => initials(user?.name), [user?.name]);

  const { toggleSidebar } = useSidebar();

  async function handleLogout() {
    try {
      await axios.post("/api/logout");
    } finally {
      localStorage.removeItem("user");
      router.replace("/");
    }
  }

  return (
    <header className="sticky top-0 z-50 h-16 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/65">
      <div className="flex h-full items-center px-4 sm:px-6">
        {/* Sidebar toggle (NO SidebarTrigger to avoid error) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="rounded-xl hover:bg-slate-50"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5 text-slate-700" />
        </Button>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm hover:shadow-md transition"
                aria-label="Open user menu"
              >
                <div
                  className="h-9 w-9 rounded-2xl grid place-items-center"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND} 0%, #0ea5e9 100%)`,
                    boxShadow: "0 10px 25px rgba(19,155,195,0.22)",
                  }}
                >
                  <Avatar className="h-9 w-9 bg-transparent">
                    <AvatarFallback className="bg-transparent text-white font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="hidden sm:flex flex-col items-start leading-tight pr-1">
                  <span className="text-sm font-semibold text-slate-900 max-w-[160px] truncate">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-slate-500 max-w-[160px] truncate">
                    {user?.email || "user@example.com"}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-64 rounded-2xl border border-slate-200 p-2 shadow-xl"
            >
              <DropdownMenuLabel className="rounded-xl px-3 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {user?.email || "user@example.com"}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer rounded-xl px-3 py-2 text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
