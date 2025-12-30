import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";
import { parseDate } from "./types";
import { Prisma } from "@prisma/client";

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

export const GET = apiHandler(async (req: Request) => {
  // GET /api/vehicles/own?page=1&limit=10&search=abc&fuelType=DIESEL

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const search = searchParams.get("search")?.trim() || "";
  const fuelType = searchParams.get("fuelType") || "ALL";
  const assigned = searchParams.get("assigned") || "ALL";
  const sortBy = searchParams.get("sortBy") || "NEWEST";

  const skip = (page - 1) * limit;

  const where: any = {
    ownership: "OWN",
  };

  if (search) {
    where.OR = [
      {
        vehicleNumber: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        manufacturer: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        assignedDriver: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  if (fuelType !== "ALL") {
    where.fuelType = fuelType;
  }

  if (assigned === "ASSIGNED") {
    where.assignedDriverId = { not: null };
  }

  if (assigned === "AVAILABLE") {
    where.assignedDriverId = null;
  }
  const orderBy: Prisma.VehicleOrderByWithRelationInput =
    sortBy === "OLDEST" ? { createdAt: "asc" } : { createdAt: "desc" };

  const [vehicles, total] = await Promise.all([
    await prisma.vehicle.findMany({
      where,
      orderBy,
      include: {
        assignedDriver: {
          select: {
            assignedVehicle: {
              select: {
                vehicleNumber: true,
                id: true,
              },
            },
            name: true,
            phone: true,
            id: true,
          },
        },
      },
      omit: {
        rentalAgency: true,
        rentalRatePerDay: true,
      },
      skip,
      take: limit,
    }),
    await prisma.vehicle.count({
      where,
    }),
  ]);

  return NextResponse.json(
    new ApiResponse(200, vehicles, "Vehicles OWN fetched successfully", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  );
});
