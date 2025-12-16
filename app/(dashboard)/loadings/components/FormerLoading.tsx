"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";

import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TRAY_WEIGHT = 35;

interface ItemRow {
  id: string;
  varietyCode: string;
  noTrays: number;
  loose: number;
}

export default function FormerLoading() {
  // ---------- HEADER FIELDS ----------
  const [billNo, setBillNo] = useState("");
  const [FarmerName, setFarmerName] = useState("");
  const [village, setVillage] = useState("");
  const [date, setDate] = useState("");
  const [fishCode, setFishCode] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  // ---------- FETCH BILL NUMBER ----------
  const fetchNextBillNo = async () => {
    try {
      const res = await fetch("/api/former-loading/next-bill-no");
      const data = await res.json();
      setBillNo(data.billNo);
    } catch {
      toast.error("Failed to load bill number");
    }
  };

  useEffect(() => {
    fetchNextBillNo();
  }, []);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["assigned-vehicles"],
    queryFn: async () => {
      const res = await axios.get("/api/vehicles/assign-driver");
      return res.data.data;
    },
  });

  // ---------- ITEM ROWS ----------
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: crypto.randomUUID(),
      varietyCode: "",
      noTrays: 0,
      loose: 0,
    },
  ]);

  // ---------- FETCH VARIETIES ----------
  const { data: varieties = [] } = useQuery({
    queryKey: ["varieties"],
    queryFn: async () => {
      const res = await axios.get("/api/fish-varieties");
      return res.data.data;
    },
  });

  // ---------- ROW OPERATIONS ----------
  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        varietyCode: "",
        noTrays: 0,
        loose: 0,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]: field === "varietyCode" ? value : Math.max(0, value),
            }
          : r
      )
    );
  };

  const calculateTotal = (item: ItemRow) => {
    return item.noTrays * TRAY_WEIGHT + item.loose;
  };

  const grandTotal = items.reduce((sum, item) => sum + calculateTotal(item), 0);

  // ---------- RESET FORM ----------
  const resetForm = () => {
    setFarmerName("");
    setVillage("");
    setDate("");
    setVehicleId("");
    setFishCode("");

    setItems([
      {
        id: crypto.randomUUID(),
        varietyCode: "",
        noTrays: 0,
        loose: 0,
      },
    ]);

    fetchNextBillNo();
  };

  // ---------- SAVE ----------
  const handleSave = async () => {
    if (!billNo.trim()) return toast.error("Bill No missing");
    if (!FarmerName.trim()) return toast.error("Enter Farmer Name");
    if (!date.trim()) return toast.error("Select Date");

    const validRows = items.filter((i) => i.noTrays > 0 || i.loose > 0);
    if (validRows.length === 0) return toast.error("Enter at least one row");

    const firstVariety = items[0]?.varietyCode;
    if (!firstVariety) return toast.error("Select at least one variety");

    const fishCodeValue = firstVariety.toUpperCase();

    const totals = {
      totalTrays: items.reduce((a, b) => a + b.noTrays, 0),
      totalLooseKgs: items.reduce((a, b) => a + b.loose, 0),
      totalTrayKgs: items.reduce((a, b) => a + b.noTrays * TRAY_WEIGHT, 0),
    };

    const totalKgs = totals.totalTrayKgs + totals.totalLooseKgs;

    try {
      await axios.post("/api/former-loading", {
        billNo,
        fishCode: fishCodeValue,
        FarmerName,
        village,
        date,
        vehicleId,

        totalTrays: totals.totalTrays,
        totalLooseKgs: totals.totalLooseKgs,
        totalTrayKgs: totals.totalTrayKgs,
        totalKgs,
        grandTotal,

        items: items.map((i) => ({
          varietyCode: i.varietyCode,
          noTrays: i.noTrays,
          trayKgs: i.noTrays * TRAY_WEIGHT,
          loose: i.loose,
          totalKgs: i.noTrays * TRAY_WEIGHT + i.loose,
        })),
      });

      toast.success("Former loading saved successfully!");
      resetForm();
    } catch (err) {
      console.log(err);
      toast.error("Failed to save");
    }
  };

  // ---------- GET VARIETY NAME ----------
  const getVarietyName = (code: string) => {
    const v = varieties.find((x: any) => x.code === code);
    return v?.name || "-";
  };

  return (
    <Card
      className="
    p-6 rounded-2xl space-y-6
    border border-blue-100/70 bg-white
    shadow-[0_18px_45px_-30px_rgba(37,99,235,0.35)]
  "
    >
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Farmer Loading
          </h2>
          <p className="text-sm text-slate-500">
            Add farmer details and loading items
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

      {/* INPUTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field>
          <FieldLabel>Farmer Bill No</FieldLabel>
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
          <FieldLabel>Farmer Name</FieldLabel>
          <Input
            value={FarmerName}
            onChange={(e) => setFarmerName(e.target.value)}
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

          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="border-slate-200 focus:ring-blue-300">
              <SelectValue placeholder="Select Vehicle" />
            </SelectTrigger>

            <SelectContent>
              {vehicles.map((v: any) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.vehicleNumber} – {v.assignedDriver?.name || "No Driver"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-2xl border border-blue-100/70">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-blue-50/60">
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-700">
                S.No
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-700">
                Variety
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-700">
                Name
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-700">
                Trays
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-700">
                Loose
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-700">
                Total
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-slate-700">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {items.map((item, i) => (
              <tr
                key={item.id}
                className="hover:bg-blue-50/40 transition-colors"
              >
                <td className="px-3 py-3 text-sm text-slate-800">{i + 1}</td>

                {/* Variety Select */}
                <td className="px-3 py-3">
                  <Select
                    value={item.varietyCode}
                    onValueChange={(v) => updateRow(item.id, "varietyCode", v)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-blue-300">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>

                    <SelectContent>
                      {varieties.map((v: any) => (
                        <SelectItem value={v.code} key={v.code}>
                          {v.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* Name */}
                <td className="px-3 py-3 text-sm text-slate-700">
                  {getVarietyName(item.varietyCode)}
                </td>

                {/* Trays */}
                <td className="px-3 py-3">
                  <Input
                    type="number"
                    className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-blue-300"
                    value={item.noTrays}
                    min={0}
                    onChange={(e) =>
                      updateRow(item.id, "noTrays", Number(e.target.value))
                    }
                  />
                </td>

                {/* Loose */}
                <td className="px-3 py-3">
                  <Input
                    type="number"
                    className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-blue-300"
                    value={item.loose}
                    min={0}
                    onChange={(e) =>
                      updateRow(item.id, "loose", Number(e.target.value))
                    }
                  />
                </td>

                {/* Total */}
                <td className="px-3 py-3 font-semibold text-slate-900">
                  {calculateTotal(item).toFixed(2)}
                </td>

                {/* Delete */}
                <td className="px-3 py-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    onClick={() => removeRow(item.id)}
                    className="rounded-xl hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={addRow}
          className="
        rounded-xl border-blue-200
        text-blue-700 hover:text-blue-800
        hover:bg-blue-50
      "
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>

        <div className="text-right">
          <p className="text-sm text-slate-500">Grand Total</p>
          <p className="text-2xl font-bold text-slate-900">
            {grandTotal.toFixed(2)} <span className="text-slate-500">kgs</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
