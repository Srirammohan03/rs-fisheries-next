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
import { set } from "zod";
import { Textarea } from "@/components/ui/textarea";

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

const safeNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
};

export default function FormerLoading() {
  const [FarmerName, setFarmerName] = useState("");
  const [village, setVillage] = useState("");
  const [date, setDate] = useState(todayYMD());
  const [vehicleId, setVehicleId] = useState("");
  const [otherVehicleNo, setOtherVehicleNo] = useState("");
  const [loading, setLoading] = useState(false);
  // ✅ local set to hide vehicles without page reload
  const [usedVehicleIds, setUsedVehicleIds] = useState<Set<string>>(
    () => new Set()
  );

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
      return res.data.data ?? [];
    },
  });

  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 },
  ]);

  const { data: varieties = [] } = useQuery({
    queryKey: ["varieties"],
    queryFn: async () => {
      const res = await axios.get("/api/fish-varieties");
      return res.data.data ?? [];
    },
  });

  // ---- helpers ----
  const calculateRowTotal = (item: ItemRow) => {
    return safeNum(item.noTrays) * TRAY_WEIGHT + safeNum(item.loose);
  };

  const totalKgs = useMemo(
    () => items.reduce((sum, item) => sum + calculateRowTotal(item), 0),
    [items]
  );

  const totalTrays = useMemo(
    () =>
      items.reduce((sum, item) => {
        sum = sum + safeNum(item.noTrays);
        return sum;
      }, 0),
    [items]
  );

  const resetForm = () => {
    setFarmerName("");
    setVillage("");
    setDate(todayYMD());
    setVehicleId("");
    setOtherVehicleNo("");
    setItems([
      { id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 },
    ]);
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

  const availableVehicles = useMemo(() => {
    return (vehicles ?? []).filter((v: any) => {
      if (!v?.id) return false;
      if (v.id === vehicleId) return true;
      return !usedVehicleIds.has(v.id);
    });
  }, [vehicles, usedVehicleIds, vehicleId]);

  // ---- items CRUD ----
  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 },
    ]);
  };

  const removeRow = (id: string) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.id !== id)
    );
  };

  const updateRow = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        if (field === "varietyCode") {
          return { ...r, varietyCode: String(value ?? "") };
        }

        const n = safeNum(value);
        // ✅ no negative numbers
        return { ...r, [field]: Math.max(0, n) } as ItemRow;
      })
    );
  };

  // ---- VALIDATION ----
  const validateForm = () => {
    if (isLoadingBillNo || isErrorBillNo || !billNoData?.billNo) {
      toast.error("Bill number not available");
      return false;
    }

    if (!FarmerName.trim()) {
      toast.error("Enter Farmer Name");
      return false;
    }

    if (!date) {
      toast.error("Select Date");
      return false;
    }

    // if (!vehicleId) {
    //   toast.error("Select Vehicle");
    //   return false;
    // }

    // if (isOtherVehicle && !otherVehicleNo.trim()) {
    //   toast.error("Enter Vehicle Number");
    //   return false;
    // }

    // rows with any qty entered
    const activeRows = items.filter(
      (i) => safeNum(i.noTrays) > 0 || safeNum(i.loose) > 0
    );

    if (activeRows.length === 0) {
      toast.error("Enter at least one item");
      return false;
    }

    // validate each active row
    for (let idx = 0; idx < activeRows.length; idx++) {
      const row = activeRows[idx];

      if (!row.varietyCode?.trim()) {
        toast.error(`Select variety for row #${idx + 1}`);
        return false;
      }

      const trays = safeNum(row.noTrays);
      const loose = safeNum(row.loose);

      if (trays < 0 || loose < 0) {
        toast.error(`Negative values are not allowed (row #${idx + 1})`);
        return false;
      }

      if (!Number.isFinite(trays) || !Number.isFinite(loose)) {
        toast.error(`Invalid number in row #${idx + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setLoading(true);

    const activeRows = items.filter(
      (i) => safeNum(i.noTrays) > 0 || safeNum(i.loose) > 0
    );

    const fishCodeValue = activeRows[0].varietyCode.toUpperCase();

    try {
      await axios.post("/api/former-loading", {
        billNo: billNoData.billNo,
        fishCode: fishCodeValue,
        FarmerName: FarmerName.trim(),
        village: village.trim(),
        date,
        vehicleId: isOtherVehicle ? null : vehicleId,
        vehicleNo: isOtherVehicle ? otherVehicleNo.trim() : null,
        items: activeRows.map((i) => ({
          varietyCode: i.varietyCode,
          noTrays: safeNum(i.noTrays),
          trayKgs: safeNum(i.noTrays) * TRAY_WEIGHT,
          loose: safeNum(i.loose),
          totalKgs: safeNum(i.noTrays) * TRAY_WEIGHT + safeNum(i.loose),
          pricePerKg: 0,
          totalPrice: 0,
        })),
      });

      toast.success("Former loading saved successfully!");

      // ✅ mark vehicle used immediately (no refresh)
      if (!isOtherVehicle && vehicleId) {
        setUsedVehicleIds((prev) => {
          const next = new Set(prev);
          next.add(vehicleId);
          return next;
        });
      }

      resetForm();
      queryClient.invalidateQueries({ queryKey: ["next-bill-no"] });
      // optional: keep this if your backend changes vehicle assignment
      queryClient.invalidateQueries({ queryKey: ["assigned-vehicles"] });
      setLoading(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };
  // allow letters + space + dot + apostrophe + hyphen
  const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;

  // allow letters + space only (you can add dot/hyphen if needed)
  const VILLAGE_REGEX = /^[A-Za-z][A-Za-z ]*$/;

  const cleanName = (value: string) =>
    value
      .replace(/[^A-Za-z .'-]/g, "")
      .replace(/\s{2,}/g, " ")
      .trimStart();

  const cleanVillage = (value: string) => value.trimStart();

  return (
    <Card className="p-4 sm:p-6 rounded-2xl space-y-6 border border-[#139BC3]/15 bg-white shadow-[0_18px_45px_-30px_rgba(19,155,195,0.35)]">
      {/* Header */}
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
          className="w-full sm:w-auto rounded-xl px-5 bg-[#139BC3] text-white hover:bg-[#1088AA]"
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Field>
          <FieldLabel>Farmer Bill No</FieldLabel>
          <Input
            readOnly
            value={displayBillNo}
            className="bg-slate-50 font-semibold"
          />
        </Field>
        <Field>
          <FieldLabel>Farmer Name *</FieldLabel>
          <Input
            type="text"
            value={FarmerName}
            onChange={(e) => setFarmerName(cleanName(e.target.value))}
            placeholder="Enter farmer name"
            inputMode="text"
          />
        </Field>

        <Field>
          <FieldLabel>Address</FieldLabel>
          <Textarea
            value={village}
            onChange={(e) => setVillage(cleanVillage(e.target.value))}
            placeholder="Enter full address"
            inputMode="text"
          />
        </Field>

        <Field>
          <FieldLabel>Date *</FieldLabel>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
            <SelectTrigger>
              <SelectValue placeholder="Select Vehicle" />
            </SelectTrigger>

            <SelectContent>
              {availableVehicles.map((v: any) => (
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
            <Input
              value={otherVehicleNo}
              onChange={(e) => setOtherVehicleNo(e.target.value.toUpperCase())}
              placeholder="Enter vehicle number"
            />
          </Field>
        )}
      </div>

      {/* Items - Mobile Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[#139BC3]/15 bg-white p-4 shadow-sm"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Row #{i + 1}</div>
              <Button
                size="icon"
                variant="ghost"
                disabled={items.length === 1}
                onClick={() => removeRow(item.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Variety *
                </label>
                <Select
                  value={item.varietyCode}
                  onValueChange={(v) => updateRow(item.id, "varietyCode", v)}
                >
                  <SelectTrigger>
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

                <div className="mt-1 text-sm text-slate-700">
                  {getVarietyName(item.varietyCode)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Trays
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={item.noTrays}
                    onChange={(e) =>
                      updateRow(item.id, "noTrays", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Loose
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item.loose}
                    onChange={(e) =>
                      updateRow(item.id, "loose", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="bg-slate-50 border rounded-xl p-3 flex justify-between">
                <span className="text-sm">Total Kgs</span>
                <span className="font-bold">
                  {calculateRowTotal(item).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Items - Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[900px]">
          <thead className="bg-[#139BC3]/10">
            <tr>
              <th className="px-4 py-3 text-left">S.No</th>
              <th className="px-4 py-3 text-left">Variety *</th>
              {/* <th className="px-4 py-3 text-left">Name</th> */}
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
                  <Select
                    value={item.varietyCode}
                    onValueChange={(v) => updateRow(item.id, "varietyCode", v)}
                  >
                    <SelectTrigger>
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

                {/* <td className="px-4 py-3">
                  {getVarietyName(item.varietyCode)}
                </td> */}

                <td className="px-4 py-3">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={item.noTrays}
                    onChange={(e) =>
                      updateRow(item.id, "noTrays", e.target.value)
                    }
                    className="w-24"
                  />
                </td>

                <td className="px-4 py-3">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item.loose}
                    onChange={(e) =>
                      updateRow(item.id, "loose", e.target.value)
                    }
                    className="w-24"
                  />
                </td>

                <td className="px-4 py-3 font-semibold">
                  {calculateRowTotal(item).toFixed(2)}
                </td>

                <td className="px-4 py-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    onClick={() => removeRow(item.id)}
                  >
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
          <div className="space-y-1">
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-500">Total Trays:</span>
              <span className="text-2xl font-bold">
                {totalTrays.toFixed(1)}
                <span className="text-lg text-slate-500 ml-1">Trays</span>
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-500">Total Weight:</span>
              <span className="text-2xl font-bold">
                {(totalKgs * 0.95).toFixed(2)}
                <span className="text-lg text-slate-500 ml-1">Kgs</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
