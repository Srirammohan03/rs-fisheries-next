// app\api\team-member\[id]\route.ts
import prisma from "@/lib/prisma";
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

export const PUT = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;
  const body = await req.json();

  if (!id) {
    throw new ApiError(400, "User ID is missing");
  }

  const { email, password } = body;

  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const updateData: {
    email?: string;
    password?: string;
  } = {};

  if (typeof email === "string" && email.trim().length > 0) {
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new ApiError(409, "Email already in use");
      }
    }

    updateData.email = email.trim();
  }

  if (typeof password === "string" && password.trim().length > 0) {
    updateData.password = await bcrypt.hash(password.trim(), 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "Nothing to update");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(
    new ApiResponse(200, updatedUser, "User updated successfully")
  );
});

export const DELETE = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) throw new ApiError(400, "ID is missing");

  const deleteUser = await prisma.user.delete({
    where: { id },
  });

  return NextResponse.json(
    new ApiResponse(200, deleteUser, "User deleted Successfully")
  );
});
