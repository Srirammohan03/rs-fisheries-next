import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { safeUnlink } from "@/lib/helper";

export const POST = apiHandler(async (req: Request) => {
  const formData = await req.formData();

  const name = formData.get("name")?.toString();
  const phone = formData.get("phone")?.toString();
  const licenseNumber = formData.get("licenseNumber")?.toString();
  const address = formData.get("address")?.toString();
  const age = formData.get("age")?.toString();
  const aadharNumber = formData.get("aadharNumber")?.toString();
  const aadharProof = formData.get("aadharProof") as File | null;
  const licenseProof = formData.get("licenseProof") as File | null;

  if (!name || !phone || !licenseNumber || !address || !age || !aadharNumber) {
    throw new ApiError(400, "Required fields are missing");
  }

  const existing = await prisma.driver.findFirst({
    where: {
      OR: [{ licenseNumber }, { phone }, { aadharNumber }],
    },
  });

  if (existing) {
    if (existing.licenseNumber === licenseNumber) {
      throw new ApiError(400, "Driver with this license number already exists");
    }
    if (existing.phone === phone) {
      throw new ApiError(400, "Driver with this phone already exists");
    }
    if (existing.aadharNumber === aadharNumber) {
      throw new ApiError(400, "Driver with this Aadhar number already exists");
    }
  }

  let aadharProofUrl: string | undefined;
  let licenseProofUrl: string | undefined;
  try {
    if (aadharProof && aadharProof.size > 0) {
      if (aadharProof.size > 5 * 1024 * 1024) {
        throw new ApiError(400, "File size must be under 5MB");
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedTypes.includes(aadharProof?.type)) {
        throw new ApiError(400, "Invalid file type");
      }

      const bytes = Buffer.from(await aadharProof.arrayBuffer());
      const ext = aadharProof.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${phone}.${ext}`;

      const uploadDir = path.join(process.cwd(), "public/uploads/drivers");
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, bytes);

      aadharProofUrl = `/uploads/drivers/${fileName}`;
    }

    if (licenseProof && licenseProof.size > 0) {
      if (licenseProof.size > 5 * 1024 * 1024) {
        throw new ApiError(400, "File size must be under 5MB");
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedTypes.includes(licenseProof?.type)) {
        throw new ApiError(400, "Invalid file type");
      }

      const bytes = Buffer.from(await licenseProof.arrayBuffer());
      const ext = licenseProof.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${phone}.${ext}`;

      const uploadDir = path.join(process.cwd(), "public/uploads/drivers");
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, bytes);

      licenseProofUrl = `/uploads/drivers/${fileName}`;
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        phone,
        licenseNumber,
        address,
        age: Number(age),
        aadharNumber,
        aadharProof: aadharProofUrl,
        licenseProof: licenseProofUrl,
      },
    });

    return NextResponse.json(
      new ApiResponse(201, driver, "Driver added successfully"),
      { status: 201 }
    );
  } catch (error) {
    await safeUnlink(aadharProofUrl);
    await safeUnlink(licenseProofUrl);
    throw error;
  }
});

export const GET = apiHandler(async () => {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignedVehicle: true },
  });

  return NextResponse.json(
    new ApiResponse(200, drivers, "Drivers fetched successfully")
  );
});

