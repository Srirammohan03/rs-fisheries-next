import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const GET = apiHandler(async (req: Request, context: any) => {
  const { searchParams } = new URL(req.url);
  const salaryMonth = searchParams.get("month");
  if (!salaryMonth) {
    throw new ApiError(400, "salaryMonth is required (YYYY-MM)");
  }

  const employees = await prisma.employee.findMany({
    where: {
      employeePayments: {
        none: {
          salaryMonth,
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      designation: true,
      grossSalary: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });

  return NextResponse.json(
    new ApiResponse(
      200,
      employees,
      "Employees available for payment fetched successfully"
    )
  );
});
