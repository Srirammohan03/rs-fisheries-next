import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req: Request) => {
  const body = await req.json();

  const {
    vehicleNumber,
    ownership,
    manufacturer,
    model,
    yearOfManufacture,
    fuelType,
    engineNumber,
    chassisNumber,
    capacityInTons,
    bodyType,
    rcValidity,
    insuranceExpiry,
    fitnessExpiry,
    pollutionExpiry,
    permitExpiry,
    roadTaxExpiry,
    assignedDriverId,
    rentalAgency,
    rentalRatePerDay,
    remarks,
  } = body;

  // Required fields validation
  if (!vehicleNumber || !ownership) {
    throw new ApiError(401, "vehicleNumber and ownership are required");
  }

  // Check duplicate vehicle number
  const existing = await prisma.vehicle.findUnique({
    where: { vehicleNumber },
  });

  if (existing) {
    throw new ApiError(400, "Vehicle number already exists");
  }

  // Date parsing helper
  const parseDate = (value: any) => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime()))
      throw new ApiError(400, `Invalid date format: ${value}`);
    return d;
  };

  const newVehicle = await prisma.vehicle.create({
    data: {
      vehicleNumber,
      ownership,
      manufacturer,
      model,
      yearOfManufacture: yearOfManufacture ? Number(yearOfManufacture) : null,
      fuelType,
      engineNumber,
      chassisNumber,
      capacityInTons: capacityInTons ? Number(capacityInTons) : null,
      bodyType,

      // Dates converted properly
      rcValidity: parseDate(rcValidity),
      insuranceExpiry: parseDate(insuranceExpiry),
      fitnessExpiry: parseDate(fitnessExpiry),
      pollutionExpiry: parseDate(pollutionExpiry),
      permitExpiry: parseDate(permitExpiry),
      roadTaxExpiry: parseDate(roadTaxExpiry),

      assignedDriverId: assignedDriverId || null,

      rentalAgency,
      rentalRatePerDay: rentalRatePerDay ? Number(rentalRatePerDay) : null,

      remarks,
    },
  });

  return NextResponse.json(
    new ApiResponse(201, newVehicle, "Vehicle added successfully")
  );
});

export const GET = apiHandler(async () => {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { farmerLoadings: { some: { vehicleId: { not: null } } } },
        { agentLoadings: { some: { vehicleId: { not: null } } } },
        { clientLoadings: { some: { vehicleId: { not: null } } } },
      ],
    },
    select: {
      id: true,
      vehicleNumber: true,
      ownership: true,
      assignedDriver: {
        select: { name: true },
      },

      farmerLoadings: {
        where: { vehicleId: { not: null } },
        take: 1,
        select: {
          id: true,
          billNo: true,
          village: true,
          date: true,
          FarmerName: true,
        },
      },

      agentLoadings: {
        where: { vehicleId: { not: null } },
        take: 1,
        select: {
          id: true,
          billNo: true,
          village: true,
          date: true,
          agentName: true,
        },
      },

      clientLoadings: {
        where: { vehicleId: { not: null } },
        take: 1,
        select: {
          id: true,
          billNo: true,
          village: true,
          date: true,
          clientName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    new ApiResponse(200, vehicles, "Active trips fetched")
  );
});
