import prisma from "@/lib/prisma";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const GET = apiHandler(async (req: Request) => {
  // /api/audit-logs?page=1&limit=10

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const search = searchParams.get("search")?.trim() || "";

  const fromDateParam = searchParams.get("fromDate");
  const toDateParam = searchParams.get("toDate");

  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (search) {
    where.OR = [
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        userRole: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        action: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        module: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (fromDateParam || toDateParam) {
    where.createdAt = {
      ...(fromDateParam
        ? { gte: new Date(`${fromDateParam}T00:00:00.000Z`) }
        : {}),
      ...(toDateParam ? { lte: new Date(`${toDateParam}T00:00:00.000Z`) } : {}),
    };
  }

  const [auditLog, total] = await Promise.all([
    await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    await prisma.auditLog.count(),
  ]);

  return NextResponse.json(
    new ApiResponse(200, auditLog, "Audit Logs Fetched Successfully", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  );
});
