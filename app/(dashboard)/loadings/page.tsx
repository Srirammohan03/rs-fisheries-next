"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import ClientLoading from "./components/ClientLoading";
import AgentLoading from "./components/AgentLoading";
import FormerLoading from "./components/FormerLoading";

import { usePermissions } from "@/hooks/usePermissions";

export default function LoadingsPage() {
  const { permissions, role, loading } = usePermissions();

  const canFormer =
    role === "admin" || permissions.includes("loadings.former.view");
  const canClient =
    role === "admin" || permissions.includes("loadings.client.view");
  const canAgent =
    role === "admin" || permissions.includes("loadings.agent.view");

  // choose first allowed tab automatically
  const firstTab = useMemo(() => {
    if (canFormer) return "fish";
    if (canClient) return "client";
    if (canAgent) return "agent";
    return "";
  }, [canFormer, canClient, canAgent]);

  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (!loading) setActiveTab(firstTab);
  }, [loading, firstTab]);

  // ⛔ wait until permission loaded
  if (loading) return null;

  // ⛔ no permission at all
  if (!canFormer && !canClient && !canAgent) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        No permission to view loadings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Loadings</h1>
        <p className="text-slate-500">
          Manage fish, client, and agent loadings
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* TAB BAR */}
        <TabsList className="relative inline-flex h-14 w-full max-w-2xl items-center justify-between rounded-full border border-[#139BC3]/25 bg-white/70 p-1 shadow-[0_10px_30px_-18px_rgba(19,155,195,0.45)] backdrop-blur supports-[backdrop-filter]:bg-white/55">
          {canFormer && (
            <TabsTrigger
              value="fish"
              className="relative h-12 flex-1 rounded-full px-3 sm:px-6 text-sm sm:text-base font-semibold"
            >
              Farmer
            </TabsTrigger>
          )}

          {canClient && (
            <TabsTrigger
              value="client"
              className="relative h-12 flex-1 rounded-full px-3 sm:px-6 text-sm sm:text-base font-semibold"
            >
              Client
            </TabsTrigger>
          )}

          {canAgent && (
            <TabsTrigger
              value="agent"
              className="relative h-12 flex-1 rounded-full px-3 sm:px-6 text-sm sm:text-base font-semibold"
            >
              Agent
            </TabsTrigger>
          )}
        </TabsList>

        {canFormer && (
          <TabsContent value="fish" className="mt-2">
            <FormerLoading />
          </TabsContent>
        )}

        {canClient && (
          <TabsContent value="client" className="mt-2">
            <ClientLoading />
          </TabsContent>
        )}

        {canAgent && (
          <TabsContent value="agent" className="mt-2">
            <AgentLoading />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
