import { generateEmpId, uploadEmployeeFile } from "@/lib/helper";
import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/auditLogger";
import { Prisma } from "@prisma/client";

function parseDDMMYYYY(input: string): Date | null {
  const match = input.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (!match) return null;

  const [, day, month, year] = match.map(Number);

  // Month in JS Date is 0-based
  const date = new Date(year, month - 1, day);

  // Validate correctness (prevents 32-01-2025, etc.)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export const POST = withAuth(
  apiHandler(async (req: Request) => {
    const formData = await req.formData();

    //! Parse & Validate Fields

    const requiredString = (key: string) => {
      const value = formData.get(key);
      if (!value) throw new ApiError(400, `${key} is required`);
      return value as string;
    };

    const requiredNumber = (key: string) => {
      const value = Number(formData.get(key));
      if (Number.isNaN(value)) throw new ApiError(400, `${key} is invalid`);
      return value;
    };

    const doj = new Date(requiredString("doj"));
    const dob = new Date(requiredString("dob"));

    const employeeId = await generateEmpId();

    //! Files (Required)

    const passportPhoto = formData.get("passportPhoto") as File;
    const aadhaarImage = formData.get("aadhaarImage") as File;
    const panImage = formData.get("panImage") as File;

    if (!passportPhoto || !aadhaarImage || !panImage)
      throw new ApiError(400, "All documents are required");

    //! Uniqueness Checks

    const aadhaar = requiredString("aadhaar");
    const pan = requiredString("pan");
    const mobile = requiredString("mobile");
    const email = formData.get("email") as string | null;
    const accountNumber = requiredString("accountNumber");

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { aadhaar },
          { pan },
          { mobile },
          ...(email ? [{ email }] : []),
          { accountNumber },
        ],
      },
      select: {
        aadhaar: true,
        pan: true,
        mobile: true,
        email: true,
        accountNumber: true,
      },
    });

    if (existingEmployee) {
      const conflicts: string[] = [];

      if (existingEmployee.aadhaar === aadhaar) conflicts.push("Aadhaar");

      if (existingEmployee.pan === pan) conflicts.push("PAN");

      if (existingEmployee.mobile === mobile) conflicts.push("Mobile number");

      if (email && existingEmployee.email === email) conflicts.push("Email");

      if (existingEmployee.accountNumber === accountNumber)
        conflicts.push("Account number");

      throw new ApiError(
        400,
        `Employee with same ${conflicts.join(", ")} already exists`
      );
    }

    //! Upload Files

    let photoPath: string | null = null;
    let aadhaarPath: string | null = null;
    let panPath: string | null = null;

    try {
      photoPath = await uploadEmployeeFile(passportPhoto, "employees/photos");
      aadhaarPath = await uploadEmployeeFile(aadhaarImage, "employees/aadhaar");
      panPath = await uploadEmployeeFile(panImage, "employees/pan");

      //! Create Employee

      const employee = await prisma.$transaction(async (tx) => {
        const createdEmployee = await tx.employee.create({
          data: {
            employeeId,
            doj,
            department: requiredString("department"),
            designation: requiredString("designation"),

            basicSalary: requiredNumber("basicSalary"),
            hra: Number(formData.get("hra") || 0),
            conveyanceAllowance: Number(
              formData.get("conveyanceAllowance") || 0
            ),
            specialAllowance: Number(formData.get("specialAllowance") || 0),
            grossSalary: requiredNumber("grossSalary"),
            ctc: requiredNumber("ctc"),

            workLocation: formData.get("workLocation") as string | null,
            shiftType: formData.get("shiftType") as string | null,

            fullName: requiredString("fullName"),
            fatherName: requiredString("fatherName"),
            dob,
            gender: requiredString("gender") as any,
            aadhaar,
            pan,
            mobile,
            altMobile: formData.get("altMobile") as string | null,
            email,
            maritalStatus: requiredString("maritalStatus") as any,
            nationality: formData.get("nationality") as string,

            currentAddress: requiredString("currentAddress"),
            permanentAddress: requiredString("permanentAddress"),

            bankName: requiredString("bankName"),
            branchName: requiredString("branchName"),
            accountNumber,
            ifsc: requiredString("ifsc"),

            photo: photoPath,
            aadhaarProof: aadhaarPath,
            panProof: panPath,
          },
        });

        await logAudit({
          user: (req as any).user,
          action: "CREATE",
          module: "Employee",
          recordId: createdEmployee.id,
          request: req,
          oldValues: null,
          newValues: {
            employeeId: createdEmployee.employeeId,
            fullName: createdEmployee.fullName,
            department: createdEmployee.department,
            designation: createdEmployee.designation,
            doj: createdEmployee.doj,
            mobile: createdEmployee.mobile,
            email: createdEmployee.email,
            workLocation: createdEmployee.workLocation,
            shiftType: createdEmployee.shiftType,
            grossSalary: createdEmployee.grossSalary,
            ctc: createdEmployee.ctc,
          },
        });
        return createdEmployee;
      });

      return NextResponse.json(
        new ApiResponse(201, employee, "Employee created successfully"),
        { status: 201 }
      );
    } catch (err) {
      /* Cleanup orphan files */
      const files = [photoPath, aadhaarPath, panPath];
      for (const file of files) {
        if (file) {
          await fs
            .unlink(path.join(process.cwd(), "uploads", file))
            .catch(() => {});
        }
      }
      throw err;
    }
  })
);

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 10), 1),
    100
  );
  const fromDateParam = searchParams.get("fromDate");
  const toDateParam = searchParams.get("toDate");
  const search = searchParams.get("search")?.trim() || "";
  const sort = searchParams.get("sort");
  const shiftType = searchParams.get("shiftType");
  const designation = searchParams.get("designation");
  const skip = (page - 1) * limit;

  const where: Prisma.EmployeeWhereInput = {};

  if (shiftType) where.shiftType = shiftType;
  if (designation) where.designation = designation;

  if (search) {
    where.OR = [
      {
        employeeId: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        fullName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        designation: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        department: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        shiftType: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (fromDateParam || toDateParam) {
    where.doj = {
      ...(fromDateParam
        ? {
            gte: new Date(`${fromDateParam}T00:00:00.000Z`),
          }
        : {}),
      ...(toDateParam
        ? {
            lte: new Date(`${toDateParam}T00:00:00.000Z`),
          }
        : {}),
    };
  }

  const orderBy: Prisma.EmployeeOrderByWithRelationInput =
    sort === "old" ? { createdAt: "asc" } : { createdAt: "desc" };

  const [employees, total] = await Promise.all([
    await prisma.employee.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    await prisma.employee.count({ where }),
  ]);

  return NextResponse.json(
    new ApiResponse(200, employees, "Employees fetched successfully", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }),
    { status: 200 }
  );
});
