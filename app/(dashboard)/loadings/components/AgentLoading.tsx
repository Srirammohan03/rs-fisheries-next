"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";

const TRAY_WEIGHT = 35;
const DEDUCTION_PERCENT = 5;

const todayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

interface ItemRow {
  id: string;
  varietyCode: string;
  name: string;
  noTrays: number;
  loose: number;
  trayKgs: number;
  totalKgs: number;
}

export default function AgentLoading() {
  const [billNo, setBillNo] = useState("");
  const [agentName, setAgentName] = useState("");
  const [village, setVillage] = useState("");
  const [date, setDate] = useState(todayYMD()); // ✅ default today
  const [fishCode, setFishCode] = useState("");

  const [vehicleId, setVehicleId] = useState(""); // ✅ dropdown id
  const [otherVehicleNo, setOtherVehicleNo] = useState(""); // ✅ other input

  const isOtherVehicle = vehicleId === "__OTHER__";

  const [items, setItems] = useState<ItemRow[]>([
    {
      id: crypto.randomUUID(),
      varietyCode: "",
      name: "",
      noTrays: 0,
      loose: 0,
      trayKgs: 0,
      totalKgs: 0,
    },
  ]);

  const { data: varieties = [] } = useQuery({
    queryKey: ["varieties"],
    queryFn: async () => {
      const res = await axios.get("/api/fish-varieties");
      return res.data.data || [];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["assigned-vehicles"],
    queryFn: async () => {
      const res = await axios.get("/api/vehicles/assign-driver");
      return res.data.data;
    },
  });

  const getVarietyName = (code: string) => {
    return varieties.find((v: any) => v.code === code)?.name || "";
  };

  const { data: billData, refetch: refetchBillNo } = useQuery({
    queryKey: ["agent-bill-no"],
    queryFn: async () => {
      const res = await fetch("/api/agent-loading/next-bill-no");
      const data = await res.json();
      return data.billNo;
    },
  });

  useEffect(() => {
    if (billData) setBillNo(billData);
  }, [billData]);

  const updateRow = (id: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              trayKgs:
                field === "noTrays" ? Number(value) * TRAY_WEIGHT : row.trayKgs,
              totalKgs:
                (field === "noTrays"
                  ? Number(value) * TRAY_WEIGHT
                  : row.trayKgs) +
                (field === "loose" ? Number(value) : row.loose),
            }
          : row
      )
    );
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        varietyCode: "",
        name: "",
        noTrays: 0,
        loose: 0,
        trayKgs: 0,
        totalKgs: 0,
      },
    ]);
  };

  const deleteRow = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((row) => row.id !== id));
  };

  const totalKgs = useMemo(
    () => items.reduce((sum, r) => sum + (Number(r.totalKgs) || 0), 0),
    [items]
  );

  // ✅ 5% deduction
  const grandTotal = useMemo(() => {
    const after = totalKgs * (1 - DEDUCTION_PERCENT / 100);
    return Number(after.toFixed(2));
  }, [totalKgs]);

  const resetForm = () => {
    setAgentName("");
    setVillage("");
    setDate(todayYMD());
    setVehicleId("");
    setOtherVehicleNo("");

    setItems([
      {
        id: crypto.randomUUID(),
        varietyCode: "",
        name: "",
        noTrays: 0,
        loose: 0,
        trayKgs: 0,
        totalKgs: 0,
      },
    ]);

    refetchBillNo();
  };

  const handleSave = async () => {
    if (!billNo) return toast.error("Bill number missing");
    if (!agentName.trim()) return toast.error("Enter Agent Name");
    if (!date.trim()) return toast.error("Select Date");

    if (!vehicleId.trim()) return toast.error("Select Vehicle");
    if (isOtherVehicle && !otherVehicleNo.trim())
      return toast.error("Enter Vehicle Number");

    const firstVariety = items[0]?.varietyCode;
    if (!firstVariety) return toast.error("Select at least one variety");

    const fishCodeValue = firstVariety.toUpperCase();

    const totals = {
      totalTrays: items.reduce((a, b) => a + (Number(b.noTrays) || 0), 0),
      totalLooseKgs: items.reduce((a, b) => a + (Number(b.loose) || 0), 0),
      totalTrayKgs: items.reduce(
        (a, b) => a + (Number(b.noTrays) || 0) * TRAY_WEIGHT,
        0
      ),
      totalKgs: totalKgs,
    };

    try {
      await axios.post("/api/agent-loading", {
        agentName,
        fishCode: fishCodeValue,
        billNo,
        village,
        date,

        // ✅ match API
        vehicleId: isOtherVehicle ? null : vehicleId,
        vehicleNo: isOtherVehicle ? otherVehicleNo.trim() : null,

        ...totals,
        grandTotal,

        items: items.map((r) => ({
          varietyCode: r.varietyCode,
          noTrays: r.noTrays,
          trayKgs: (Number(r.noTrays) || 0) * TRAY_WEIGHT,
          loose: Number(r.loose) || 0,
          totalKgs: Number(r.totalKgs) || 0,
        })),
      });

      toast.success("Agent loading saved!");
      resetForm();
    } catch (err) {
      toast.error("Failed to save agent loading");
    }
  };

  return (
    <Card className="rounded-2xl p-4 sm:p-6 border border-[#139BC3]/15 bg-white shadow-[0_18px_45px_-30px_rgba(19,155,195,0.35)]">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Agent Loading
          </h2>
          <p className="text-sm text-slate-500">
            Add agent details and loading items
          </p>
        </div>

        <Button
          onClick={handleSave}
          className="w-full sm:w-auto rounded-xl px-5 bg-[#139BC3] text-white hover:bg-[#1088AA] shadow-[0_12px_24px_-14px_rgba(19,155,195,0.7)]"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      <CardContent className="space-y-6 pt-4 sm:pt-6">
        {/* INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field>
            <FieldLabel>Agent Bill No</FieldLabel>
            <Input
              readOnly
              value={billNo}
              className="bg-slate-50 font-semibold border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>

          <Field>
            <FieldLabel>Agent Name</FieldLabel>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>

          <Field>
            <FieldLabel>Village</FieldLabel>
            <Input
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>

          <Field>
            <FieldLabel>Date</FieldLabel>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>

          <Field className="sm:col-span-2 md:col-span-1">
            <FieldLabel>Select Vehicle</FieldLabel>

            <Select
              value={vehicleId}
              onValueChange={(v) => {
                setVehicleId(v);
                if (v !== "__OTHER__") setOtherVehicleNo("");
              }}
            >
              <SelectTrigger className="border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>

              <SelectContent>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vehicleNumber} – {v.assignedDriver?.name || "No Driver"}
                  </SelectItem>
                ))}

                <SelectItem value="__OTHER__">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {isOtherVehicle && (
            <Field className="sm:col-span-2 md:col-span-1">
              <FieldLabel>Other Vehicle Number</FieldLabel>
              <Input
                value={otherVehicleNo}
                onChange={(e) => setOtherVehicleNo(e.target.value)}
                className="border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                placeholder="Enter vehicle number"
              />
            </Field>
          )}
        </div>

        {/* ✅ MOBILE CARDS (no horizontal scroll) */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {items.map((row, index) => (
            <div
              key={row.id}
              className="rounded-2xl border border-[#139BC3]/15 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-slate-700">
                  Row #{index + 1}
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  disabled={items.length === 1}
                  onClick={() => deleteRow(row.id)}
                  className="rounded-xl hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                {/* Variety */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Variety
                  </div>

                  <Select
                    value={row.varietyCode}
                    onValueChange={(val) => {
                      updateRow(row.id, "varietyCode", val);
                      updateRow(row.id, "name", getVarietyName(val));
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>

                    <SelectContent>
                      {varieties.map((v: any) => (
                        <SelectItem key={v.code} value={v.code}>
                          {v.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="mt-2 text-sm text-slate-700">
                    {row.name || "—"}
                  </div>
                </div>

                {/* Qty */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      Trays
                    </div>
                    <Input
                      type="number"
                      value={row.noTrays}
                      min={0}
                      className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      onChange={(e) =>
                        updateRow(row.id, "noTrays", Number(e.target.value))
                      }
                      disabled={!row.varietyCode}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      Loose
                    </div>
                    <Input
                      type="number"
                      value={row.loose}
                      min={0}
                      className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      onChange={(e) =>
                        updateRow(row.id, "loose", Number(e.target.value))
                      }
                      disabled={!row.varietyCode}
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                  <div className="text-sm text-slate-600">Total</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {row.totalKgs}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button
            onClick={addRow}
            variant="outline"
            className="w-full rounded-xl border-[#139BC3]/30 text-[#139BC3] hover:text-[#1088AA] hover:bg-[#139BC3]/10 flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Add Row
          </Button>
        </div>

        {/* ✅ DESKTOP TABLE (md+) */}
        <div className="hidden md:block mt-2 overflow-x-auto rounded-2xl border border-[#139BC3]/15">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-[#139BC3]/10">
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  S.No
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Variety
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Name
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Trays
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Loose
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Total
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((row, index) => (
                <tr
                  key={row.id}
                  className="hover:bg-[#139BC3]/5 transition-colors"
                >
                  <td className="px-3 py-3 text-slate-800">{index + 1}</td>

                  <td className="px-3 py-3">
                    <Select
                      value={row.varietyCode}
                      onValueChange={(val) => {
                        updateRow(row.id, "varietyCode", val);
                        updateRow(row.id, "name", getVarietyName(val));
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {varieties.map((v: any) => (
                          <SelectItem key={v.code} value={v.code}>
                            {v.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="px-3 py-3 text-slate-700">{row.name}</td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={row.noTrays}
                      min={0}
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      onChange={(e) =>
                        updateRow(row.id, "noTrays", Number(e.target.value))
                      }
                      disabled={!row.varietyCode}
                    />
                  </td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={row.loose}
                      min={0}
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      onChange={(e) =>
                        updateRow(row.id, "loose", Number(e.target.value))
                      }
                      disabled={!row.varietyCode}
                    />
                  </td>

                  <td className="px-3 py-3 font-semibold text-slate-900">
                    {row.totalKgs}
                  </td>

                  <td className="px-3 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={items.length === 1}
                      onClick={() => deleteRow(row.id)}
                      className="rounded-xl hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4">
            <Button
              onClick={addRow}
              variant="outline"
              className="rounded-xl border-[#139BC3]/30 text-[#139BC3] hover:text-[#1088AA] hover:bg-[#139BC3]/10 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Row
            </Button>
          </div>
        </div>

        {/* GRAND TOTAL */}
        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-sm text-slate-500">
              Grand Total (after 5% deduction)
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {grandTotal} <span className="text-slate-500">Kgs</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
