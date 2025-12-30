import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req: Request) => {
  const body = await req.json();
  const { vehicleId, driverId } = body;

  if (!vehicleId || !driverId) {
    throw new ApiError(400, "vehicleId and driverId are required");
  }
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { assignedDriver: true },
  });

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  if (vehicle.assignedDriver) {
    throw new ApiError(400, "This vehicle already has a driver assigned");
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { assignedVehicle: true },
  });

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  if (driver.assignedVehicle) {
    throw new ApiError(400, "This driver is already assigned to a vehicle");
  }

  const updatedVehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      assignedDriverId: driverId,
    },
    include: {
      assignedDriver: true,
    },
  });

  return NextResponse.json(
    new ApiResponse(200, updatedVehicle, "Driver assigned successfully")
  );
});

export const GET = apiHandler(async () => {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      assignedDriverId: {
        not: null,
      },
      NOT: {
        OR: [
          {
            farmerLoadings: {
              some: { vehicleId: { not: null } },
            },
          },
          {
            agentLoadings: {
              some: { vehicleId: { not: null } },
            },
          },
          {
            clientLoadings: {
              some: { vehicleId: { not: null } },
            },
          },
        ],
      },
    },
    select: {
      id: true,
      vehicleNumber: true,
      assignedDriver: {
        select: {
          name: true,
        },
      },
    },
  });

  return Response.json(
    new ApiResponse(200, vehicles, "Assigned vehicles fetched successfully")
  );
});
