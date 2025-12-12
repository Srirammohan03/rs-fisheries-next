"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { AddDriverDialog } from "./AddDriverDialog";
import { DataTable } from "../ui/data-table";

export type OwnVehicle = {
  id: string;
  vehicleNumber: string;
  manufacturer: string | null;
  fuelType: string;
  capacityInTons: string | null;
  assignedDriver?: { name: string | null };
};

const columns: ColumnDef<OwnVehicle>[] = [
  {
    accessorKey: "vehicleNumber",
    header: "Vehicle No",
  },
  {
    accessorKey: "manufacturer",
    header: "Manufacturer",
    cell: ({ row }) => row.original.manufacturer || "-",
  },
  {
    accessorKey: "fuelType",
    header: "Fuel",
  },
  {
    accessorKey: "capacityInTons",
    header: "Capacity",
    cell: ({ row }) => row.original.capacityInTons || "-",
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

export function OwnVehicleTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["own-vehicles"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/vehicles/own");
      return res.data;
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h2 className="text-xl font-semibold mb-3">Own Vehicles</h2>
      <DataTable columns={columns} data={data ?? []} />
    </div>
  );
}
