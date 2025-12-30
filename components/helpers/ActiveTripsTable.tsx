"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
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

type ActiveTrip = {
  id: string;
  vehicleNumber: string;
  ownership: "OWN" | "RENT";
  assignedDriver?: { name: string } | null;

  farmerLoadings: any[];
  agentLoadings: any[];
  clientLoadings: any[];
};

/* ---------------- Helpers ---------------- */

function getActiveLoad(vehicle: ActiveTrip) {
  if (vehicle.farmerLoadings.length)
    return {
      type: "FORMER",
      billNo: vehicle.farmerLoadings[0].billNo,
    };

  if (vehicle.agentLoadings.length)
    return {
      type: "AGENT",
      billNo: vehicle.agentLoadings[0].billNo,
    };

  if (vehicle.clientLoadings.length)
    return {
      type: "CLIENT",
      billNo: vehicle.clientLoadings[0].billNo,
    };

  return null;
}

/* ---------------- Component ---------------- */

export function ActiveTripsTable() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["active-trips"],
    queryFn: async () => {
      const res = await axios.get("/api/vehicles");
      return res.data.data as ActiveTrip[];
    },
  });

  const vehicles = data ?? [];

  const markAvailable = useMutation({
    mutationFn: async (vehicleId: string) => {
      await axios.post("/api/vehicles/mark-available", { vehicleId });
    },
    onSuccess: () => {
      toast.success("Vehicle marked as AVAILABLE");
      qc.invalidateQueries({ queryKey: ["active-trips"] });
    },
    onError: () => {
      toast.error("Failed to mark vehicle as available");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        Loading active trips...
      </div>
    );
  }

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Active Trips</div>
          <div className="text-sm text-slate-500">
            Vehicles currently RUNNING
          </div>
        </div>

        <Badge className="bg-orange-50 text-orange-700 border border-orange-200">
          RUNNING: {vehicles.length}
        </Badge>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Load</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {vehicles.map((v) => {
              const load = getActiveLoad(v);

              return (
                <TableRow key={v.id}>
                  <TableCell className="font-semibold">
                    {v.vehicleNumber}
                  </TableCell>

                  <TableCell>{v.assignedDriver?.name || "—"}</TableCell>

                  <TableCell>{v.ownership}</TableCell>

                  <TableCell>
                    <div className="text-sm font-medium">
                      {load?.billNo || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {load?.type || "—"}
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
                      className="rounded-xl bg-[#139BC3] text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Available
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
