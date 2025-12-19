"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const [FarmerName, setFarmerName] = useState("");
  const [village, setVillage] = useState("");
  const [date, setDate] = useState("");
  const [fishCode, setFishCode] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const queryClient = useQueryClient();

  // ---------- FETCH NEXT BILL NO WITH TANSTACK QUERY ----------
  const {
    data: billNoData,
    isLoading: isLoadingBillNo,
    isError: isErrorBillNo,
  } = useQuery({
    queryKey: ["next-bill-no"],
    queryFn: async () => {
      const res = await axios.get("/api/former-loading/next-bill-no");
      return res.data;
    },
  });

  useEffect(() => {
    if (isErrorBillNo) {
      toast.error("Failed to load bill number");
    }
  }, [isErrorBillNo]);

  // ---------- FETCH VEHICLES ----------
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
  };

  // ---------- SAVE ----------
  const handleSave = async () => {
    if (isLoadingBillNo) {
      return toast.error("Waiting for bill number to load");
    }

    if (isErrorBillNo) {
      return toast.error("Bill number failed to load");
    }

    const currentBillNo = billNoData?.billNo;
    if (!currentBillNo?.trim()) {
      return toast.error("Bill No missing");
    }

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
        billNo: currentBillNo,
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
      queryClient.invalidateQueries({ queryKey: ["next-bill-no"] });
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

  const displayBillNo = isLoadingBillNo
    ? "Loading..."
    : isErrorBillNo
    ? "Failed to load"
    : billNoData?.billNo ?? "";

  return (
    <Card className="p-4 sm:p-6 rounded-2xl space-y-6 border border-[#139BC3]/15 bg-white shadow-[0_18px_45px_-30px_rgba(19,155,195,0.35)]">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          className="w-full sm:w-auto rounded-xl px-5 bg-[#139BC3] text-white hover:bg-[#1088AA] shadow-[0_12px_24px_-14px_rgba(19,155,195,0.7)]"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      {/* INPUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Field>
          <FieldLabel>Farmer Bill No</FieldLabel>
          <Input
            readOnly
            value={displayBillNo}
            className="bg-slate-50 font-semibold border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
          />
        </Field>

        <Field>
          <FieldLabel>Farmer Name</FieldLabel>
          <Input
            value={FarmerName}
            onChange={(e) => setFarmerName(e.target.value)}
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

          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
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

      {/* ✅ MOBILE CARDS (no scroll) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[#139BC3]/15 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-slate-700">
                Row #{i + 1}
              </div>

              <Button
                size="icon"
                variant="ghost"
                disabled={items.length === 1}
                onClick={() => removeRow(item.id)}
                className="rounded-xl hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Variety
                </div>
                <Select
                  value={item.varietyCode}
                  onValueChange={(v) => updateRow(item.id, "varietyCode", v)}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
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

                <div className="mt-2 text-sm text-slate-700">
                  {getVarietyName(item.varietyCode)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Trays
                  </div>
                  <Input
                    type="number"
                    className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    value={item.noTrays}
                    min={0}
                    onChange={(e) =>
                      updateRow(item.id, "noTrays", Number(e.target.value))
                    }
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Loose
                  </div>
                  <Input
                    type="number"
                    className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    value={item.loose}
                    min={0}
                    onChange={(e) =>
                      updateRow(item.id, "loose", Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                <div className="text-sm text-slate-600">Total</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {calculateTotal(item).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ DESKTOP TABLE (md+) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#139BC3]/15">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b bg-[#139BC3]/10">
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
                className="hover:bg-[#139BC3]/5 transition-colors"
              >
                <td className="px-3 py-3 text-sm text-slate-800">{i + 1}</td>

                <td className="px-3 py-3">
                  <Select
                    value={item.varietyCode}
                    onValueChange={(v) => updateRow(item.id, "varietyCode", v)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
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

                <td className="px-3 py-3 text-sm text-slate-700">
                  {getVarietyName(item.varietyCode)}
                </td>

                <td className="px-3 py-3">
                  <Input
                    type="number"
                    className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    value={item.noTrays}
                    min={0}
                    onChange={(e) =>
                      updateRow(item.id, "noTrays", Number(e.target.value))
                    }
                  />
                </td>

                <td className="px-3 py-3">
                  <Input
                    type="number"
                    className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                    value={item.loose}
                    min={0}
                    onChange={(e) =>
                      updateRow(item.id, "loose", Number(e.target.value))
                    }
                  />
                </td>

                <td className="px-3 py-3 font-semibold text-slate-900">
                  {calculateTotal(item).toFixed(2)}
                </td>

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button
          variant="outline"
          onClick={addRow}
          className="w-full sm:w-auto rounded-xl border-[#139BC3]/30 text-[#139BC3] hover:text-[#1088AA] hover:bg-[#139BC3]/10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>

        <div className="text-left sm:text-right">
          <p className="text-sm text-slate-500">Grand Total</p>
          <p className="text-2xl font-bold text-slate-900">
            {grandTotal.toFixed(2)} <span className="text-slate-500">kgs</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
