import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextResponse } from "next/server";

export const POST = apiHandler(async (req: Request) => {
  const { vehicleId } = await req.json();

  await prisma.$transaction(async (tx) => {
    const farmer = await tx.formerLoading.findFirst({
      where: { vehicleId },
    });

    const agent = !farmer
      ? await tx.agentLoading.findFirst({ where: { vehicleId } })
      : null;

    const client =
      !farmer && !agent
        ? await tx.clientLoading.findFirst({ where: { vehicleId } })
        : null;

    if (!farmer && !agent && !client) {
      throw new ApiError(400, "No active trip found for this vehicle");
    }

    if (farmer) {
      await tx.formerLoading.update({
        where: { id: farmer.id },
        data: { vehicleId: null, vehicleNo: null },
      });
    }

    if (agent) {
      await tx.agentLoading.update({
        where: { id: agent.id },
        data: { vehicleId: null, vehicleNo: null },
      });
    }

    if (client) {
      await tx.clientLoading.update({
        where: { id: client.id },
        data: { vehicleId: null, vehicleNo: null },
      });
    }
  });

  return NextResponse.json(
    new ApiResponse(200, null, "Vehicle marked as available")
  );
});
