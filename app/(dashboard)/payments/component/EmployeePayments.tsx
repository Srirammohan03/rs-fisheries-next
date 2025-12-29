"use client";

import { useState, useEffect } from "react";
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

interface Employee {
  id: string;
  fullName: string;
  designation: string;
  grossSalary: number;
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
  const [salaryMonth, setSalaryMonth] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const now = new Date();
    const yyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    const yyyyMmDd = now.toISOString().split("T")[0];
    if (salaryMonth === "") setSalaryMonth(yyyyMm);
    if (date === "") setDate(yyyyMmDd);
  }, [salaryMonth, date]);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<
    Employee[]
  >({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch("/api/employee");
      if (!res.ok) throw new Error("Failed to load employees");
      const json = await res.json();
      return (json.data || []).sort((a: Employee, b: Employee) =>
        a.fullName.localeCompare(b.fullName)
      );
    },
    staleTime: 1000 * 60,
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const monthYear = salaryMonth
    ? new Date(salaryMonth + "-01").toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : null;

  const handleEmployeeChange = (id: string) => {
    setSelectedEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    setEmployeeName(emp?.fullName || "");
    setAmount(emp?.grossSalary || 0);
  };

  const handleSave = async () => {
    if (!selectedEmployeeId || !salaryMonth || !date || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    if (paymentMode !== "cash" && !reference.trim()) {
      toast.error("Please enter reference number / UTR / Cheque no.");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("employeeId", selectedEmployeeId);
    formData.append("employeeName", employeeName);
    formData.append("salaryMonth", salaryMonth);
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

      setSelectedEmployeeId("");
      setEmployeeName("");
      setSalaryMonth("");
      setDate("");
      setAmount(0);
      setPaymentMode("cash");
      setReference("");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            !salaryMonth ||
            !date ||
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent className="border-slate-200">
                  {loadingEmployees ? (
                    <div className="px-6 py-4 text-center text-sm text-slate-500">
                      Loading employees...
                    </div>
                  ) : employees.length === 0 ? (
                    <div className="px-6 py-4 text-center text-sm text-slate-500">
                      No employees found
                    </div>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id} className="py-3">
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="font-medium text-sm text-slate-800 truncate">
                              {emp.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 capitalize truncate">
                              {emp.designation}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-[#139BC3] whitespace-nowrap">
                            {formatCurrency(emp.grossSalary)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Field label="Salary Month *">
              <Input
                type="month"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
            <Field label="Payment Date *">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          {selectedEmployee && amount > 0 ? (
            <div className="space-y-4">
              <div>
                <p className="text-base font-medium text-slate-700">
                  Salary Amount{monthYear ? ` for ${monthYear}` : ""}
                </p>
              </div>
              <p className="text-4xl font-bold text-emerald-600">
                {formatCurrency(amount)}
              </p>
              <p className="text-sm text-slate-500">
                {selectedEmployee.fullName} - {selectedEmployee.designation}
              </p>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">
              Select an employee to view the salary amount
            </p>
          )}
        </div>

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
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          )}
        </div>
      </div>
    </CardCustom>
  );
}
