"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  User,
  Calendar,
  FileText,
  MapPin,
  Fuel,
  Settings,
  AlertCircle,
  CheckCircle2,
  Phone,
  CreditCard,
  Weight,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ApiResponse } from "./types";
import axios from "axios";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};
type TripStatus = "RUNNING" | "COMPLETED";

export function getTripStatusBadge(status: TripStatus) {
  switch (status) {
    case "RUNNING":
      return {
        label: "Running",
        className: "border-amber-500 text-amber-700 bg-amber-50",
      };

    case "COMPLETED":
      return {
        label: "Completed",
        className: "border-emerald-500 text-emerald-700 bg-emerald-50",
      };

    default:
      return {
        label: status,
        className: "border-slate-300 text-slate-700 bg-slate-50",
      };
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDaysUntilExpiry = (dateString: string | null) => {
  if (!dateString) return null;
  const days = Math.ceil(
    (new Date(dateString).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
  );
  return days;
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between items-center py-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value || "—"}</span>
  </div>
);

const ExpiryRow = ({ label, date }: { label: string; date: string | null }) => {
  const daysLeft = getDaysUntilExpiry(date);
  let statusColor = "text-foreground";

  if (daysLeft !== null) {
    if (daysLeft < 0) statusColor = "text-red-600";
    else if (daysLeft < 30) statusColor = "text-orange-600";
    else statusColor = "text-green-600";
  }

  return (
    <div className="flex justify-between items-center py-3 text-sm border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">
        <div className={`font-medium ${statusColor}`}>{formatDate(date)}</div>
        {daysLeft !== null && daysLeft < 60 && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {daysLeft < 0
              ? `${Math.abs(daysLeft)} days overdue`
              : `${daysLeft} days left`}
          </div>
        )}
      </div>
    </div>
  );
};

export default function VehicleDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["vehicle", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await axios.get(`/api/vehicles/${id}`);
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-muted-foreground">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">
            Could not find vehicle details or the server is unreachable.
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  const vehicle: any = data.data.vehicle;
  const allTrips = data.data.trips || [];
  const totalPages = Math.ceil(allTrips.length / itemsPerPage);
  const paginatedTrips = allTrips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalRevenue = allTrips.reduce(
    (acc: number, curr: any) => acc + curr.grandTotal,
    0
  );

  const isOwn = vehicle.ownership === "OWN";
  const isRent = vehicle.ownership === "RENT";

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-white p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex gap-5 w-full md:w-auto">
                <div className="h-20 w-20 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
                  <Truck className="w-10 h-10 text-indigo-600" />
                </div>

                <div className="flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        {vehicle.vehicleNumber || "N/A"}
                      </h1>
                      <Badge
                        variant="outline"
                        className={`px-2.5 py-0.5 h-6 ${
                          vehicle.isActive
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {vehicle.isActive ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Inactive
                          </div>
                        )}
                      </Badge>
                    </div>
                    {isOwn && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-3">
                        <span>{vehicle.manufacturer || "N/A"}</span>
                        <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                        <span>{vehicle.model || "N/A"}</span>
                        <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                        <span>{vehicle.yearOfManufacture || "N/A"}</span>
                      </div>
                    )}
                    {isRent && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Agency:{" "}
                        <span className="font-semibold text-foreground">
                          {vehicle.rentalAgency || "N/A"}
                        </span>
                      </p>
                    )}
                    {isOwn && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                          <Weight className="w-3.5 h-3.5" />
                          {vehicle.capacityInTons || "N/A"} Tons
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                          <Fuel className="w-3.5 h-3.5" />
                          {vehicle.fuelType || "N/A"}
                        </div>
                      </div>
                    )}
                    {isRent && vehicle.dailyRate && (
                      <div className="flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                        <span>Daily Rate</span>
                        <span className="font-bold ml-1">
                          {formatCurrency(vehicle.dailyRate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto mt-4 md:mt-0">
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-right min-w-[120px]">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">
                      Total Revenue
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(totalRevenue)}
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-right min-w-[120px]">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">
                      Total Trips
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {allTrips.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-base font-semibold">
                  Vehicle Details
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <DetailRow
                label="Ownership"
                value={isOwn ? "Own Vehicle" : "Rented Vehicle"}
              />
              {isOwn ? (
                <>
                  <DetailRow label="Fuel Type" value={vehicle.fuelType} />
                  <DetailRow label="Body Type" value={vehicle.bodyType} />
                  <DetailRow
                    label="Capacity"
                    value={`${vehicle.capacityInTons} Tons`}
                  />
                  <Separator className="my-3" />
                  <DetailRow
                    label="Engine No."
                    value={
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {vehicle.engineNumber}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Chassis No."
                    value={
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {vehicle.chassisNumber}
                      </span>
                    }
                  />
                </>
              ) : (
                <>
                  <DetailRow
                    label="Rental Agency"
                    value={vehicle.rentalAgency || "N/A"}
                  />
                  <DetailRow
                    label="Rate Per Day"
                    value={
                      vehicle.dailyRate
                        ? formatCurrency(vehicle.dailyRate)
                        : "N/A"
                    }
                  />
                  <Separator className="my-3" />
                  <div className="pt-2">
                    <span className="text-sm text-muted-foreground">
                      Remarks
                    </span>
                    <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                      {vehicle.remarks || "No remarks provided"}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {isOwn && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-base font-semibold">
                    Compliance & Validity
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <ExpiryRow label="RC Validity" date={vehicle.rcValidity} />
                  <ExpiryRow label="Insurance" date={vehicle.insuranceExpiry} />
                  <ExpiryRow label="Fitness" date={vehicle.fitnessExpiry} />
                  <ExpiryRow label="Road Tax" date={vehicle.roadTaxExpiry} />
                  <ExpiryRow label="Pollution" date={vehicle.pollutionExpiry} />
                  <ExpiryRow label="Permit" date={vehicle.permitExpiry} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-base font-semibold">
                  Assigned Driver
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {vehicle.assignedDriver ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-bold">
                        {vehicle.assignedDriver.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        {vehicle.assignedDriver.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Age: {vehicle.assignedDriver.age}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 px-1">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-medium">
                        {vehicle.assignedDriver.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-mono text-gray-600">
                        {vehicle.assignedDriver.licenseNumber}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-indigo-500 mt-0.5" />
                      <span className="text-sm text-gray-600 line-clamp-2">
                        {vehicle.assignedDriver.address}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  <User className="w-10 h-10 text-gray-300 mb-2" />
                  <p className="text-muted-foreground mb-4 text-sm">
                    No driver assigned
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-none">
          <CardHeader className="border-b bg-white rounded-t-xl px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg font-semibold">
                  Trip History
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
                Total Trips: {allTrips.length}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="pl-6">Date / Bill No</TableHead>
                  <TableHead>Party Details</TableHead>
                  <TableHead className="text-center">Load (Kg)</TableHead>
                  <TableHead className="text-right">
                    Transport Charges
                  </TableHead>
                  <TableHead className="text-right pr-6">Load Type</TableHead>
                  <TableHead className="text-right pr-6">Trip Status</TableHead>
                  <TableHead className="text-right pr-6">
                    Trip Start Date
                  </TableHead>
                  <TableHead className="text-right pr-6">
                    Trip Complete Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTrips.length > 0 ? (
                  paginatedTrips.map((trip: any) => (
                    <TableRow key={trip.id} className="hover:bg-gray-50/50">
                      <TableCell className="pl-6 py-4">
                        <div className="font-medium text-gray-900">
                          {formatDate(trip.date)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {trip.billNo}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{trip.partyName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {trip.village}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {trip.totalKgs.toLocaleString("en-IN")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(trip.transportCharges)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900 pr-6">
                        <Badge variant="secondary" className="font-medium">
                          {trip.loadType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900 pr-6">
                        {(() => {
                          const badge = getTripStatusBadge(trip.status);
                          return (
                            <Badge
                              variant="outline"
                              className={`font-medium ${badge.className}`}
                            >
                              {badge.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900 pr-6">
                        {formatDate(trip.startedAt)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900 pr-6">
                        {formatDate(trip.completedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-48 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-gray-300" />
                        <p>No trip history recorded yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex justify-center border-t bg-gray-50/30 py-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (num) => (
                      <PaginationItem key={num}>
                        <PaginationLink
                          onClick={() => setCurrentPage(num)}
                          isActive={currentPage === num}
                          className="cursor-pointer"
                        >
                          {num}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
