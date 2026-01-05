"use client";

import { useEffect, useMemo, useState } from "react";
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

const TRAY_KG = 35;
const DEDUCTION_PERCENT = 5;

const OTHER_VEHICLE_VALUE = "__OTHER__";
const OTHER_CLIENT_VALUE = "__CLIENT_OTHER__";

// ✅ Text validation + sanitization
const CLIENT_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;
// address allows numbers, commas, slash, hyphen etc.
const ADDRESS_REGEX = /^[A-Za-z0-9][A-Za-z0-9 ,./#()-]*$/;

const cleanClientName = (v: string) =>
  v
    .replace(/[^A-Za-z .'-]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();

const cleanAddress = (v: string) =>
  v
    .replace(/[^A-Za-z0-9 ,./#()-]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();

const safeNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
};

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

type VehicleRow = {
  id: string;
  vehicleNumber: string;
  assignedDriver?: { name?: string | null } | null;
};

type ClientRow = {
  id: string;
  partyName: string;
  phone: string;
  billingAddress: string;

  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;

  isActive?: boolean;
};

const todayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function ClientLoadingForm() {
  const queryClient = useQueryClient();

  // NOTE: you currently store address in `village` field in API/model.
  // Keeping same name for compatibility.
  const [village, setVillage] = useState(""); // used as Address
  const [date, setDate] = useState("");
  const [billNo, setBillNo] = useState("");

  // client selection
  const [clientSelectId, setClientSelectId] = useState<string>("");
  const isOtherClient = clientSelectId === OTHER_CLIENT_VALUE;

  // manual entry (only when "Other")
  const [clientName, setClientName] = useState("");

  // ✅ NEW: vehicle toggle checkbox
  const [useVehicle, setUseVehicle] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [otherVehicleNo, setOtherVehicleNo] = useState("");
  const isOtherVehicle = vehicleId === OTHER_VEHICLE_VALUE;

  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!date) setDate(todayYMD());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Clients list
  const {
    data: clients = [],
    isLoading: clientsLoading,
    isError: clientsError,
    refetch: refetchClients,
  } = useQuery<ClientRow[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await axios.get("/api/client");
      return res.data?.data || [];
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const activeClients = useMemo(() => {
    return (clients || []).filter((c) => c?.isActive !== false);
  }, [clients]);

  const selectedClient = useMemo(() => {
    if (!clientSelectId || clientSelectId === OTHER_CLIENT_VALUE) return null;
    return activeClients.find((c) => c.id === clientSelectId) ?? null;
  }, [activeClients, clientSelectId]);

  // Auto-fill when client selected
  useEffect(() => {
    if (selectedClient) {
      setClientName(selectedClient.partyName || "");
      // Auto-fill address into "village"
      setVillage(selectedClient.billingAddress || "");
    }
  }, [selectedClient]);

  // If other selected, clear name/address for manual entry
  useEffect(() => {
    if (isOtherClient) {
      setClientName("");
      setVillage("");
    }
  }, [isOtherClient]);

  useEffect(() => {
    if (clientsError) toast.error("Failed to load clients");
  }, [clientsError]);

  // ✅ Available varieties (make it robust)
  const {
    data: availableVarieties = [],
    isError: varietiesError,
    refetch: refetchVarieties,
    isFetching: varietiesFetching,
  } = useQuery<AvailableVariety[]>({
    queryKey: ["available-varieties"],
    queryFn: async () => {
      const res = await axios.get("/api/stocks/available-varieties");
      return res.data?.data || [];
    },
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  useEffect(() => {
    if (varietiesError) toast.error("Failed to load varieties");
  }, [varietiesError]);

  // ✅ Vehicles
  const { data: vehicles = [] } = useQuery<VehicleRow[]>({
    queryKey: ["assigned-vehicles"],
    queryFn: async () => {
      const res = await axios.get("/api/vehicles/assign-driver");
      return res.data?.data || [];
    },
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const availableVehicles = useMemo(() => {
    return (vehicles ?? []).filter((v) => {
      if (!v?.id) return false;
      if (v.id === vehicleId) return true;
      return !usedVehicleIds.has(v.id);
    });
  }, [vehicles, usedVehicleIds, vehicleId]);

  // ✅ Bill No
  const {
    data: billData,
    isLoading: billLoading,
    isError: billError,
    refetch: refetchBillNo,
  } = useQuery({
    queryKey: ["client-bill-no"],
    queryFn: async () => {
      const res = await fetch("/api/client-loading/next-bill-no", {
        cache: "no-store",
      });
      const data = await res.json();
      return data.billNo as string;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  useEffect(() => {
    if (billData) setBillNo(billData);
  }, [billData]);

  useEffect(() => {
    if (billError) toast.error("Failed to load bill number");
  }, [billError]);

  const netByCode = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of availableVarieties) m[v.code] = Number(v.netKgs || 0);
    return m;
  }, [availableVarieties]);

  const totalTrays = useMemo(
    () =>
      items.reduce((sum, item) => {
        sum = sum + safeNum(item.noTrays);
        return sum;
      }, 0),
    [items]
  );

  const getVarietyName = (code: string) =>
    availableVarieties.find((v) => v.code === code)?.name || "";

  const updateRow = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        if (field === "varietyCode") {
          const code = String(value ?? "");
          const nextNoTrays = safeNum(row.noTrays);
          const nextLoose = safeNum(row.loose);
          const trayKgs = nextNoTrays * TRAY_KG;
          const totalKgs = trayKgs + nextLoose;

          return {
            ...row,
            varietyCode: code,
            name: getVarietyName(code),
            trayKgs,
            totalKgs,
          };
        }

        if (field === "name") return { ...row, name: String(value ?? "") };

        if (field === "noTrays" || field === "loose") {
          const n = Math.max(0, safeNum(value));
          const next = { ...row, [field]: n } as ItemRow;
          const trayKgs = safeNum(next.noTrays) * TRAY_KG;
          const totalKgs = trayKgs + safeNum(next.loose);
          return { ...next, trayKgs, totalKgs };
        }

        return { ...row, [field]: value } as ItemRow;
      })
    );
  };

  const remainingKgsForRow = (code: string, rowId: string) => {
    const net = netByCode[code] || 0;
    const usedOtherRows = items
      .filter((r) => r.id !== rowId && r.varietyCode === code)
      .reduce((s, r) => s + safeNum(r.totalKgs), 0);

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

  // ✅ Grand total:
  useEffect(() => {
    const total = items.reduce((a, b) => a + safeNum(b.totalKgs), 0);
    if (useVehicle) {
      setGrandTotal(Math.round(total));
    } else {
      const after = total * (1 - DEDUCTION_PERCENT / 100);
      setGrandTotal(Math.round(after));
    }
  }, [items, useVehicle]);

  // ✅ if user unticks checkbox, clear vehicle fields immediately
  useEffect(() => {
    if (!useVehicle) {
      setVehicleId("");
      setOtherVehicleNo("");
    }
  }, [useVehicle]);

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

  const resetForm = () => {
    setClientSelectId("");
    setClientName("");
    setVillage("");
    setDate(todayYMD());

    setUseVehicle(false);
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
    refetchVarieties();
    refetchClients();
  };

  const validateForm = () => {
    if (billLoading || billError || !billNo) {
      toast.error("Bill number not available");
      return false;
    }

    // client validation
    if (!clientSelectId) {
      toast.error("Select Client");
      return false;
    }

    const name = clientName.trim();
    if (!name) {
      toast.error("Enter Client Name");
      return false;
    }
    if (!CLIENT_NAME_REGEX.test(name)) {
      toast.error("Client Name should contain only letters and spaces");
      return false;
    }

    const addr = village.trim();
    if (!addr) {
      toast.error("Address is required");
      return false;
    }
    if (!ADDRESS_REGEX.test(addr)) {
      toast.error("Address contains invalid characters");
      return false;
    }

    if (!date.trim()) {
      toast.error("Select Date");
      return false;
    }

    // vehicle validation
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
      (r) => safeNum(r.noTrays) > 0 || safeNum(r.loose) > 0
    );
    if (activeRows.length === 0) {
      toast.error("Enter at least one item");
      return false;
    }

    for (let i = 0; i < activeRows.length; i++) {
      if (!activeRows[i].varietyCode?.trim()) {
        toast.error(`Select variety for row #${i + 1}`);
        return false;
      }
      if (
        safeNum(activeRows[i].noTrays) < 0 ||
        safeNum(activeRows[i].loose) < 0
      ) {
        toast.error(`Negative values not allowed (row #${i + 1})`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setLoading(true);

    const firstCode = items.find((r) => r.varietyCode)?.varietyCode;
    if (!firstCode) {
      toast.error("Select at least one variety");
      setLoading(false);
      return;
    }

    const activeRows = items.filter(
      (r) => safeNum(r.noTrays) > 0 || safeNum(r.loose) > 0
    );

    const payload = {
      billNo,
      // If selected existing client -> send clientId, else null
      clientId: !isOtherClient && clientSelectId ? clientSelectId : null,

      clientName: clientName.trim(),
      village: village.trim(), // address in your schema
      date,

      useVehicle,
      vehicleId: useVehicle && !isOtherVehicle ? vehicleId : null,
      vehicleNo: useVehicle && isOtherVehicle ? otherVehicleNo.trim() : null,

      fishCode: firstCode,

      items: activeRows.map((r) => ({
        varietyCode: r.varietyCode,
        noTrays: safeNum(r.noTrays),
        loose: safeNum(r.loose),
      })),
    };

    try {
      await axios.post("/api/client-loading", payload);

      toast.success("Client loading saved!");

      queryClient.invalidateQueries({ queryKey: ["assigned-vehicles"] });

      // hide vehicle instantly without reload
      if (useVehicle && !isOtherVehicle && vehicleId) {
        setUsedVehicleIds((prev) => {
          const next = new Set(prev);
          next.add(vehicleId);
          return next;
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["available-varieties"] }),
        queryClient.invalidateQueries({ queryKey: ["client-bill-no"] }),
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
      ]);

      resetForm();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Failed to save Client loading";
      toast.error(msg);
    } finally {
      setLoading(false);
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
          disabled={loading}
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

          {/* ✅ CLIENT DROPDOWN */}
          <Field>
            <FieldLabel>Client *</FieldLabel>
            <Select
              value={clientSelectId}
              onValueChange={(v) => setClientSelectId(v)}
            >
              <SelectTrigger className="border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                <SelectValue
                  placeholder={
                    clientsLoading ? "Loading clients..." : "Select client"
                  }
                />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {activeClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.partyName} — {c.phone}
                  </SelectItem>
                ))}

                <SelectItem value={OTHER_CLIENT_VALUE}>
                  Other / New Client
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* If Other -> manual name */}
          {isOtherClient ? (
            <Field>
              <FieldLabel>Client Name *</FieldLabel>
              <Input
                value={clientName}
                onChange={(e) => setClientName(cleanClientName(e.target.value))}
                placeholder="Enter client name"
                className="border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel>Client Name</FieldLabel>
              <Input
                value={clientName}
                readOnly
                className="bg-slate-50 border-slate-200"
              />
            </Field>
          )}

          {/* Address / Village field */}
          <Field>
            <FieldLabel>{isOtherClient ? "Address *" : "Address"}</FieldLabel>
            <Input
              value={village}
              onChange={(e) => setVillage(cleanAddress(e.target.value))}
              placeholder="Auto filled address (editable)"
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

          {/* ✅ Vehicle checkbox */}
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
                <SelectTrigger className="border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                  <SelectValue placeholder="Select Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vehicleNumber} –{" "}
                      {v.assignedDriver?.name || "No Driver"}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_VEHICLE_VALUE}>Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          {useVehicle && isOtherVehicle && (
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
                    Variety * {varietiesFetching ? "(refreshing...)" : ""}
                  </div>

                  <Select
                    value={row.varietyCode}
                    onValueChange={(code) => {
                      updateRow(row.id, "varietyCode", code);
                      updateRow(row.id, "noTrays", 0);
                      updateRow(row.id, "loose", 0);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      Trays
                    </div>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      value={row.noTrays}
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
                      inputMode="decimal"
                      min={0}
                      className="h-11 w-full rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      value={row.loose}
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
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#139BC3]/15">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-[#139BC3]/10">
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  S.No
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">
                  Variety *
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
                        updateRow(row.id, "noTrays", 0);
                        updateRow(row.id, "loose", 0);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#139BC3]/30">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        {availableVarieties.map((v) => (
                          <SelectItem key={v.code} value={v.code}>
                            {v.code} ({v.netTrays} trays)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      value={row.noTrays}
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
                      inputMode="decimal"
                      min={0}
                      className="h-10 w-24 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
                      value={row.loose}
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

          <div className="p-4 flex items-center gap-2">
            <Button
              onClick={addRow}
              variant="outline"
              className="rounded-xl border-[#139BC3]/30 text-[#139BC3] hover:text-[#1088AA] hover:bg-[#139BC3]/10 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Row
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                refetchVarieties();
                toast.success("Varieties refreshed");
              }}
              className="rounded-xl border-slate-200"
            >
              Refresh Varieties
            </Button>
          </div>
        </div>

        {/* FOOTER */}
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
                Grand Total {useVehicle ? "(No deduction)" : "(5% deduction)"}:
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
