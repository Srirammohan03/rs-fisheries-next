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
import { Textarea } from "@/components/ui/textarea";
import FarmerLoadingList from "./FarmerLoadingList";

const TRAY_WEIGHT_OPTIONS = [35, 40, 42];
const DEDUCTION_PERCENT = 5;
const OTHER_VEHICLE_VALUE = "__OTHER__";

const todayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

type VehicleRow = {
  id: string;
  vehicleNumber: string;
  assignedDriver?: { name?: string | null } | null;
};

type VarietyRow = {
  id: string;
  code: string;
  name: string;
};

interface ItemRow {
  id: string;
  varietyCode: string;
  noTrays: number;
  loose: number;
}

const safeNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// allow letters + space + dot + apostrophe + hyphen
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;

const cleanName = (value: string) =>
  value
    .replace(/[^A-Za-z .'-]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();

export default function FormerLoading() {
  const queryClient = useQueryClient();

  const [trayWeight, setTrayWeight] = useState(35);
  const [farmerName, setFarmerName] = useState("");
  const [village, setVillage] = useState("");
  const [date, setDate] = useState(todayYMD());

  //  Vehicle toggle like client
  const [useVehicle, setUseVehicle] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [otherVehicleNo, setOtherVehicleNo] = useState("");
  const [localVehicle, setLocalVehicle] = useState("");

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBillNo, setEditingBillNo] = useState<string | null>(null);
  //  local set to hide vehicles without page reload
  const [usedVehicleIds, setUsedVehicleIds] = useState<Set<string>>(
    () => new Set(),
  );

  const isOtherVehicle = vehicleId === OTHER_VEHICLE_VALUE;

  // Bill No
  const {
    data: billNoData,
    isLoading: isLoadingBillNo,
    isError: isErrorBillNo,
    refetch: refetchBillNo,
  } = useQuery<{ billNo: string }>({
    queryKey: ["former-next-bill-no"],
    queryFn: async () => {
      const res = await axios.get("/api/former-loading/next-bill-no");
      return res.data;
    },
  });

  useEffect(() => {
    if (isErrorBillNo) toast.error("Failed to load bill number");
  }, [isErrorBillNo]);

  const displayBillNo =
    editingId && editingBillNo
      ? editingBillNo
      : isLoadingBillNo
        ? "Loading..."
        : isErrorBillNo
          ? "Failed to load"
          : (billNoData?.billNo ?? "");

  // Vehicles
  const { data: vehicles = [] } = useQuery<VehicleRow[]>({
    queryKey: ["assigned-vehicles"],
    queryFn: async () => {
      const res = await axios.get("/api/vehicles/assign-driver");
      return res.data.data ?? [];
    },
  });

  const availableVehicles = useMemo(() => {
    return (vehicles ?? []).filter((v) => {
      if (!v?.id) return false;
      if (v.id === vehicleId) return true;
      return !usedVehicleIds.has(v.id);
    });
  }, [vehicles, usedVehicleIds, vehicleId]);

  // Varieties
  const { data: varieties = [] } = useQuery<VarietyRow[]>({
    queryKey: ["fish-varieties"],
    queryFn: async () => {
      const res = await axios.get("/api/fish-varieties");
      return res.data.data ?? [];
    },
  });

  const getVarietyName = (code: string) => {
    const v = varieties.find((x) => x.code === code);
    return v?.name || "-";
  };

  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 },
  ]);

  // ---- helpers ----
  const calculateRowTotal = (item: ItemRow) => {
    return safeNum(item.noTrays) * trayWeight + safeNum(item.loose);
  };

  const totalKgs = useMemo(
    () => items.reduce((sum, item) => sum + calculateRowTotal(item), 0),
    [items, trayWeight],
  );

  const totalTrays = useMemo(
    () => items.reduce((sum, item) => sum + safeNum(item.noTrays), 0),
    [items],
  );

  //  Same logic as client:
  // if useVehicle => NO deduction
  // else => 5% deduction
  const netKgs = useMemo(() => {
    const t = totalKgs;
    if (useVehicle) return Math.round(t);
    return Math.round(t * (1 - DEDUCTION_PERCENT / 100));
  }, [totalKgs, useVehicle]);

  //  if untick vehicle, clear fields
  useEffect(() => {
    if (!useVehicle) {
      setVehicleId("");
      setOtherVehicleNo("");
    }
  }, [useVehicle]);

  const resetForm = () => {
    setEditingId(null);
    setEditingBillNo(null);

    setFarmerName("");
    setVillage("");
    setDate(todayYMD());

    setUseVehicle(false);
    setVehicleId("");
    setOtherVehicleNo("");
    setLocalVehicle("");
    setTrayWeight(35);

    setItems([
      { id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 },
    ]);

    refetchBillNo();
  };

  // ---- items CRUD ----
  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), varietyCode: "", noTrays: 0, loose: 0 },
    ]);
  };

  const removeRow = (id: string) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.id !== id),
    );
  };

  const updateRow = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        if (field === "varietyCode") {
          return { ...r, varietyCode: String(value ?? "") };
        }

        const n = Math.max(0, safeNum(value));
        return { ...r, [field]: n } as ItemRow;
      }),
    );
  };
  const handleEditLoading = (loading: any) => {
    setEditingId(loading.id);
    setEditingBillNo(loading.billNo);

    setFarmerName(loading.FarmerName || "");
    setVillage(loading.village || "");
    setDate(new Date(loading.date).toISOString().slice(0, 10));

    setUseVehicle(Boolean(loading.vehicleId || loading.vehicleNo));
    setVehicleId(loading.vehicleId || "");
    setOtherVehicleNo(loading.vehicleNo || "");
    setLocalVehicle(loading.localVehicle || "");
    setTrayWeight(loading.trayWeight || 35);

    const rows = loading.items.map((i: any) => ({
      id: crypto.randomUUID(),
      varietyCode: i.varietyCode,
      noTrays: i.noTrays,
      loose: i.loose,
    }));

    setItems(rows);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // ---- VALIDATION ----
  const validateForm = () => {
    if (
      !editingId &&
      (isLoadingBillNo || isErrorBillNo || !billNoData?.billNo)
    ) {
      toast.error("Bill number not available");
      return false;
    }

    const name = farmerName.trim();
    if (!name) return (toast.error("Enter Farmer Name"), false);
    if (!NAME_REGEX.test(name)) {
      toast.error("Farmer Name should contain only letters and spaces");
      return false;
    }

    if (!date) return (toast.error("Select Date"), false);

    //  Vehicle validation ONLY if checkbox checked
    if (useVehicle) {
      if (isOtherVehicle && !otherVehicleNo.trim()) {
        toast.error("Enter Vehicle Number");
        return false;
      }
      if (!isOtherVehicle && !vehicleId.trim()) {
        toast.error("Select Vehicle");
        return false;
      }
    }

    const activeRows = items.filter(
      (i) => safeNum(i.noTrays) > 0 || safeNum(i.loose) > 0,
    );
    if (activeRows.length === 0) {
      toast.error("Enter at least one item");
      return false;
    }

    for (let idx = 0; idx < activeRows.length; idx++) {
      const row = activeRows[idx];
      if (!row.varietyCode?.trim()) {
        toast.error(`Select variety for row #${idx + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const activeRows = items.filter(
      (i) => safeNum(i.noTrays) > 0 || safeNum(i.loose) > 0,
    );

    const fishCodeValue = String(
      activeRows[0]?.varietyCode || "",
    ).toUpperCase();

    if (!fishCodeValue) {
      toast.error("Select at least one variety");
      setLoading(false);
      return;
    }

    const payload = {
      fishCode: fishCodeValue,
      FarmerName: farmerName.trim(),
      village: village.trim(),
      date,
      useVehicle,
      vehicleId: useVehicle && !isOtherVehicle ? vehicleId : null,
      vehicleNo: useVehicle && isOtherVehicle ? otherVehicleNo.trim() : null,
      localVehicle: localVehicle.trim() || null,
      items: activeRows.map((i) => ({
        varietyCode: i.varietyCode,
        noTrays: safeNum(i.noTrays),
        loose: safeNum(i.loose),
      })),
      trayWeight,
    };

    try {
      if (editingId) {
        // UPDATE EXISTING RECORD
        await axios.put(`/api/former-loading/${editingId}`, payload);

        toast.success("Farmer loading updated successfully!");
      } else {
        // CREATE NEW RECORD
        await axios.post("/api/former-loading", {
          ...payload,
          billNo: billNoData!.billNo,
        });

        toast.success("Farmer loading saved successfully!");
      }

      // hide used vehicle instantly
      if (useVehicle && !isOtherVehicle && vehicleId) {
        setUsedVehicleIds((prev) => {
          const next = new Set(prev);
          next.add(vehicleId);
          return next;
        });
      }

      resetForm();

      // refresh queries
      queryClient.invalidateQueries({ queryKey: ["farmer-loadings"] });
      queryClient.invalidateQueries({ queryKey: ["former-next-bill-no"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-vehicles"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");

      if (err?.response?.data?.prisma?.meta) {
        console.log("PRISMA META:", err.response.data.prisma.meta);
      }
    } finally {
      setLoading(false);
    }
  };

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
          disabled={loading}
          className="w-full sm:w-auto rounded-xl px-5 bg-[#139BC3] text-white hover:bg-[#1088AA]"
        >
          <Save className="h-4 w-4 mr-2" />
          {editingId ? "Update" : "Save"}
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
            value={farmerName}
            onChange={(e) => setFarmerName(cleanName(e.target.value))}
            placeholder="Enter farmer name"
            inputMode="text"
          />
        </Field>

        <Field>
          <FieldLabel>Address</FieldLabel>
          <Textarea
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            placeholder="Enter full address"
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

        <Field>
          <FieldLabel>Local Transport Vehicle</FieldLabel>
          <Input
            value={localVehicle}
            onChange={(e) => setLocalVehicle(e.target.value.toUpperCase())}
            placeholder="Local vehicle number"
          />
        </Field>

        {/*  vehicle toggle */}
        <Field className="sm:col-span-2 md:col-span-1">
          <FieldLabel>Vehicle</FieldLabel>
          <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#139BC3]"
              checked={useVehicle}
              onChange={(e) => setUseVehicle(e.target.checked)}
            />
            Add Vehicle? (If checked: No 5% deduction)
          </label>
        </Field>

        <Field>
          <FieldLabel>Tray Weight *</FieldLabel>

          <Select
            value={String(trayWeight)}
            onValueChange={(v) => setTrayWeight(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Tray Weight" />
            </SelectTrigger>

            <SelectContent>
              {TRAY_WEIGHT_OPTIONS.map((weight) => (
                <SelectItem key={weight} value={String(weight)}>
                  {weight} Kgs
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/*  Vehicle fields only when checkbox checked */}
        {useVehicle && (
          <Field className="sm:col-span-2 md:col-span-1">
            <FieldLabel>Select Vehicle</FieldLabel>
            <Select
              value={vehicleId}
              onValueChange={(v) => {
                setVehicleId(v);
                if (v !== OTHER_VEHICLE_VALUE) setOtherVehicleNo("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>

              <SelectContent>
                {availableVehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vehicleNumber} – {v.assignedDriver?.name || "No Driver"}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER_VEHICLE_VALUE}>Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}

        {useVehicle && isOtherVehicle && (
          <Field>
            <FieldLabel>Other Vehicle Number *</FieldLabel>
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
                    {varieties.map((v) => (
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
                      {varieties.map((v) => (
                        <SelectItem key={v.code} value={v.code}>
                          {v.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

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
              <span className="text-slate-500">
                Net Weight {useVehicle ? "(No deduction)" : "(5% deduction)"}:
              </span>
              <span className="text-2xl font-bold">
                {netKgs}
                <span className="text-lg text-slate-500 ml-1">Kgs</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <FarmerLoadingList onEdit={handleEditLoading} />
    </Card>
  );
}
