"use client";

import { ClientPayments } from "./component/ClientPayments";
import { EmployeePayments } from "./component/EmployeePayments";
import { PackingAmount } from "./component/PackingAmount";
import { VendorPayments } from "./component/VendorPayments";

export default function Payments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground mt-1">
          Manage all payment transactions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VendorPayments />
        <ClientPayments />
        <EmployeePayments />
        <PackingAmount />
      </div>
    </div>
  );
}
