"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Truck,
  FileText,
  Receipt,
  CreditCard,
  Car,
  Wallet,
  Warehouse,
  Users,
  User2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

import { useVendorBillsBadge } from "../providers/VendorBillsBadgeProvider";

const BRAND = "#139BC3";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/loadings", label: "Loadings", icon: Truck },
  { href: "/stocks", label: "Stock", icon: Warehouse },
  { href: "/vendor-bills", label: "Vendor Bills", icon: FileText },
  { href: "/client-bills", label: "Client Bills", icon: Receipt },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/salaries", label: "Salaries", icon: Wallet },
  { href: "/employee", label: "Employee", icon: User2 },
  { href: "/teams-members", label: "Team Members", icon: Users },
];

export default function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();

  const pathname = usePathname();
  // const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const { newVendorBillsCount, markVendorBillsAsSeen } = useVendorBillsBadge();

  useEffect(() => {
    if (pathname === "/vendor-bills") markVendorBillsAsSeen();
  }, [pathname, markVendorBillsAsSeen]);
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r bg-white"
      style={
        {
          boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.04)",
        } as React.CSSProperties
      }
    >
      {/* HEADER */}
      <SidebarHeader className="border-b bg-white p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl grid place-items-center text-white font-extrabold"
              style={{
                background: `linear-gradient(135deg, ${BRAND} 0%, #0ea5e9 100%)`,
                boxShadow: "0 10px 25px rgba(19,155,195,0.25)",
              }}
            >
              RS
            </div>

            <div className="leading-tight">
              <h2 className="text-base font-bold text-slate-900">
                RS Fisheries
              </h2>
              <p className="text-xs text-slate-500">Admin Dashboard</p>
            </div>
          </div>
        ) : (
          <div
            className="h-10 w-10 rounded-2xl grid place-items-center text-white font-extrabold mx-auto"
            style={{
              background: `linear-gradient(135deg, ${BRAND} 0%, #0ea5e9 100%)`,
              boxShadow: "0 10px 25px rgba(19,155,195,0.25)",
            }}
          >
            RS
          </div>
        )}
      </SidebarHeader>

      {/* MENU */}
      <SidebarContent className="bg-white">
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="px-3 text-[11px] uppercase tracking-wider text-slate-500">
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;

                // ✅ active if exact OR nested route like /vendor-bills/123
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                const showBadge =
                  item.href === "/vendor-bills" && newVendorBillsCount > 0;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={[
                        "relative rounded-xl text-sm transition-all active:scale-[0.99]",
                        "hover:bg-slate-50",
                        collapsed
                          ? "justify-center px-2 py-3" // ✅ more space when collapsed
                          : "px-3 py-2.5 gap-3", // normal expanded
                        isActive ? "bg-slate-50 shadow-sm" : "text-slate-700",
                      ].join(" ")}
                      style={
                        isActive
                          ? ({
                              border: "1px solid rgba(19,155,195,0.18)",
                            } as React.CSSProperties)
                          : undefined
                      }
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                        className={[
                          "flex w-full items-center",
                          collapsed ? "justify-center" : "gap-3",
                        ].join(" ")}
                      >
                        {/* ✅ left accent only in expanded */}
                        {isActive && !collapsed && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-full"
                            style={{ backgroundColor: BRAND }}
                          />
                        )}

                        <Icon
                          className={collapsed ? "h-5 w-5" : "h-4 w-4"}
                          style={
                            isActive
                              ? ({ color: BRAND } as React.CSSProperties)
                              : ({ color: "#64748B" } as React.CSSProperties)
                          }
                        />

                        {/* ✅ hide text on collapse */}
                        {!collapsed && (
                          <span
                            className={[
                              "truncate",
                              isActive ? "font-semibold text-slate-900" : "",
                            ].join(" ")}
                          >
                            {item.label}
                          </span>
                        )}

                        {/* Badge (expanded) */}
                        {showBadge && !collapsed && (
                          <Badge
                            className="ml-auto rounded-full px-2 py-0.5 text-[11px]"
                            style={{
                              backgroundColor: "rgba(239,68,68,0.12)",
                              color: "#ef4444",
                              border: "1px solid rgba(239,68,68,0.25)",
                            }}
                          >
                            {newVendorBillsCount > 99
                              ? "99+"
                              : newVendorBillsCount}
                          </Badge>
                        )}

                        {/* small dot indicator when collapsed */}
                        {showBadge && collapsed && (
                          <span
                            className="absolute right-2 top-2 h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: "#ef4444",
                              boxShadow: "0 0 0 3px rgba(239,68,68,0.15)",
                            }}
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* FOOTER */}
      <div className="border-t bg-white px-4 py-3">
        <p className="text-center text-xs text-slate-500">
          Powered by{" "}
          <a
            href="https://www.outrightcreators.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#139BC3] hover:underline"
          >
            Outright Creators
          </a>
        </p>
      </div>
    </Sidebar>
  );
}
