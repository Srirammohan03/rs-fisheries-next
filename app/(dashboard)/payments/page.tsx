"use client";

import React, { useState } from "react";
import { VendorPayments } from "./component/VendorPayments";
import { ClientPayments } from "./component/ClientPayments";
import { EmployeePayments } from "./component/EmployeePayments";
import { PackingAmount } from "./component/PackingAmount";
import { DispatchPayment } from "./component/DispatchPayment";

type TabId = "dispatch" | "vendor" | "client" | "employee" | "packing";

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function TabsRoot({
  value,
  onValueChange,
  children,
}: {
  value: TabId;
  onValueChange: (v: TabId) => void;
  children: React.ReactNode;
}) {
  // (optional) we keep these props for future usage
  return <div data-value={value}>{children}</div>;
}

function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        // ✅ Mobile: clean 2x2 grid buttons
        "w-full grid grid-cols-2 gap-2",
        // ✅ Desktop: your original segmented pill
        "sm:w-auto sm:inline-flex sm:items-center sm:gap-1 sm:rounded-2xl sm:border sm:border-slate-100 sm:bg-gray-200 sm:p-1 sm:shadow-sm sm:backdrop-blur",
        className
      )}
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
  className,
}: {
  value: TabId;
  activeValue: TabId;
  onClick: (v: TabId) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = value === activeValue;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onClick(value)}
      className={cn(
        // ✅ Base
        "relative w-full rounded-xl px-3 py-2 text-sm font-semibold transition whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#139BC3]/35",
        "disabled:opacity-50 disabled:cursor-not-allowed",

        // ✅ Mobile look (standalone buttons)
        isActive
          ? "bg-white text-[#139BC3] shadow-sm ring-1 ring-[#139BC3]/25"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",

        // ✅ Desktop look (your original segmented style)
        "sm:w-auto sm:px-5 sm:py-2 sm:ring-0 sm:bg-transparent",
        isActive
          ? "sm:bg-white sm:text-[#139BC3] sm:shadow-sm sm:border sm:border-slate-200"
          : "sm:text-slate-600 sm:hover:bg-slate-50",

        className
      )}
    >
      {/* ✅ Underline only on desktop (avoid weird spacing on mobile) */}
      <span
        className={cn(
          "pointer-events-none absolute inset-x-3 -bottom-[8px] h-[2px] rounded-full transition-opacity hidden sm:block",
          isActive ? "bg-[#139BC3] opacity-100" : "opacity-0"
        )}
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
  return activeValue === value ? (
    <div className="mt-4 sm:mt-6">{children}</div>
  ) : null;
}

export default function Payments() {
  const [tab, setTab] = useState<TabId>("dispatch");

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Payments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage all payment transactions
          </p>
        </div>

        {/* ✅ Tabs: mobile grid, desktop pill */}
        <TabsRoot value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="dispatch" activeValue={tab} onClick={setTab}>
              Dispatch
            </TabsTrigger>
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
        <TabsContent activeValue={tab} value="dispatch">
          <DispatchPayment />
        </TabsContent>
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
