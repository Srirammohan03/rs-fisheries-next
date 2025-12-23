// app/(dashboard)/loadings/components/ClientLoading.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

const TRAY_KG = 35;
const DEDUCTION_PERCENT = 5;
const OTHER_VEHICLE_VALUE = "__OTHER__";

type AvailableVariety = {
  code: string;
  name?: string;
  netKgs: number;
  netTrays: number;
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

const todayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function ClientLoadingForm() {
  const [village, setVillage] = useState("");
  const [date, setDate] = useState(""); // will default to today in useEffect
  const [vehicleId, setVehicleId] = useState("");
  const [otherVehicleNo, setOtherVehicleNo] = useState("");

  const [billNo, setBillNo] = useState("");
  const [clientName, setClientName] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);

  const isOtherVehicle = vehicleId === OTHER_VEHICLE_VALUE;

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

  // ✅ default today's date (editable)
  useEffect(() => {
    if (!date) setDate(todayYMD());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Available varieties (net stock)
  const { data: availableVarieties = [] } = useQuery<AvailableVariety[]>({
    queryKey: ["available-varieties"],
    queryFn: async () => {
      const res = await axios.get("/api/stocks/available-varieties");
      return res.data.data || [];
    },
  });

  // Vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ["assigned-vehicles"],
    queryFn: async () => {
      const res = await axios.get("/api/vehicles/assign-driver");
      return res.data.data;
    },
  });

  // Bill No
  const { data: billData, refetch: refetchBillNo } = useQuery({
    queryKey: ["client-bill-no"],
    queryFn: async () => {
      const res = await fetch("/api/client-loading/next-bill-no");
      const data = await res.json();
      return data.billNo;
    },
  });

  useMemo(() => {
    if (billData) setBillNo(billData);
  }, [billData]);

  const netByCode = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of availableVarieties) m[v.code] = Number(v.netKgs || 0);
    return m;
  }, [availableVarieties]);

  const getVarietyName = (code: string) =>
    availableVarieties.find((v) => v.code === code)?.name || "";

  // ✅ FIXED total calc (your old updateRow had old-row bug)
  const updateRow = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, [field]: value };

        const noTrays = Number(next.noTrays) || 0;
        const loose = Number(next.loose) || 0;

        const trayKgs = noTrays * TRAY_KG;
        const totalKgs = trayKgs + loose;

        return { ...next, trayKgs, totalKgs };
      })
    );
  };

  const remainingKgsForRow = (code: string, rowId: string) => {
    const net = netByCode[code] || 0;
    const usedOtherRows = items
      .filter((r) => r.id !== rowId && r.varietyCode === code)
      .reduce((s, r) => s + (Number(r.totalKgs) || 0), 0);

    return Math.max(0, net - usedOtherRows);
  };

  const clampRow = (rowId: string, nextTrays: number, nextLoose: number) => {
    const row = items.find((r) => r.id === rowId);
    if (!row?.varietyCode) return { trays: nextTrays, loose: nextLoose };

    const maxKgs = remainingKgsForRow(row.varietyCode, rowId);
    const want = nextTrays * TRAY_KG + nextLoose;

    if (want <= maxKgs) return { trays: nextTrays, loose: nextLoose };

    const maxTrays = Math.floor(maxKgs / TRAY_KG);
    const trays = Math.min(nextTrays, maxTrays);

    const left = maxKgs - trays * TRAY_KG;
    const loose = Math.min(nextLoose, Math.max(0, left));

    toast.error(`Stock exceeded. Max allowed: ${maxKgs} Kgs`);
    return { trays, loose };
  };

  // ✅ Grand total with 5% deduction
  useMemo(() => {
    const total = items.reduce((a, b) => a + (Number(b.totalKgs) || 0), 0);
    const after = total * (1 - DEDUCTION_PERCENT / 100);
    setGrandTotal(Number(after.toFixed(2)));
  }, [items]);

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

  const resetForm = () => {
    setClientName("");
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

    setGrandTotal(0);
    refetchBillNo();
  };

  const handleSave = async () => {
    if (!billNo) return toast.error("Bill number missing");
    if (!clientName.trim()) return toast.error("Enter Client Name");
    if (!date.trim()) return toast.error("Select Date");

    if (!vehicleId.trim()) return toast.error("Select Vehicle");
    if (isOtherVehicle && !otherVehicleNo.trim())
      return toast.error("Enter Vehicle Number");

    const firstCode = items[0].varietyCode;
    if (!firstCode) return toast.error("Select at least one variety");

    try {
      await axios.post("/api/client-loading", {
        billNo,
        clientName,
        village,
        date,

        // ✅ Either connect by id OR store typed vehicle number
        vehicleId: isOtherVehicle ? null : vehicleId,
        vehicleNo: isOtherVehicle ? otherVehicleNo.trim() : null,

        fishCode: firstCode,
        items: items.map((r) => ({
          varietyCode: r.varietyCode,
          noTrays: r.noTrays,
          loose: r.loose,
        })),
      });

      toast.success("Client loading saved!");
      resetForm();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Failed to save Client loading";
      toast.error(msg);
    }
  };

  return (
    <Card className="p-4 sm:p-6 rounded-2xl space-y-6 border border-[#139BC3]/15 bg-white shadow-[0_18px_45px_-30px_rgba(19,155,195,0.35)]">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Client Loading
          </h2>
          <p className="text-sm text-slate-500">
            Add client details and loading items
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

      <CardContent className="space-y-6 pt-0 sm:pt-6">
        {/* INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field>
            <FieldLabel>Client Bill No</FieldLabel>
            <Input
              readOnly
              value={billNo}
              className="bg-slate-50 font-semibold border-slate-200"
            />
          </Field>

          <Field>
            <FieldLabel>Client Name</FieldLabel>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
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
                if (v !== OTHER_VEHICLE_VALUE) setOtherVehicleNo("");
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
                <SelectItem value={OTHER_VEHICLE_VALUE}>Other</SelectItem>
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

        {/* ✅ MOBILE CARDS */}
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
                    onValueChange={(code) => {
                      updateRow(row.id, "varietyCode", code);
                      updateRow(row.id, "name", getVarietyName(code));
                      updateRow(row.id, "noTrays", 0);
                      updateRow(row.id, "loose", 0);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVarieties.map((v) => (
                        <SelectItem key={v.code} value={v.code}>
                          {v.code} ({v.netTrays} trays)
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
                      className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      value={row.noTrays}
                      min={0}
                      disabled={!row.varietyCode}
                      onChange={(e) => {
                        const next = Math.max(0, Number(e.target.value) || 0);
                        const clamped = clampRow(row.id, next, row.loose);
                        updateRow(row.id, "noTrays", clamped.trays);
                        updateRow(row.id, "loose", clamped.loose);
                      }}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      Loose
                    </div>
                    <Input
                      type="number"
                      className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      value={row.loose}
                      min={0}
                      disabled={!row.varietyCode}
                      onChange={(e) => {
                        const next = Math.max(0, Number(e.target.value) || 0);
                        const clamped = clampRow(row.id, row.noTrays, next);
                        updateRow(row.id, "noTrays", clamped.trays);
                        updateRow(row.id, "loose", clamped.loose);
                      }}
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

        {/* ✅ DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#139BC3]/15">
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
                      onValueChange={(code) => {
                        updateRow(row.id, "varietyCode", code);
                        updateRow(row.id, "name", getVarietyName(code));
                        updateRow(row.id, "noTrays", 0);
                        updateRow(row.id, "loose", 0);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVarieties.map((v) => (
                          <SelectItem key={v.code} value={v.code}>
                            {v.code} ({v.netTrays} trays)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="px-3 py-3 text-slate-700">{row.name}</td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      value={row.noTrays}
                      min={0}
                      disabled={!row.varietyCode}
                      onChange={(e) => {
                        const next = Math.max(0, Number(e.target.value) || 0);
                        const clamped = clampRow(row.id, next, row.loose);
                        updateRow(row.id, "noTrays", clamped.trays);
                        updateRow(row.id, "loose", clamped.loose);
                      }}
                    />
                  </td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      value={row.loose}
                      min={0}
                      disabled={!row.varietyCode}
                      onChange={(e) => {
                        const next = Math.max(0, Number(e.target.value) || 0);
                        const clamped = clampRow(row.id, row.noTrays, next);
                        updateRow(row.id, "noTrays", clamped.trays);
                        updateRow(row.id, "loose", clamped.loose);
                      }}
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
                      <Trash2 className="h-4 h-4 text-red-500" />
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

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="hidden md:block" />
          <div className="text-left sm:text-right">
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
