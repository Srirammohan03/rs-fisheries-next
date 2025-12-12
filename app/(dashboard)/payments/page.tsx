"use client";

import { useState } from "react";
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
  return <div>{children}</div>;
}

function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 p-1 bg-gray-100 rounded-2xl shadow-sm"
      role="tablist"
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
      role="tab"
      aria-selected={isActive}
      onClick={() => onClick(value)}
      className={`px-6 py-2 rounded-full text-sm font-medium transition-shadow focus:outline-none ${
        isActive
          ? "bg-white shadow-md text-blue-600"
          : "text-muted-foreground hover:bg-white/40"
      }`}
    >
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
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all payment transactions
          </p>
        </div>

        {/* Main page tabs (pill style) */}
        <div>
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
        </div>
      </header>

      {/* Tab content */}
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
