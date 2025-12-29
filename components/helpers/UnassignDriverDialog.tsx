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
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function UnassignDriverDialog({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        "/api/vehicles/unassign-driver",
        { vehicleId },
        { withCredentials: true }
      );
      return data;
    },
    onSuccess: async (data) => {
      toast.success(data.message ?? "Driver unassigned");
      queryClient.invalidateQueries({ queryKey: ["available-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["own-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["rent-vehicles"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicle"] });
      setOpen(false);
    },
    onError: (err: any) => {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data.message ?? "Failed to unassign driver");
      } else {
        toast.error(err.message ?? "Failed to unassign driver");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Unassign</Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Unassign Driver</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to unassign the driver from this vehicle?
        </p>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            )}
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
