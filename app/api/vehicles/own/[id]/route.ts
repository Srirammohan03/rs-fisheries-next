import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";
import { parseDate } from "../types";

export const PUT = apiHandler(async (req: Request) => {
  const body = await req.json();

  const {
    id,
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
  if (!id) {
    throw new ApiError(400, "Vehicle ID is required");
  }

  // Check existence
  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!existingVehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  // Check duplicate vehicle number (if changed)
  if (vehicleNumber && vehicleNumber !== existingVehicle.vehicleNumber) {
    const duplicate = await prisma.vehicle.findUnique({
      where: { vehicleNumber },
    });

    if (duplicate) {
      throw new ApiError(400, "Vehicle number already exists");
    }
  }

  const updatedVehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      vehicleNumber: vehicleNumber ?? existingVehicle.vehicleNumber,
      manufacturer,
      model,
      fuelType,
      engineNumber,
      chassisNumber,
      bodyType,
      remarks,

      yearOfManufacture:
        yearOfManufacture !== undefined ? Number(yearOfManufacture) : undefined,

      capacityInTons:
        capacityInTons !== undefined ? Number(capacityInTons) : undefined,

      rcValidity: parseDate(rcValidity),
      insuranceExpiry: parseDate(insuranceExpiry),
      fitnessExpiry: parseDate(fitnessExpiry),
      pollutionExpiry: parseDate(pollutionExpiry),
      permitExpiry: parseDate(permitExpiry),
      roadTaxExpiry: parseDate(roadTaxExpiry),

      assignedDriverId:
        assignedDriverId !== undefined ? assignedDriverId : undefined,
    },
  });

  return NextResponse.json(
    new ApiResponse(200, updatedVehicle, "Vehicle updated successfully")
  );
});

export const DELETE = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) {
    throw new ApiError(400, "Vehicle ID is required");
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  await prisma.vehicle.delete({
    where: { id },
  });

  return NextResponse.json(
    new ApiResponse(200, null, "Vehicle deleted successfully")
  );
});
