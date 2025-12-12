"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function AssignDriverDialog({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  const { data: drivers } = useQuery({
    queryKey: ["available-drivers"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/drivers/available");
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/vehicles/assign-driver", {
        vehicleId,
        driverId: selected,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Driver assigned successfully");
      setOpen(false);
    },
    onError: () => toast.error("Failed to assign driver"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Assign Driver
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium">Select Driver</label>

          <Select onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choose driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers?.length ? (
                drivers.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">
                  No available drivers
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          disabled={!selected}
          onClick={() => mutation.mutate()}
        >
          Assign
        </Button>
      </DialogContent>
    </Dialog>
  );
}