export const PATCH = apiHandler(async (req: Request) => {
  const formData = await req.formData();

  const id = formData.get("id")?.toString();
  if (!id) throw new ApiError(400, "Driver ID is required for update");

  const existing = await prisma.driver.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Driver not found");

  const name = formData.get("name")?.toString();
  const phone = formData.get("phone")?.toString();
  const licenseNumber = formData.get("licenseNumber")?.toString();
  const address = formData.get("address")?.toString();
  const ageStr = formData.get("age")?.toString();
  const aadharNumber = formData.get("aadharNumber")?.toString();
  const aadharProof = formData.get("aadharProof") as File | null;
  const licenseProof = formData.get("licenseProof") as File | null;
  const removeAadharProof =
    formData.get("removeAadharProof")?.toString() === "true";
  const removeLicenseProof =
    formData.get("removeLicenseProof")?.toString() === "true";

  if (
    !name ||
    !phone ||
    !licenseNumber ||
    !address ||
    !ageStr ||
    !aadharNumber
  ) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Unique checks (skip if unchanged)
  const orConditions: any[] = [];
  if (phone !== existing.phone) orConditions.push({ phone });
  if (licenseNumber !== existing.licenseNumber)
    orConditions.push({ licenseNumber });
  if (aadharNumber !== existing.aadharNumber)
    orConditions.push({ aadharNumber });

  if (orConditions.length > 0) {
    const conflict = await prisma.driver.findFirst({
      where: {
        id: { not: id },
        OR: orConditions,
      },
    });
    if (conflict) {
      if (conflict.phone === phone)
        throw new ApiError(400, "Phone already exists");
      if (conflict.licenseNumber === licenseNumber)
        throw new ApiError(400, "License number already exists");
      if (conflict.aadharNumber === aadharNumber)
        throw new ApiError(400, "Aadhar number already exists");
    }
  }

  let aadharProofUrl = existing.aadharProof ?? null;
  let licenseProofUrl = existing.licenseProof ?? null;

  try {
    if (removeAadharProof) {
      if (aadharProofUrl) {
        const oldPath = path.join(process.cwd(), "public", aadharProofUrl);
        await fs.unlink(oldPath).catch(() => {});
      }
      aadharProofUrl = null;
    } else if (aadharProof && aadharProof.size > 0) {
      if (aadharProof.size > 5 * 1024 * 1024)
        throw new ApiError(400, "File size must be under 5MB");

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(aadharProof.type))
        throw new ApiError(400, "Invalid file type");

      if (aadharProofUrl) {
        const oldPath = path.join(process.cwd(), "public", aadharProofUrl);
        await fs.unlink(oldPath).catch(() => {});
      }

      const bytes = Buffer.from(await aadharProof.arrayBuffer());
      const ext = aadharProof.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${phone}.${ext}`;

      const uploadDir = path.join(process.cwd(), "public/uploads/drivers");
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, bytes);

      aadharProofUrl = `/uploads/drivers/${fileName}`;
    }

    if (removeLicenseProof) {
      if (licenseProofUrl) {
        const oldPath = path.join(process.cwd(), "public", licenseProofUrl);
        await fs.unlink(oldPath).catch(() => {});
      }
      licenseProofUrl = null;
    } else if (licenseProof && licenseProof.size > 0) {
      if (licenseProof.size > 5 * 1024 * 1024)
        throw new ApiError(400, "File size must be under 5MB");

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(licenseProof.type))
        throw new ApiError(400, "Invalid file type");

      if (licenseProofUrl) {
        const oldPath = path.join(process.cwd(), "public", licenseProofUrl);
        await fs.unlink(oldPath).catch(() => {});
      }

      const bytes = Buffer.from(await licenseProof.arrayBuffer());
      const ext = licenseProof.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${phone}.${ext}`;

      const uploadDir = path.join(process.cwd(), "public/uploads/drivers");
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, bytes);

      licenseProofUrl = `/uploads/drivers/${fileName}`;
    }

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        name,
        phone,
        licenseNumber,
        address,
        age: Number(ageStr),
        aadharNumber,
        aadharProof: aadharProofUrl,
        licenseProof: licenseProofUrl,
      },
    });

    return NextResponse.json(
      new ApiResponse(200, updated, "Driver updated successfully")
    );
  } catch (error) {
    await safeUnlink(aadharProofUrl);
    await safeUnlink(licenseProofUrl);
    throw error;
  }
});

export const DELETE = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) throw new ApiError(400, "Driver ID is required");

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new ApiError(404, "Driver not found");

  if (driver.aadharProof) {
    const filePath = path.join(process.cwd(), "public", driver.aadharProof);
    await fs.unlink(filePath).catch(() => {});
  }

  if (driver.licenseProof) {
    const filePath = path.join(process.cwd(), "public", driver.licenseProof);
    await fs.unlink(filePath).catch(() => {});
  }

  await prisma.driver.delete({ where: { id } });

  return NextResponse.json(
    new ApiResponse(200, null, "Driver deleted successfully")
  );
});
