"use client";

import { useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/helpers/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type PaymentMode = "cash" | "ac" | "upi" | "cheque";

interface EmployeeWithDue {
  id: string;
  name: string;
  role: string;
  email: string;
  pendingSalary: number;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function EmployeePayments() {
  const queryClient = useQueryClient();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeName, setEmployeeName] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState<string>(""); // Reference number
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<
    EmployeeWithDue[]
  >({
    queryKey: ["employees-with-salary-due"],
    queryFn: async (): Promise<EmployeeWithDue[]> => {
      const [userRes, salaryRes] = await Promise.all([
        fetch("/api/team-member"),
        fetch("/api/salaries"),
      ]);

      if (!userRes.ok || !salaryRes.ok) throw new Error("Failed to load data");

      const usersJson = await userRes.json();
      const salariesJson = await salaryRes.json();

      const users: {
        id: string;
        name: string | null;
        email: string | null;
        role: string;
      }[] = usersJson.data || [];

      const salaries: { userId: string; amount: number }[] =
        salariesJson.data || [];

      const salaryMap = new Map<string, number>();
      salaries.forEach((s) => {
        const current = salaryMap.get(s.userId) || 0;
        salaryMap.set(s.userId, current + s.amount);
      });

      const paidMap = new Map<string, number>(); // extend later

      return users
        .map((user) => {
          const totalSalary = salaryMap.get(user.id) || 0;
          const totalPaid = paidMap.get(user.id) || 0;
          const pending = totalSalary - totalPaid;

          return {
            id: user.id,
            name: user.name || "Unnamed Employee",
            role: user.role || "staff",
            email: user.email || "",
            pendingSalary: pending,
          };
        })
        .filter((emp): emp is EmployeeWithDue => emp.pendingSalary > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 60,
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const handleEmployeeChange = (id: string) => {
    setSelectedEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    setEmployeeName(emp?.name || "");
  };

  const handleSave = async () => {
    if (!selectedEmployeeId || !date || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    // Reference required for non-cash payments
    if (paymentMode !== "cash" && !reference.trim()) {
      toast.error("Please enter reference number / UTR / Cheque no.");
      return;
    }

    // if (selectedEmployee && amount > selectedEmployee.pendingSalary) {
    //   if (
    //     !confirm(
    //       `Amount exceeds pending salary of ${formatCurrency(
    //         selectedEmployee.pendingSalary
    //       )}. Continue?`
    //     )
    //   ) {
    //     return;
    //   }
    // }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("userId", selectedEmployeeId);
    formData.append("employeeName", employeeName);
    formData.append("date", date);
    formData.append("amount", amount.toString());
    formData.append("paymentMode", paymentMode);
    if (reference) formData.append("reference", reference);

    try {
      const res = await fetch("/api/payments/employee", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }

      toast.success("Salary payment recorded successfully!");

      // Reset
      setSelectedEmployeeId("");
      setEmployeeName("");
      setDate("");
      setAmount(0);
      setPaymentMode("cash");
      setReference("");
      queryClient.invalidateQueries({
        queryKey: ["employees-with-salary-due"],
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show reference field only if not cash
  const showReference = paymentMode !== "cash";

  return (
    <CardCustom
      title="3C. Employee Payments"
      actions={
        <Button
          size="sm"
          onClick={handleSave}
          disabled={
            isSubmitting ||
            loadingEmployees ||
            !selectedEmployeeId ||
            amount <= 0
          }
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? "Saving..." : "Pay Salary"}
        </Button>
      }
    >
      <div className="space-y-7 max-w-4xl mx-auto">
        {/* Employee + Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Employee Name <span className="text-red-500">*</span>
            </Label>

            <Select
              value={selectedEmployeeId}
              onValueChange={handleEmployeeChange}
              disabled={loadingEmployees}
            >
              <SelectTrigger className="h-12">
                <SelectValue
                  placeholder={
                    loadingEmployees ? "Loading..." : "Select employee"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {employees.length === 0 ? (
                  <div className="px-6 py-4 text-center text-sm text-muted-foreground">
                    No pending salaries
                  </div>
                ) : (
                  employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center justify-between w-full gap-3 py-2">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-sm">
                            {emp.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground capitalize">
                            {emp.role}
                          </span>
                        </div>
                        <span className="text-base font-bold  whitespace-nowrap">
                          {formatCurrency(emp.pendingSalary)}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedEmployee && (
              <div className="mt-5 p-5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl border border-orange-200">
                <p className="text-sm font-medium text-orange-700">
                  Total Pending Salary
                </p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {formatCurrency(selectedEmployee.pendingSalary)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedEmployee.name} ({selectedEmployee.role})
                </p>
              </div>
            )}
          </div>

          <Field label="Payment Date *">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12"
              required
            />
          </Field>
        </div>

        {/* Amount */}
        <Field label="Amount Paid (₹) *">
          <Input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            placeholder="0"
            min="1"
            className="text-3xl font-bold "
            required
          />
        </Field>

        {/* Payment Mode */}
        <div className="space-y-3">
          <Label>Payment Mode</Label>
          <div className="flex flex-wrap gap-4">
            {(["cash", "ac", "upi", "cheque"] as const).map((mode) => (
              <Badge
                key={mode}
                variant={paymentMode === mode ? "default" : "outline"}
                onClick={() => {
                  setPaymentMode(mode);
                  if (mode === "cash") setReference(""); // auto clear reference if cash
                }}
                className="px-6 py-3 text-base font-medium cursor-pointer select-none hover:scale-105 transition"
              >
                {mode === "cash" && "Cash"}
                {mode === "ac" && "A/C Transfer"}
                {mode === "upi" && "UPI / PhonePe"}
                {mode === "cheque" && "Cheque"}
              </Badge>
            ))}
          </div>
        </div>

        {/* Reference Number - Only if not Cash */}
        {showReference && (
          <Field
            label={
              paymentMode === "ac"
                ? "Bank Reference / UTR No. *"
                : paymentMode === "upi"
                ? "UPI Transaction ID *"
                : "Cheque Number *"
            }
          >
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Enter reference number"
              className="h-12"
              required
            />
          </Field>
        )}
      </div>
    </CardCustom>
  );
}
