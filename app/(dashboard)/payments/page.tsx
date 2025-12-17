"use client";

import React, { useState } from "react";
import { VendorPayments } from "./component/VendorPayments";
import { ClientPayments } from "./component/ClientPayments";
import { EmployeePayments } from "./component/EmployeePayments";
import { PackingAmount } from "./component/PackingAmount";

type TabId = "vendor" | "client" | "employee" | "packing";

function TabsRoot({
  value,
  onValueChange,
  children,
}: {
  value: TabId;
  onValueChange: (v: TabId) => void;
  children: React.ReactNode;
}) {
  return <div data-value={value}>{children}</div>;
}

function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-1 rounded-2xl border border-slate-100 bg-gray-200 p-1 shadow-sm backdrop-blur "
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  activeValue,
  onClick,
  children,
}: {
  value: TabId;
  activeValue: TabId;
  onClick: (v: TabId) => void;
  children: React.ReactNode;
}) {
  const isActive = value === activeValue;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onClick(value)}
      className={[
        "relative rounded-xl px-5 py-2 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#139BC3]/35",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isActive
          ? "bg-white text-[#139BC3] shadow-sm border border-slate-200"
          : "text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      {/* subtle active underline */}
      <span
        className={[
          "pointer-events-none absolute inset-x-3 -bottom-[8px] h-[2px] rounded-full transition-opacity",
          isActive ? "bg-[#139BC3] opacity-100" : "opacity-0",
        ].join(" ")}
      />
      {children}
    </button>
  );
}

function TabsContent({
  activeValue,
  value,
  children,
}: {
  activeValue: TabId;
  value: TabId;
  children: React.ReactNode;
}) {
  return activeValue === value ? <div className="mt-6">{children}</div> : null;
}

export default function Payments() {
  const [tab, setTab] = useState<TabId>("vendor");

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Payments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage all payment transactions
          </p>
        </div>

        {/* Tabs */}
        <TabsRoot value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="vendor" activeValue={tab} onClick={setTab}>
              Vendor Payments
            </TabsTrigger>
            <TabsTrigger value="client" activeValue={tab} onClick={setTab}>
              Client Payments
            </TabsTrigger>
            <TabsTrigger value="employee" activeValue={tab} onClick={setTab}>
              Employee Payments
            </TabsTrigger>
            <TabsTrigger value="packing" activeValue={tab} onClick={setTab}>
              Packing Amount
            </TabsTrigger>
          </TabsList>
        </TabsRoot>
      </header>

      <main className="w-full">
        <TabsContent activeValue={tab} value="vendor">
          <VendorPayments />
        </TabsContent>

        <TabsContent activeValue={tab} value="client">
          <ClientPayments />
        </TabsContent>

        <TabsContent activeValue={tab} value="employee">
          <EmployeePayments />
        </TabsContent>

        <TabsContent activeValue={tab} value="packing">
          <PackingAmount />
        </TabsContent>
      </main>
    </div>
  );
}
