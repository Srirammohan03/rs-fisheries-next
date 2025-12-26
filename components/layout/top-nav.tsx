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
import { User } from "@/utils/user-types";

const BRAND = "#139BC3";

// TEMP user hook (replace later with JWT decode)
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

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
  const userInitials = useMemo(
    () => initials(user?.employee?.fullName),
    [user?.employee?.fullName]
  );

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
    <header
      className="
        sticky top-0 z-50 w-full
        border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70
      "
    >
      <div
        className="
          h-16 w-full
          px-3 sm:px-6
          flex items-center
          overflow-x-hidden
        "
      >
        {/* Left: Sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="shrink-0 rounded-xl hover:bg-slate-50"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5 text-slate-700" />
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="
                shrink-0
                flex items-center gap-2 sm:gap-3
                rounded-2xl border border-slate-200 bg-white
                px-2 py-1.5
                shadow-sm hover:shadow-md transition
                max-w-[70vw] sm:max-w-none
              "
              aria-label="Open user menu"
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
                  <AvatarImage src={user?.employee.photo || undefined} />
                  <AvatarFallback className="bg-transparent text-white font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Text (hidden on mobile) */}
              <div className="hidden sm:flex min-w-0 flex-col items-start leading-tight pr-1">
                <span className="text-sm font-semibold text-slate-900 max-w-[180px] truncate">
                  {user?.employee.fullName || "User"}
                </span>
                <span className="text-xs text-slate-500 max-w-[180px] truncate">
                  {user?.employee.email || "user@example.com"}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-72 max-w-[92vw] rounded-2xl border border-slate-200 p-2 shadow-xl"
          >
            <DropdownMenuLabel className="rounded-xl px-3 py-2">
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-900 truncate">
                  {user?.employee.fullName || "User"}
                </span>
                <span className="text-xs text-slate-500 truncate">
                  {user?.employee.email || "user@example.com"}
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
    </header>
  );
}
