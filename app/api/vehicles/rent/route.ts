import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { Prisma } from "@prisma/client";
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

export const GET = apiHandler(async (req: Request) => {
  // GET /api/vehicles/rent?page=1&limit=10&search=abc&assigned=abc&sortBy=NEWEST

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const search = searchParams.get("search")?.trim() || "";
  const assigned = searchParams.get("assigned") || "ALL";
  const sortBy = searchParams.get("sortBy") || "NEWEST";

  const skip = (page - 1) * limit;

  const where: any = {
    ownership: "RENT",
  };

  if (search) {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);

    where.AND = terms.map((term) => ({
      OR: [
        {
          rentalAgency: {
            contains: term,
            mode: "insensitive",
          },
        },
        {
          vehicleNumber: {
            contains: term,
            mode: "insensitive",
          },
        },
        {
          assignedDriver: {
            name: {
              contains: term,
              mode: "insensitive",
            },
          },
        },
      ],
    }));
  }

  if (assigned === "ASSIGNED") {
    where.assignedDriverId = { not: null };
  }

  if (assigned === "AVAILABLE") {
    where.assignedDriverId = null;
  }

  const orderBy: Prisma.VehicleOrderByWithRelationInput =
    sortBy === "NEWEST" ? { createdAt: "desc" } : { createdAt: "asc" };

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
        manufacturer: true,
        model: true,
        yearOfManufacture: true,
        fuelType: true,
        engineNumber: true,
        chassisNumber: true,
        capacityInTons: true,
        bodyType: true,
        rcValidity: true,
        fitnessExpiry: true,
        insuranceExpiry: true,
        pollutionExpiry: true,
        permitExpiry: true,
        roadTaxExpiry: true,
        isActive: true,
      },
      skip,
      take: limit,
    }),
    await prisma.vehicle.count({
      where,
    }),
  ]);

  return NextResponse.json(
    new ApiResponse(200, vehicles, "Vehicles RENT fetched successfully", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  );
});
