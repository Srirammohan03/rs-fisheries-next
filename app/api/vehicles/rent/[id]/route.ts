import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const PUT = apiHandler(async (req: Request) => {
  const body = await req.json();

  const {
    id,
    vehicleNumber,
    rentalAgency,
    rentalRatePerDay,
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

  if (existingVehicle.ownership !== "RENT") {
    throw new ApiError(400, "Vehicle is not a rent vehicle");
  }

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
      rentalAgency,
      rentalRatePerDay:
        rentalRatePerDay !== undefined ? Number(rentalRatePerDay) : undefined,

      assignedDriverId:
        assignedDriverId !== undefined ? assignedDriverId : undefined,
      remarks,
    },
  });

  return NextResponse.json(
    new ApiResponse(200, updatedVehicle, "Rent vehicle updated successfully")
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
