"use client";

import { useEffect, useMemo, useState } from "react";
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
  noTrays: number;
  loose: number;
}

export default function FormerLoading() {
  const [FarmerName, setFarmerName] = useState("");
  const [village, setVillage] = useState("");
  const [date, setDate] = useState(todayYMD());
  const [vehicleId, setVehicleId] = useState("");
  const [otherVehicleNo, setOtherVehicleNo] = useState("");

  const queryClient = useQueryClient();

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
    if (isErrorBillNo) toast.error("Failed to load bill number");
  }, [isErrorBillNo]);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["assigned-vehicles"],
    queryFn: async () => {
      const res = await axios.get("/api/vehicles/assign-driver");
      return res.data.data;
    },
  });

  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 },
  ]);

  const { data: varieties = [] } = useQuery({
    queryKey: ["varieties"],
    queryFn: async () => {
      const res = await axios.get("/api/fish-varieties");
      return res.data.data;
    },
  });

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 },
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

  const calculateRowTotal = (item: ItemRow) => {
    return item.noTrays * TRAY_WEIGHT + item.loose;
  };

  const totalKgs = useMemo(
    () => items.reduce((sum, item) => sum + calculateRowTotal(item), 0),
    [items]
  );

  const resetForm = () => {
    setFarmerName("");
    setVillage("");
    setDate(todayYMD());
    setVehicleId("");
    setOtherVehicleNo("");
    setItems([{ id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 }]);
  };

  const getVarietyName = (code: string) => {
    const v = varieties.find((x: any) => x.code === code);
    return v?.name || "-";
  };

  const displayBillNo = isLoadingBillNo
    ? "Loading..."
    : isErrorBillNo
    ? "Failed to load"
    : billNoData?.billNo ?? "";

  const isOtherVehicle = vehicleId === "__OTHER__";

  const handleSave = async () => {
    if (isLoadingBillNo || isErrorBillNo || !billNoData?.billNo) {
      return toast.error("Bill number not available");
    }

    if (!FarmerName.trim()) return toast.error("Enter Farmer Name");
    if (!date) return toast.error("Select Date");
    if (!vehicleId) return toast.error("Select Vehicle");
    if (isOtherVehicle && !otherVehicleNo.trim()) return toast.error("Enter Vehicle Number");

    const validRows = items.filter((i) => i.noTrays > 0 || i.loose > 0);
    if (validRows.length === 0) return toast.error("Enter at least one item");
    if (!validRows[0].varietyCode) return toast.error("Select variety for first item");

    const fishCodeValue = validRows[0].varietyCode.toUpperCase();

    try {
      await axios.post("/api/former-loading", {
        billNo: billNoData.billNo,
        fishCode: fishCodeValue,
        FarmerName,
        village,
        date,
        vehicleId: isOtherVehicle ? null : vehicleId,
        vehicleNo: isOtherVehicle ? otherVehicleNo.trim() : null,
        items: items.map((i) => ({
          varietyCode: i.varietyCode,
          noTrays: i.noTrays,
          trayKgs: i.noTrays * TRAY_WEIGHT,
          loose: i.loose,
          totalKgs: i.noTrays * TRAY_WEIGHT + i.loose,
          pricePerKg: 0, // will be set later in vendor bills
          totalPrice: 0,
        })),
      });

      toast.success("Former loading saved successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["next-bill-no"] });
    } catch (err) {
      toast.error("Failed to save");
    }
  };

  return (
    <Card className="p-4 sm:p-6 rounded-2xl space-y-6 border border-[#139BC3]/15 bg-white shadow-[0_18px_45px_-30px_rgba(19,155,195,0.35)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">Farmer Loading</h2>
          <p className="text-sm text-slate-500">Add farmer details and loading items</p>
        </div>
        <Button onClick={handleSave} className="w-full sm:w-auto rounded-xl px-5 bg-[#139BC3] text-white hover:bg-[#1088AA]">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Field>
          <FieldLabel>Farmer Bill No</FieldLabel>
          <Input readOnly value={displayBillNo} className="bg-slate-50 font-semibold" />
        </Field>
        <Field>
          <FieldLabel>Farmer Name</FieldLabel>
          <Input value={FarmerName} onChange={(e) => setFarmerName(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Village</FieldLabel>
          <Input value={village} onChange={(e) => setVillage(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Date</FieldLabel>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field className="sm:col-span-2 md:col-span-1">
          <FieldLabel>Select Vehicle</FieldLabel>
          <Select value={vehicleId} onValueChange={(v) => { setVehicleId(v); if (v !== "__OTHER__") setOtherVehicleNo(""); }}>
            <SelectTrigger>
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
          <Field>
            <FieldLabel>Other Vehicle Number</FieldLabel>
            <Input value={otherVehicleNo} onChange={(e) => setOtherVehicleNo(e.target.value)} placeholder="Enter vehicle number" />
          </Field>
        )}
      </div>

      {/* Items Table - Mobile & Desktop */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-2xl border border-[#139BC3]/15 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Row #{i + 1}</div>
              <Button size="icon" variant="ghost" disabled={items.length === 1} onClick={() => removeRow(item.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Variety</label>
                <Select value={item.varietyCode} onValueChange={(v) => updateRow(item.id, "varietyCode", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{varieties.map((v: any) => <SelectItem key={v.code} value={v.code}>{v.code}</SelectItem>)}</SelectContent>
                </Select>
                <div className="mt-1 text-sm text-slate-700">{getVarietyName(item.varietyCode)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Trays</label>
                  <Input type="number" value={item.noTrays} onChange={(e) => updateRow(item.id, "noTrays", Number(e.target.value))} min={0} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Loose</label>
                  <Input type="number" value={item.loose} onChange={(e) => updateRow(item.id, "loose", Number(e.target.value))} min={0} />
                </div>
              </div>
              <div className="bg-slate-50 border rounded-xl p-3 flex justify-between">
                <span className="text-sm">Total Kgs</span>
                <span className="font-bold">{calculateRowTotal(item).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[900px]">
          <thead className="bg-[#139BC3]/10">
            <tr>
              <th className="px-4 py-3 text-left">S.No</th>
              <th className="px-4 py-3 text-left">Variety</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Trays</th>
              <th className="px-4 py-3 text-left">Loose</th>
              <th className="px-4 py-3 text-left">Total Kgs</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="hover:bg-[#139BC3]/5">
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3">
                  <Select value={item.varietyCode} onValueChange={(v) => updateRow(item.id, "varietyCode", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{varieties.map((v: any) => <SelectItem key={v.code} value={v.code}>{v.code}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">{getVarietyName(item.varietyCode)}</td>
                <td className="px-4 py-3"><Input type="number" value={item.noTrays} onChange={(e) => updateRow(item.id, "noTrays", Number(e.target.value))} className="w-24" /></td>
                <td className="px-4 py-3"><Input type="number" value={item.loose} onChange={(e) => updateRow(item.id, "loose", Number(e.target.value))} className="w-24" /></td>
                <td className="px-4 py-3 font-semibold">{calculateRowTotal(item).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Button size="icon" variant="ghost" disabled={items.length === 1} onClick={() => removeRow(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total Weight</p>
          <p className="text-2xl font-bold">{totalKgs.toFixed(2)} <span className="text-lg text-slate-500">Kgs</span></p>
          <p className="text-xs text-slate-500 mt-1">* 5% deduction applied on final payment in Vendor Bills</p>
        </div>
      </div>
    </Card>
  );
}