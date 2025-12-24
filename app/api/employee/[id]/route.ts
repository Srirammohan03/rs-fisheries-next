import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { uploadEmployeeFile } from "@/lib/helper";

export const GET = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) {
    throw new ApiError(400, "Employee ID is required");
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  return NextResponse.json(
    new ApiResponse(200, employee, "Employee fetched successfully"),
    { status: 200 }
  );
});

export const PATCH = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;
  if (!id) throw new ApiError(400, "Employee ID is required");

  const formData = await req.formData();

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new ApiError(404, "Employee not found");

  /* ---------- Helpers ---------- */

  const optionalString = (key: string) =>
    (formData.get(key) as string | null) ?? undefined;

  const optionalNumber = (key: string) => {
    const val = formData.get(key);
    return val !== null ? Number(val) : undefined;
  };

  const parseDate = (key: string) => {
    const val = formData.get(key);
    return val ? new Date(val as string) : undefined;
  };

  /* ---------- Files ---------- */

  const passportPhoto = formData.get("passportPhoto") as File | null;
  const aadhaarImage = formData.get("aadhaarImage") as File | null;
  const panImage = formData.get("panImage") as File | null;

  let photoPath = employee.photo;
  let aadhaarPath = employee.aadhaarProof;
  let panPath = employee.panProof;

  try {
    if (passportPhoto?.size) {
      if (photoPath)
        await fs
          .unlink(path.join(process.cwd(), "uploads", photoPath))
          .catch(() => {});

      photoPath = await uploadEmployeeFile(passportPhoto, "employees/photos");
    }

    if (aadhaarImage?.size) {
      if (aadhaarPath)
        await fs
          .unlink(path.join(process.cwd(), "uploads", aadhaarPath))
          .catch(() => {});

      aadhaarPath = await uploadEmployeeFile(aadhaarImage, "employees/aadhaar");
    }

    if (panImage?.size) {
      if (panPath)
        await fs
          .unlink(path.join(process.cwd(), "uploads", panPath))
          .catch(() => {});

      panPath = await uploadEmployeeFile(panImage, "employees/pan");
    }

    /* ---------- Unique Field Checks ---------- */

    const uniqueFields: any[] = [];

    const aadhaar = optionalString("aadhaar");
    const pan = optionalString("pan");
    const mobile = optionalString("mobile");
    const email = optionalString("email");
    const accountNumber = optionalString("accountNumber");

    if (aadhaar && aadhaar !== employee.aadhaar) uniqueFields.push({ aadhaar });
    if (pan && pan !== employee.pan) uniqueFields.push({ pan });
    if (mobile && mobile !== employee.mobile) uniqueFields.push({ mobile });
    if (email && email !== employee.email) uniqueFields.push({ email });
    if (accountNumber && accountNumber !== employee.accountNumber)
      uniqueFields.push({ accountNumber });

    if (uniqueFields.length) {
      const conflict = await prisma.employee.findFirst({
        where: { id: { not: id }, OR: uniqueFields },
      });
      if (conflict) throw new ApiError(400, "Duplicate unique field detected");
    }

    /* ---------- Update ---------- */

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        doj: parseDate("doj"),
        department: optionalString("department"),
        designation: optionalString("designation"),

        basicSalary: optionalNumber("basicSalary"),
        hra: optionalNumber("hra"),
        conveyanceAllowance: optionalNumber("conveyanceAllowance"),
        specialAllowance: optionalNumber("specialAllowance"),
        grossSalary: optionalNumber("grossSalary"),
        ctc: optionalNumber("ctc"),

        workLocation: optionalString("workLocation"),
        shiftType: optionalString("shiftType"),

        fullName: optionalString("fullName"),
        fatherName: optionalString("fatherName"),
        dob: parseDate("dob"),
        gender: optionalString("gender") as any,

        aadhaar,
        pan,
        mobile,
        altMobile: optionalString("altMobile"),
        email,

        maritalStatus: optionalString("maritalStatus") as any,
        nationality: optionalString("nationality"),

        currentAddress: optionalString("currentAddress"),
        permanentAddress: optionalString("permanentAddress"),

        bankName: optionalString("bankName"),
        branchName: optionalString("branchName"),
        accountNumber,
        ifsc: optionalString("ifsc"),

        photo: photoPath,
        aadhaarProof: aadhaarPath,
        panProof: panPath,
      },
    });

    return NextResponse.json(
      new ApiResponse(200, updated, "Employee updated successfully"),
      { status: 200 }
    );
  } catch (err) {
    /* rollback newly uploaded files */
    const uploaded = [
      passportPhoto && photoPath !== employee.photo && photoPath,
      aadhaarImage && aadhaarPath !== employee.aadhaarProof && aadhaarPath,
      panImage && panPath !== employee.panProof && panPath,
    ];

    for (const file of uploaded) {
      if (file)
        await fs
          .unlink(path.join(process.cwd(), "uploads", file))
          .catch(() => {});
    }

    throw err;
  }
});

export const DELETE = apiHandler(async (_req: Request, context: any) => {
  const { id } = await context.params;
  if (!id) throw new ApiError(400, "Employee ID is required");

  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  /* ---------- Delete Employee ---------- */
  await prisma.employee.delete({
    where: { id },
  });

  /* ---------- Cleanup Files ---------- */
  const files = [employee.photo, employee.aadhaarProof, employee.panProof];

  for (const file of files) {
    if (file) {
      await fs
        .unlink(path.join(process.cwd(), "uploads", file))
        .catch(() => {});
    }
  }

  return NextResponse.json(
    new ApiResponse(200, null, "Employee deleted successfully"),
    { status: 200 }
  );
});
