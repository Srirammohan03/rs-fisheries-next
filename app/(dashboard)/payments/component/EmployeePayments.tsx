// app\(dashboard)\payments\component\EmployeePayments.tsx
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
    if (paymentMode !== "cash" && !reference.trim()) {
      toast.error("Please enter reference number / UTR / Cheque no.");
      return;
    }
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
      title="Employee Payments"
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
          className="bg-[#139BC3] text-white hover:bg-[#1088AA] focus-visible:ring-2 focus-visible:ring-[#139BC3]/40 shadow-sm"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? "Saving..." : "Pay Salary"}
        </Button>
      }
    >
      <div className="space-y-7">
        {/* Employee + Date */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-base font-medium text-slate-700">
                Employee Name <span className="text-rose-600">*</span>
              </Label>

              <Select
                value={selectedEmployeeId}
                onValueChange={handleEmployeeChange}
                disabled={loadingEmployees}
              >
                <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                  <SelectValue
                    placeholder={
                      loadingEmployees ? "Loading..." : "Select employee"
                    }
                  />
                </SelectTrigger>

                <SelectContent className="border-slate-200">
                  {employees.length === 0 ? (
                    <div className="px-6 py-4 text-center text-sm text-slate-500">
                      No pending salaries
                    </div>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id} className="py-3">
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="font-medium text-sm text-slate-800 truncate">
                              {emp.name}
                            </span>
                            <span className="text-[11px] text-slate-500 capitalize truncate">
                              {emp.role}
                            </span>
                          </div>

                          <span className="text-sm font-semibold text-[#139BC3] whitespace-nowrap">
                            {formatCurrency(emp.pendingSalary)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedEmployee && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-medium text-slate-600">
                    Total Pending Salary
                  </p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600">
                    {formatCurrency(selectedEmployee.pendingSalary)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
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
                required
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          </div>
        </div>

        {/* Amount */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <Field label="Amount Paid (₹) *">
            <Input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="1"
              required
              className="h-12 border-slate-200 bg-white shadow-sm text-3xl font-bold focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>
        </div>

        {/* Payment Mode + Reference */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <Label className="text-slate-700">Payment Mode</Label>

          <div className="flex flex-wrap gap-2">
            {(["cash", "ac", "upi", "cheque"] as const).map((mode) => {
              const selected = paymentMode === mode;
              return (
                <Badge
                  key={mode}
                  onClick={() => {
                    setPaymentMode(mode);
                    if (mode === "cash") setReference("");
                  }}
                  className={[
                    "cursor-pointer select-none px-4 py-2 rounded-full border transition shadow-sm",
                    selected
                      ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {mode === "cash" && "Cash"}
                  {mode === "ac" && "A/C Transfer"}
                  {mode === "upi" && "UPI / PhonePe"}
                  {mode === "cheque" && "Cheque"}
                </Badge>
              );
            })}
          </div>

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
                required
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          )}
        </div>
      </div>
    </CardCustom>
  );
}
