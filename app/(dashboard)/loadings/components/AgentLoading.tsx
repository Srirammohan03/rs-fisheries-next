"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { fi } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";

const TRAY_WEIGHT = 35;
const DEDUCTION_PERCENT = 5;

const todayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ✅ Text rules
const AGENT_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/; // letters + space + . ' -
const VILLAGE_REGEX = /^[A-Za-z][A-Za-z ]*$/; // letters + space

const cleanAgentName = (v: string) =>
  v
    .replace(/[^A-Za-z .'-]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();

const cleanVillage = (v: string) => v.trimStart();

const safeNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
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
  const queryClient = useQueryClient();

  const [billNo, setBillNo] = useState("");
  const [agentName, setAgentName] = useState("");
  const [village, setVillage] = useState("");
  const [date, setDate] = useState(todayYMD());
  const [vehicleId, setVehicleId] = useState("");
  const [otherVehicleNo, setOtherVehicleNo] = useState("");
  const [loading, setLoading] = useState(false);

  const isOtherVehicle = vehicleId === "__OTHER__";

  // ✅ hide used vehicles without reload
  const [usedVehicleIds, setUsedVehicleIds] = useState<Set<string>>(
    () => new Set()
  );

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
      return res.data.data || [];
    },
  });

  const getVarietyName = (code: string) =>
    varieties.find((v: any) => v.code === code)?.name || "";

  const {
    data: billData,
    isLoading: billLoading,
    isError: billError,
    refetch: refetchBillNo,
  } = useQuery({
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

  useEffect(() => {
    if (billError) toast.error("Failed to load bill number");
  }, [billError]);

  // ✅ Vehicles filtered (hide used instantly; keep selected visible)
  const availableVehicles = useMemo(() => {
    return (vehicles ?? []).filter((v: any) => {
      if (!v?.id) return false;
      if (v.id === vehicleId) return true;
      return !usedVehicleIds.has(v.id);
    });
  }, [vehicles, usedVehicleIds, vehicleId]);

  // ✅ safer row update (no negatives, stable totals)
  const updateRow = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        if (field === "varietyCode") {
          const code = String(value ?? "");
          return {
            ...row,
            varietyCode: code,
            name: getVarietyName(code),
            // reset quantities when variety changes (optional but cleaner)
            noTrays: row.noTrays,
            loose: row.loose,
            trayKgs: safeNum(row.noTrays) * TRAY_WEIGHT,
            totalKgs: safeNum(row.noTrays) * TRAY_WEIGHT + safeNum(row.loose),
          };
        }

        if (field === "name") {
          return { ...row, name: String(value ?? "") };
        }

        if (field === "noTrays" || field === "loose") {
          const n = Math.max(0, safeNum(value)); // ✅ clamp no negative
          const next = { ...row, [field]: n } as ItemRow;
          const trayKgs = safeNum(next.noTrays) * TRAY_WEIGHT;
          const totalKgs = trayKgs + safeNum(next.loose);
          return { ...next, trayKgs, totalKgs };
        }

        return { ...row, [field]: value } as ItemRow;
      })
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
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.id !== id)
    );
  };

  const totalKgs = useMemo(
    () => items.reduce((sum, r) => sum + safeNum(r.totalKgs), 0),
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

  const grandTotal = useMemo(() => {
    const after = totalKgs * (1 - DEDUCTION_PERCENT / 100);
    return Math.round(after);
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
    queryClient.invalidateQueries({ queryKey: ["agent-bill-no"] });
  };

  // ✅ VALIDATION
  const validateForm = () => {
    if (billLoading || billError || !billNo) {
      toast.error("Bill number not available");
      return false;
    }

    const name = agentName.trim();
    if (!name) return toast.error("Enter Agent Name"), false;
    if (!AGENT_NAME_REGEX.test(name))
      return (
        toast.error("Agent Name should contain only letters and spaces"), false
      );

    // const vil = village.trim();
    // if (vil && !VILLAGE_REGEX.test(vil))
    //   return (
    //     toast.error("Village should contain only letters and spaces"), false
    //   );

    if (!date.trim()) return toast.error("Select Date"), false;

    // if (!vehicleId.trim()) return toast.error("Select Vehicle"), false;
    // if (isOtherVehicle && !otherVehicleNo.trim())
    //   return toast.error("Enter Vehicle Number"), false;

    // active rows = any qty
    const activeRows = items.filter(
      (r) => safeNum(r.noTrays) > 0 || safeNum(r.loose) > 0
    );

    if (activeRows.length === 0) {
      toast.error("Enter at least one item");
      return false;
    }

    // validate each active row
    for (let i = 0; i < activeRows.length; i++) {
      const r = activeRows[i];
      if (!r.varietyCode?.trim()) {
        toast.error(`Select variety for row #${i + 1}`);
        return false;
      }
      if (safeNum(r.noTrays) < 0 || safeNum(r.loose) < 0) {
        toast.error(`Negative values not allowed (row #${i + 1})`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setLoading(true);

    const activeRows = items.filter(
      (r) => safeNum(r.noTrays) > 0 || safeNum(r.loose) > 0
    );

    const fishCodeValue = activeRows[0].varietyCode.toUpperCase();

    const totals = {
      totalTrays: items.reduce((a, b) => a + safeNum(b.noTrays), 0),
      totalLooseKgs: items.reduce((a, b) => a + safeNum(b.loose), 0),
      totalTrayKgs: items.reduce(
        (a, b) => a + safeNum(b.noTrays) * TRAY_WEIGHT,
        0
      ),
      totalKgs,
    };

    try {
      await axios.post("/api/agent-loading", {
        agentName: agentName.trim(),
        fishCode: fishCodeValue,
        billNo,
        village: village.trim(),
        date,

        vehicleId: isOtherVehicle ? null : vehicleId,
        vehicleNo: isOtherVehicle ? otherVehicleNo.trim() : null,

        ...totals,
        grandTotal,

        items: activeRows.map((r) => ({
          varietyCode: r.varietyCode,
          noTrays: safeNum(r.noTrays),
          trayKgs: safeNum(r.noTrays) * TRAY_WEIGHT,
          loose: safeNum(r.loose),
          totalKgs: safeNum(r.totalKgs),
        })),
      });

      toast.success("Agent loading saved!");

      queryClient.invalidateQueries({ queryKey: ["assigned-vehicles"] });

      // ✅ hide vehicle instantly without refresh
      if (!isOtherVehicle && vehicleId) {
        setUsedVehicleIds((prev) => {
          const next = new Set(prev);
          next.add(vehicleId);
          return next;
        });
      }

      resetForm();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to save agent loading"
      );
    } finally {
      setLoading(false);
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
          disabled={loading}
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
            <FieldLabel>Agent Name *</FieldLabel>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(cleanAgentName(e.target.value))}
              placeholder="Enter agent name"
              className="border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>

          <Field>
            <FieldLabel>Address</FieldLabel>
            <Textarea
              value={village}
              onChange={(e) => setVillage(cleanVillage(e.target.value))}
              placeholder="Enter full address"
              className="border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>

          <Field>
            <FieldLabel>Date *</FieldLabel>
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
            <Field className="sm:col-span-2 md:col-span-1">
              <FieldLabel>Other Vehicle Number *</FieldLabel>
              <Input
                value={otherVehicleNo}
                onChange={(e) =>
                  setOtherVehicleNo(e.target.value.toUpperCase())
                }
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
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Variety *
                  </div>

                  <Select
                    value={row.varietyCode}
                    onValueChange={(val) =>
                      updateRow(row.id, "varietyCode", val)
                    }
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      Trays
                    </div>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={row.noTrays}
                      className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      onChange={(e) =>
                        updateRow(row.id, "noTrays", e.target.value)
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
                      inputMode="decimal"
                      min={0}
                      value={row.loose}
                      className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      onChange={(e) =>
                        updateRow(row.id, "loose", e.target.value)
                      }
                      disabled={!row.varietyCode}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                  <div className="text-sm text-slate-600">Total</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {safeNum(row.totalKgs).toFixed(2)}
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
        <div className="hidden md:block mt-2 overflow-x-auto rounded-2xl border border-[#139BC3]/15">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-[#139BC3]/10">
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  S.No
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Variety *
                </th>
                {/* <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Name
                </th> */}
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
                      onValueChange={(val) =>
                        updateRow(row.id, "varietyCode", val)
                      }
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

                  {/* <td className="px-3 py-3 text-slate-700">
                    {row.name || "—"}
                  </td> */}

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={row.noTrays}
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      onChange={(e) =>
                        updateRow(row.id, "noTrays", e.target.value)
                      }
                      disabled={!row.varietyCode}
                    />
                  </td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={row.loose}
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      onChange={(e) =>
                        updateRow(row.id, "loose", e.target.value)
                      }
                      disabled={!row.varietyCode}
                    />
                  </td>

                  <td className="px-3 py-3 font-semibold text-slate-900">
                    {safeNum(row.totalKgs).toFixed(2)}
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
        <div className="text-right">
          <div className="space-y-1">
            <div className="flex justify-end items-center gap-4">
              <span className="text-slate-500">Total Trays:</span>
              <span className="text-2xl font-bold">
                {totalTrays.toFixed(1)}
                <span className="text-lg text-slate-500 ml-1">Trays</span>
              </span>
            </div>

            <div className="flex justify-end items-center gap-4">
              <span className="text-slate-500">
                Grand Total (after 5% deduction):
              </span>
              <span className="text-2xl font-bold">
                {grandTotal}
                <span className="text-lg text-slate-500 ml-1">Kgs</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
