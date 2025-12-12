import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req: Request) => {
  const body = await req.json();
  const { name, phone, licenseNumber, address, age, aadharNumber } = body;

  if (!name || !phone || !licenseNumber || !address || !age || !aadharNumber) {
    throw new ApiError(401, "required fields are missing");
  }

  const existing = await prisma.driver.findFirst({
    where: { OR: [{ licenseNumber }, { phone }, { aadharNumber }] },
  });

  if (existing) {
    if (existing.licenseNumber === licenseNumber)
      throw new ApiError(400, "Driver with this license number already exists");

    if (existing.phone === phone)
      throw new ApiError(400, "Driver with this phone already exists");

    if (existing.aadharNumber === aadharNumber)
      throw new ApiError(400, "Driver with this Aadhar number already exists");
  }

  const driver = await prisma.driver.create({
    data: {
      name,
      phone,
      licenseNumber,
      address,
      age: Number(age),
      aadharNumber,
    },
  });

  return NextResponse.json(
    new ApiResponse(201, driver, "Driver added successfully"),
    { status: 201 }
  );
});
