import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req: Request) => {
  const { vehicleId } = await req.json();

  if (!vehicleId) {
    throw new ApiError(400, "vehicleId is required");
  }

  await prisma.$transaction(async (tx) => {
    const updateData = {
      tripStatus: "COMPLETED" as const,
      completedAt: new Date(),
    };

    const [formerResult, agentResult, clientResult] = await Promise.all([
      tx.formerLoading.updateMany({
        where: { vehicleId, tripStatus: "RUNNING" },
        data: updateData,
      }),
      tx.agentLoading.updateMany({
        where: { vehicleId, tripStatus: "RUNNING" },
        data: updateData,
      }),
      tx.clientLoading.updateMany({
        where: { vehicleId, tripStatus: "RUNNING" },
        data: updateData,
      }),
    ]);

    const updatedCount =
      formerResult.count + agentResult.count + clientResult.count;

    if (updatedCount === 0) {
      throw new ApiError(400, "No active trip found for this vehicle");
    }
  });

  return NextResponse.json(
    new ApiResponse(200, null, "Vehicle marked as available")
  );
});
