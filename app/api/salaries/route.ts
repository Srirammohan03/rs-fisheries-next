import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req: Request) => {
  const { userId, month, amount, notes } = await req.json();
  if (!userId || !month || amount === undefined || notes === undefined)
    throw new ApiError(401, "required fields are missing");
  const formattedMonth = new Date(month);

  if (isNaN(formattedMonth.getTime())) {
    throw new ApiError(400, "Invalid month format");
  }
  const salaries = await prisma.salaries.create({
    data: {
      month: formattedMonth,
      amount: Number(amount),
      notes,
      userId,
    },
  });

  return NextResponse.json(
    new ApiResponse(201, salaries, "Successfully added salaries")
  );
});

export const GET = apiHandler(async (_req: Request) => {
  const salaries = await prisma.salaries.findMany({
    include: {
      user: {
        select: { name: true, id: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    new ApiResponse(200, salaries, "Successfully Fetched salaries")
  );
});
