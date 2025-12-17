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

  if (!id) throw new ApiError(400, "ID is missing");

  const updateData: any = {};

  if (body.email) updateData.email = body.email;
  if (body.name) updateData.name = body.name;
  if (body.role) updateData.role = body.role;

  // ✅ ONLY when password is provided (non-empty)
  if (typeof body.password === "string" && body.password.trim().length > 0) {
    updateData.password = await bcrypt.hash(body.password.trim(), 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(
    new ApiResponse(200, updatedUser, "User updated Successfully")
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
