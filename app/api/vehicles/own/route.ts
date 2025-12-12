import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

// Reusable date parser
const parseDate = (value: any) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime()))
    throw new ApiError(400, `Invalid date format: ${value}`);
  return d;
};

export const POST = apiHandler(async (req: Request) => {
  const body = await req.json();

  const {
    vehicleNumber,
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
    remarks,
  } = body;

  // Required
  if (!vehicleNumber) {
    throw new ApiError(401, "Vehicle number is required");
  }
  if (!fuelType) {
    throw new ApiError(401, "Fuel type is required");
  }

  // Check duplicate
  const exists = await prisma.vehicle.findUnique({
    where: { vehicleNumber },
  });

  if (exists) {
    throw new ApiError(400, "Vehicle number already exists");
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      vehicleNumber,
      ownership: "OWN",

      manufacturer,
      model,
      yearOfManufacture: yearOfManufacture ? Number(yearOfManufacture) : null,
      fuelType,
      engineNumber,
      chassisNumber,
      capacityInTons: capacityInTons ? Number(capacityInTons) : null,
      bodyType,

      rcValidity: parseDate(rcValidity),
      insuranceExpiry: parseDate(insuranceExpiry),
      fitnessExpiry: parseDate(fitnessExpiry),
      pollutionExpiry: parseDate(pollutionExpiry),
      permitExpiry: parseDate(permitExpiry),
      roadTaxExpiry: parseDate(roadTaxExpiry),

      assignedDriverId: assignedDriverId || null,
      remarks,
    },
  });

  return NextResponse.json(
    new ApiResponse(201, vehicle, "Own vehicle added successfully")
  );
});

export const GET = apiHandler(async () => {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownership: "OWN" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    new ApiResponse(200, vehicles, "Vehicles OWN fetched successfully")
  );
});
