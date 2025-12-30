"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ---------------- Types ---------------- */
type RunningVehicle = {
  id: string;
  vehicleNumber: string;
  ownership: "OWN" | "RENT";
  assignedDriver?: { name: string } | null;
  status: "AVAILABLE" | "RUNNING" | "MAINTENANCE" | "INACTIVE";
  currentLoadType?: "FORMER" | "AGENT" | "CLIENT" | null;
  currentBillNo?: string | null;
  lastAssignedAt?: string | null;
};

/* ---------------- Dummy JSON Data ---------------- */
const DUMMY_RUNNING_VEHICLES: RunningVehicle[] = [
  {
    id: "1",
    vehicleNumber: "AP09 AB 1234",
    ownership: "OWN",
    assignedDriver: { name: "Ramesh" },
    status: "RUNNING",
    currentLoadType: "FORMER",
    currentBillNo: "RS-F-0012",
    lastAssignedAt: "2025-01-10T08:30:00Z",
  },
  {
    id: "2",
    vehicleNumber: "TS08 XY 7788",
    ownership: "RENT",
    assignedDriver: { name: "Suresh" },
    status: "RUNNING",
    currentLoadType: "AGENT",
    currentBillNo: "RS-A-0045",
    lastAssignedAt: "2025-01-10T10:15:00Z",
  },
  {
    id: "3",
    vehicleNumber: "AP31 MN 4455",
    ownership: "OWN",
    assignedDriver: null,
    status: "RUNNING",
    currentLoadType: "CLIENT",
    currentBillNo: "RS-C-0098",
    lastAssignedAt: "2025-01-10T12:45:00Z",
  },
];

/* ---------------- Component ---------------- */
export function ActiveTripsTable() {
  const qc = useQueryClient();

  /* -------- Fetch (Dummy) -------- */
  const { data, isLoading } = useQuery({
    queryKey: ["vehicles-running"],
    queryFn: async () => {
      // simulate API delay
      await new Promise((r) => setTimeout(r, 500));
      return DUMMY_RUNNING_VEHICLES;
    },
  });

  const vehicles = useMemo(() => data ?? [], [data]);

  /* -------- Mutation (Local Update) -------- */
  const markAvailable = useMutation({
    mutationFn: async (id: string) => {
      // simulate API delay
      await new Promise((r) => setTimeout(r, 300));
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<RunningVehicle[]>(["vehicles-running"], (old = []) =>
        old.filter((v) => v.id !== id)
      );
      toast.success("Vehicle marked as AVAILABLE");
    },
    onError: () => toast.error("Failed to update status"),
  });

  /* -------- Loading -------- */
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        Loading active trips...
      </div>
    );
  }

  /* -------- Empty -------- */
  if (!vehicles.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center">
          <Truck className="h-6 w-6 text-slate-500" />
        </div>
        <div className="mt-3 text-base font-semibold text-slate-900">
          No running vehicles
        </div>
        <div className="mt-1 text-sm text-slate-500">
          All vehicles are available right now.
        </div>
      </div>
    );
  }

  /* -------- Table -------- */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">
            Active Trips
          </div>
          <div className="text-sm text-slate-500">
            Vehicles currently marked as{" "}
            <span className="font-semibold">RUNNING</span>
          </div>
        </div>

        <Badge className="bg-orange-50 text-orange-700 border border-orange-200">
          RUNNING: {vehicles.length}
        </Badge>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bill / Load</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {vehicles.map((v) => (
              <TableRow key={v.id} className="hover:bg-slate-50/60">
                <TableCell className="font-semibold text-slate-900">
                  {v.vehicleNumber}
                </TableCell>

                <TableCell className="text-slate-700">
                  {v.assignedDriver?.name || "—"}
                </TableCell>

                <TableCell className="text-slate-700">{v.ownership}</TableCell>

                <TableCell className="text-slate-700">
                  <div className="text-sm font-medium">
                    {v.currentBillNo || "—"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {v.currentLoadType || "—"}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge className="bg-orange-50 text-orange-700 border border-orange-200">
                    RUNNING
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    onClick={() => markAvailable.mutate(v.id)}
                    disabled={markAvailable.isPending}
                    className="rounded-xl bg-[#139BC3] text-white hover:bg-[#1088AA]"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Available
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
