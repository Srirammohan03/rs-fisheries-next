// app\api\team-member\route.ts
import { logAudit } from "@/lib/auditLogger";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const POST = withAuth(
  apiHandler(async (req: Request) => {
    const { employeeId, password, email } = await req.json();

    if (!employeeId || !password || !email)
      throw new ApiError(400, "Required Fields are missing");

    const existingUser = await prisma.user.findUnique({
      where: { employeeId },
    });

    if (existingUser) {
      throw new ApiError(409, "Employee already exists");
    }

    const hasedPassowrd = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          employeeId,
          password: hasedPassowrd,
          email,
        },
      });

      await logAudit({
        user: (req as any).user,
        action: "CREATE",
        module: "User",
        recordId: createdUser.id,
        request: req,
        oldValues: null,
        newValues: {
          employeeId: createdUser.employeeId,
          email: createdUser.email,
        },
      });

      return createdUser;
    });

    return NextResponse.json(
      new ApiResponse(201, user, "User Added Successfully")
    );
  })
);

export const GET = apiHandler(async () => {
  const users = await prisma.user.findMany({
    include: {
      employee: {
        select: {
          fullName: true,
          email: true,
          designation: true,
        },
      },
    },
  });

  return NextResponse.json(
    new ApiResponse(200, users, "User fetched Successfully")
  );
});
