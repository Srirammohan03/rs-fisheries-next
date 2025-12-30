import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const PUT = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;
  const body = await req.json();

  if (!id) throw new ApiError(400, "ID is missing");

  const updatedData: any = {};

  if (body.userId !== undefined) updatedData.userId = body.userId;

  if (body.month !== undefined) {
    const formattedMonth = new Date(body.month);
    if (isNaN(formattedMonth.getTime())) {
      throw new ApiError(400, "Invalid month format");
    }
    updatedData.month = formattedMonth;
  }

  if (body.amount !== undefined) {
    updatedData.amount = Number(body.amount);
  }

  if (body.notes !== undefined) {
    updatedData.notes = body.notes;
  }

  const updatedSalaries = await prisma.salaries.update({
    where: { id },
    data: updatedData,
    include: {
      user: {
        select: { id: true, employeeId: true },
      },
    },
  });

  return NextResponse.json(
    new ApiResponse(200, updatedSalaries, "Successfully updated Salaries")
  );
});

export const DELETE = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) throw new ApiError(400, "ID is missing");

  const existing = await prisma.salaries.findUnique({
    where: { id },
  });

  if (!existing) throw new ApiError(404, "Salary record not found");

  const deleted = await prisma.salaries.delete({
    where: { id },
  });

  return NextResponse.json(
    new ApiResponse(200, deleted, "Salary record deleted successfully")
  );
});

export const GET = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) throw new ApiError(400, "ID is missing");

  const salary = await prisma.salaries.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, employeeId: true },
      },
    },
  });

  if (!salary) throw new ApiError(404, "Salary record not found");

  return NextResponse.json(
    new ApiResponse(200, salary, "Salary record fetched successfully")
  );
});
