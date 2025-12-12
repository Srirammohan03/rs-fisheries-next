"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { AddDriverDialog } from "./AddDriverDialog";

export type RentVehicle = {
  id: string;
  vehicleNumber: string;
  rentalAgency: string;
  rentalRatePerDay: number;
  assignedDriver?: { name: string | null };
};

const columns: ColumnDef<RentVehicle>[] = [
  { accessorKey: "vehicleNumber", header: "Vehicle No" },
  { accessorKey: "rentalAgency", header: "Agency" },
  {
    accessorKey: "rentalRatePerDay",
    header: "Rate/Day",
    cell: ({ row }) => `₹${row.original.rentalRatePerDay}`,
  },
  {
    accessorKey: "assignedDriver",
    header: "Driver",
    cell: ({ row }) => row.original.assignedDriver?.name ?? "None",
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => <AddDriverDialog vehicleId={row.original.id} />,
  },
];

export function RentVehicleTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["rent-vehicles"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/vehicles/rent");
      return res.data;
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h2 className="text-xl font-semibold mb-3">Rent Vehicles</h2>
      <DataTable columns={columns} data={data ?? []} />
    </div>
  );
}
