import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req: Request) => {
  const body = await req.json();

  const {
    vehicleNumber,
    rentalAgency,
    rentalRatePerDay,
    assignedDriverId,
    remarks,
  } = body;

  // Required checks
  if (!vehicleNumber) throw new ApiError(401, "Vehicle number is required");
  if (!rentalAgency) throw new ApiError(401, "Rental agency is required");
  if (!rentalRatePerDay)
    throw new ApiError(401, "Rental rate per day is required");

  // Duplicate vehicle number check
  const exists = await prisma.vehicle.findUnique({
    where: { vehicleNumber },
  });

  if (exists) {
    throw new ApiError(400, "Vehicle number already exists");
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      vehicleNumber,
      ownership: "RENT",

      rentalAgency,
      rentalRatePerDay: Number(rentalRatePerDay),

      assignedDriverId: assignedDriverId || null,
      remarks,
    },
  });

  return NextResponse.json(
    new ApiResponse(201, vehicle, "Rent vehicle added successfully")
  );
});

export const GET = apiHandler(async () => {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownership: "RENT" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    new ApiResponse(200, vehicles, "Vehicles RENT fetched successfully")
  );
});
