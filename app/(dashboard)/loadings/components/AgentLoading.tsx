"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  const [date, setDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [fishCode, setFishCode] = useState("");
  // const [vehicleId, setVehicleId] = useState("");

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

  const [grandTotal, setGrandTotal] = useState(0);
  // if (!vehicleNo) return toast.error("Select a vehicle");

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
  // Helper to get fish name
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
              trayKgs: field === "noTrays" ? value * 35 : row.trayKgs,
              totalKgs:
                (field === "noTrays" ? value * 35 : row.trayKgs) +
                (field === "loose" ? value : row.loose),
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

  useEffect(() => {
    const total = items.reduce((sum, r) => sum + r.totalKgs, 0);
    setGrandTotal(total);
  }, [items]);

  const resetForm = () => {
    setAgentName("");
    setVillage("");
    setDate("");
    setVehicleNo("");

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

    setGrandTotal(0);

    // Reload bill number
    refetchBillNo();
  };

  const handleSave = async () => {
    if (!billNo) return toast.error("Bill number missing");
    if (!agentName.trim()) return toast.error("Enter Agent Name");
    const firstVariety = items[0]?.varietyCode;
    if (!firstVariety) return toast.error("Select at least one variety");
    const fishCodeValue = firstVariety.toUpperCase();
    const totals = {
      totalTrays: items.reduce((a, b) => a + b.noTrays, 0),
      totalLooseKgs: items.reduce((a, b) => a + b.loose, 0),
      totalTrayKgs: items.reduce((a, b) => a + b.noTrays * 35, 0),
      totalKgs:
        items.reduce((a, b) => a + b.noTrays * 35, 0) +
        items.reduce((a, b) => a + b.loose, 0),
    };

    try {
      await axios.post("/api/agent-loading", {
        agentName,
        fishCode: fishCodeValue,
        billNo,
        village,
        date,
        vehicleNo,
        ...totals,
        grandTotal,

        items: items.map((r) => ({
          varietyCode: r.varietyCode,
          noTrays: r.noTrays,
          trayKgs: r.noTrays * 35,
          loose: r.loose,
          totalKgs: r.totalKgs,
        })),
      });

      toast.success("Agent loading saved!");
      resetForm();
    } catch (err) {
      toast.error("Failed to save agent loading");
    }
  };
  return (
    <Card
      className="
    rounded-2xl p-6
    border border-blue-100/70 bg-white
    shadow-[0_18px_45px_-30px_rgba(37,99,235,0.35)]
  "
    >
      {/* HEADER */}
      <div className="flex justify-between items-center">
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
          className="
        rounded-xl px-5
        bg-blue-600 text-white
        hover:bg-blue-700
        shadow-[0_12px_24px_-14px_rgba(37,99,235,0.7)]
      "
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      <CardContent className="space-y-6 pt-6">
        {/* INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <FieldLabel>Agent Bill No</FieldLabel>
            <Input
              readOnly
              value={billNo}
              className="
            bg-slate-50 font-semibold
            border-slate-200
            focus-visible:ring-blue-300
          "
            />
          </Field>

          <Field>
            <FieldLabel>Agent Name</FieldLabel>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="border-slate-200 focus-visible:ring-blue-300"
            />
          </Field>

          <Field>
            <FieldLabel>Village</FieldLabel>
            <Input
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="border-slate-200 focus-visible:ring-blue-300"
            />
          </Field>

          <Field>
            <FieldLabel>Date</FieldLabel>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-slate-200 focus-visible:ring-blue-300"
            />
          </Field>

          <Field>
            <FieldLabel>Select Vehicle</FieldLabel>
            <Select value={vehicleNo} onValueChange={setVehicleNo}>
              <SelectTrigger className="border-slate-200 focus:ring-blue-300">
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>

              <SelectContent>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.vehicleNumber}>
                    {v.vehicleNumber} – {v.assignedDriver?.name || "No Driver"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* TABLE */}
        <div className="mt-2 overflow-x-auto rounded-2xl border border-blue-100/70">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-blue-50/60">
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
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  <td className="px-3 py-3 text-slate-800">{index + 1}</td>

                  {/* Variety */}
                  <td className="px-3 py-3">
                    <Select
                      value={row.varietyCode}
                      onValueChange={(val) => {
                        updateRow(row.id, "varietyCode", val);
                        updateRow(row.id, "name", getVarietyName(val));
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-blue-300">
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

                  {/* Name */}
                  <td className="px-3 py-3 text-slate-700">{row.name}</td>

                  {/* Trays */}
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={row.noTrays}
                      min={0}
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-blue-300"
                      onChange={(e) =>
                        updateRow(row.id, "noTrays", Number(e.target.value))
                      }
                    />
                  </td>

                  {/* Loose */}
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={row.loose}
                      min={0}
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-blue-300"
                      onChange={(e) =>
                        updateRow(row.id, "loose", Number(e.target.value))
                      }
                    />
                  </td>

                  {/* Total */}
                  <td className="px-3 py-3 font-semibold text-slate-900">
                    {row.totalKgs}
                  </td>

                  {/* Delete */}
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
              className="
            rounded-xl border-blue-200
            text-blue-700 hover:text-blue-800
            hover:bg-blue-50
            flex items-center gap-2
          "
            >
              <PlusCircle className="w-4 h-4" />
              Add Row
            </Button>
          </div>
        </div>

        {/* GRAND TOTAL */}
        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-sm text-slate-500">Grand Total</p>
            <p className="text-2xl font-bold text-slate-900">
              {grandTotal} <span className="text-slate-500">Kgs</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
