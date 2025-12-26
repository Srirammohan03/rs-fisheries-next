import prisma from "@/lib/prisma";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const GET = apiHandler(async (_req: Request) => {
  const employees = await prisma.employee.findMany({
    where: {
      user: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      designation: true,
    },
  });

  return NextResponse.json(
    new ApiResponse(200, employees, "Employees fetched successfully"),
    { status: 200 }
  );
});
