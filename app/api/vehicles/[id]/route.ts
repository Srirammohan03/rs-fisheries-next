import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { NextResponse } from "next/server";

export const GET = apiHandler(async (req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) throw new ApiError(400, "Vehicle id is missing");

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      assignedDriver: true,

      farmerLoadings: {
        select: {
          id: true,
          billNo: true,
          FarmerName: true,
          village: true,
          date: true,
          totalKgs: true,
          totalPrice: true,
          grandTotal: true,
          createdAt: true,
          tripStatus: true,
          startedAt: true,
          completedAt: true,
          dispatchCharges: {
            where: { type: "TRANSPORT" },
            select: { amount: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },

      agentLoadings: {
        select: {
          id: true,
          billNo: true,
          agentName: true,
          village: true,
          date: true,
          totalKgs: true,
          totalPrice: true,
          grandTotal: true,
          createdAt: true,
          tripStatus: true,
          startedAt: true,
          completedAt: true,
          dispatchCharges: {
            where: { type: "TRANSPORT" },
            select: { amount: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },

      clientLoadings: {
        select: {
          id: true,
          billNo: true,
          clientName: true,
          village: true,
          date: true,
          totalKgs: true,
          totalPrice: true,
          grandTotal: true,
          createdAt: true,
          tripStatus: true,
          startedAt: true,
          completedAt: true,
          dispatchCharges: {
            where: { type: "TRANSPORT" },
            select: { amount: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  const sumTransport = (charges: { amount: number }[]) =>
    charges.reduce((s, c) => s + Number(c.amount), 0);

  const trips = [
    ...vehicle.farmerLoadings.map((l) => ({
      id: l.id,
      loadType: "FARMER",
      name: l.FarmerName,
      billNo: l.billNo,
      partyName: l.FarmerName ?? "—",
      village: l.village,
      date: l.date,
      totalKgs: l.totalKgs,
      totalPrice: l.totalPrice,
      transportCharges: sumTransport(l.dispatchCharges),
      grandTotal: l.grandTotal,
      createdAt: l.createdAt,
      status: l.tripStatus,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
    })),

    ...vehicle.agentLoadings.map((l) => ({
      id: l.id,
      loadType: "AGENT",
      name: l.agentName,
      billNo: l.billNo,
      partyName: l.agentName,
      village: l.village,
      date: l.date,
      totalKgs: l.totalKgs,
      totalPrice: l.totalPrice,
      transportCharges: sumTransport(l.dispatchCharges),
      grandTotal: l.grandTotal,
      createdAt: l.createdAt,
      status: l.tripStatus,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
    })),

    ...vehicle.clientLoadings.map((l) => ({
      id: l.id,
      loadType: "CLIENT",
      name: l.clientName,
      billNo: l.billNo,
      partyName: l.clientName,
      village: l.village,
      date: l.date,
      totalKgs: l.totalKgs,
      totalPrice: l.totalPrice,
      transportCharges: sumTransport(l.dispatchCharges),
      grandTotal: l.grandTotal,
      createdAt: l.createdAt,
      status: l.tripStatus,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({
    success: true,
    data: {
      vehicle,
      trips,
    },
  });
});
