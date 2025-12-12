"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import AppSidebar from "@/components/layout/sidebarMain";
import QueryProvider from "@/components/providers/query-provider";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <Toaster />
      <SidebarProvider>
        <div className="flex h-screen w-screen overflow-hidden">
          {/* Sidebar */}
          <div className="shrink-0">
            <AppSidebar />
          </div>

          {/* Right Content */}
          <div className="flex flex-col flex-1 min-w-0">
            <TopNav />

            <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </QueryProvider>
  );
}
