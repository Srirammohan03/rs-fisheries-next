// app\api\team-member\route.ts
import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req: Request) => {
  const { email, password, name, role } = await req.json();

  if (!email || !name || !role || !password)
    throw new ApiError(400, "Required Fields are missing");

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(409, "Email already exists");
  }

  const hasedPassowrd = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hasedPassowrd,
      role,
      name,
    },
  });

  return NextResponse.json(
    new ApiResponse(201, user, "User Added Successfully")
  );
});

export const GET = apiHandler(async () => {
  const users = await prisma.user.findMany();

  return NextResponse.json(
    new ApiResponse(200, users, "User fetched Successfully")
  );
});
