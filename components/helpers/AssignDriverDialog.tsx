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
import axios, { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AssignDriverDialog({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const queryClient = useQueryClient();
  const {
    data: drivers,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["available-drivers"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/driver/available");
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["available-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["own-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["rent-vehicles"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicle"] });
      toast.success(data.message ?? "Driver assigned successfully");
      setOpen(false);
    },
    onError: (err) => {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data.message ?? "Failed to assign driver");
      } else {
        toast.error(err.message ?? "Failed to assign driver");
      }
    },
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
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : drivers?.length ? (
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
          disabled={!selected || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending && (
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
          )}
          Assign
        </Button>
      </DialogContent>
    </Dialog>
  );
}
