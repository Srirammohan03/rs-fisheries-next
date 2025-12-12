"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { Badge } from "@/components/ui/badge";

export type DriverRow = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  address: string;
  age: number;
  aadharNumber: string;
  assignedVehicle?: {
    vehicleNumber: string | null;
  } | null;
};

const columns: ColumnDef<DriverRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "licenseNumber",
    header: "License No",
  },
  {
    accessorKey: "aadharNumber",
    header: "Aadhar No",
  },
  {
    accessorKey: "age",
    header: "Age",
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "assignedVehicle",
    header: "Assigned Vehicle",
    cell: ({ row }) =>
      row.original.assignedVehicle?.vehicleNumber ? (
        <Badge variant="outline" className="text-green-700 border-green-600">
          {row.original.assignedVehicle.vehicleNumber}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-red-700 border-red-600">
          None
        </Badge>
      ),
  },
];

export function DriverTable() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/driver");
      return res.data;
    },
  });

  if (isLoading) return <p>Loading...</p>;

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <p className="text-red-600 text-sm">Failed to load drivers.</p>
        <button
          onClick={() => refetch()}
          className="px-6 py-2 border rounded-md hover:bg-gray-100"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h2 className="text-xl font-semibold mb-3">Drivers</h2>
      <DataTable columns={columns} data={data ?? []} />
    </div>
  );
}
