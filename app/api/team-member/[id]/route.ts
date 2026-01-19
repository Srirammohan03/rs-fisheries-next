// app\api\team-member\[id]\route.ts
import { logAudit } from "@/lib/auditLogger";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const GET = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) throw new ApiError(400, "ID is missing");

  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) throw new ApiError(401, "User didn't exists");
  return NextResponse.json(
    new ApiResponse(200, user, "User fetched Successfully")
  );
});

export const PUT = withAuth(
  apiHandler(async (req: Request, context: any) => {
    const { id } = await context.params;
    const body = await req.json();

    if (!id) {
      throw new ApiError(400, "User ID is missing");
    }

    const { email, password } = body;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const oldUser = await tx.user.findUnique({ where: { id } });
      if (!oldUser) throw new ApiError(404, "User not found");

      const updateData: { email?: string; password?: string } = {};

      if (typeof email === "string" && email.trim()) {
        if (email !== oldUser.email) {
          const emailExists = await tx.user.findUnique({ where: { email } });
          if (emailExists) throw new ApiError(409, "Email already in use");
        }
        updateData.email = email.trim();
      }

      if (typeof password === "string" && password.trim()) {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const newUser = await tx.user.update({
        where: { id },
        data: updateData,
      });

      const oldValues: any = {};
      const newValues: any = {};

      if (updateData.email) {
        oldValues.email = oldUser.email;
        newValues.email = newUser.email;
      }

      if (Object.keys(newValues).length) {
        await logAudit({
          user: (req as any).user,
          action: "UPDATE",
          module: "User",
          recordId: newUser.id,
          request: req,
          oldValues,
          newValues,
        });
      }

      return newUser;
    });
    return NextResponse.json(
      new ApiResponse(200, updatedUser, "User updated successfully")
    );
  })
);

export const DELETE = withAuth(
  apiHandler(async (req: Request, context: any) => {
    const { id } = await context.params;

    if (!id) throw new ApiError(400, "ID is missing");

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new ApiError(404, "User not found");

      await tx.user.delete({ where: { id } });

      await logAudit({
        user: (req as any).user,
        action: "DELETE",
        module: "User",
        recordId: id,
        request: req,
        oldValues: {
          employeeId: user.employeeId,
          email: user.email,
        },
        newValues: null,
      });
    });

    return NextResponse.json(
      new ApiResponse(200, null, "User deleted Successfully")
    );
  })
);
