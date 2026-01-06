import prisma from "@/lib/prisma";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const GET = apiHandler(async (req: Request) => {
  const auditLog = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    new ApiResponse(200, auditLog, "Audit Logs Fetched Successfully")
  );
});
