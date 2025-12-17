// app/api/former-loading/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Basic validation
    if (!data.vehicleId) {
      return NextResponse.json(
        { success: false, message: "Vehicle selection is required" },
        { status: 400 }
      );
    }

    if (!data.billNo) {
      return NextResponse.json(
        { success: false, message: "Bill number is required" },
        { status: 400 }
      );
    }

    // Ensure date is a valid Date object
    const loadingDate = data.date ? new Date(data.date) : new Date();
    if (isNaN(loadingDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date provided" },
        { status: 400 }
      );
    }

    const loading = await prisma.formerLoading.create({
      data: {
        fishCode: data.fishCode || "NA",
        billNo: data.billNo,
        FarmerName: data.FarmerName || null,
        village: data.village || null,
        date: loadingDate,
        vehicle: {
          connect: { id: data.vehicleId }, // Keep as string (UUID)
        },
        totalTrays: Number(data.totalTrays) || 0,
        totalLooseKgs: Number(data.totalLooseKgs) || 0,
        totalTrayKgs: Number(data.totalTrayKgs) || 0,
        totalKgs: Number(data.totalKgs) || 0,
        grandTotal: Number(data.grandTotal || data.totalKgs || 0),
        items: {
          create: (data.items || []).map((item: any) => {
            const trays = Number(item.noTrays) || 0;
            const loose = Number(item.loose) || 0;
            const totalKgs = trays * 35 + loose;

            const pricePerKg = Number(item.pricePerKg) || 0;
            const totalPrice = Number(item.totalPrice) || pricePerKg * totalKgs;

            return {
              varietyCode: item.varietyCode,
              noTrays: trays,
              trayKgs: trays * 35,
              loose,
              totalKgs,
              pricePerKg,
              totalPrice,
            };
          }),
        },

      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, loading });
  } catch (error: any) {
    console.error("Error creating formerLoading:", error); // Log full error for debugging

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation (likely billNo)
        const target = error.meta?.target || "field";
        return NextResponse.json(
          {
            success: false,
            message: `Duplicate ${target}. Bill number already exists. Please refresh.`,
          },
          { status: 400 }
        );
      }

      if (error.code === "P2003") {
        // Foreign key failure (e.g., invalid vehicleId)
        return NextResponse.json(
          { success: false, message: "Invalid vehicle selected" },
          { status: 400 }
        );
      }
    }

    // Generic fallback
    return NextResponse.json(
      { success: false, message: "Save failed. Check server logs for details." },
      { status: 500 }
    );
  }
}

// GET remains unchanged (it's fine)
export async function GET() {
  try {
    const loadings = await prisma.formerLoading.findMany({
      include: {
        items: {
          select: {
            id: true,
            varietyCode: true,
            noTrays: true,
            trayKgs: true,
            loose: true,
            totalKgs: true,
            pricePerKg: true,
            totalPrice: true,
          },
        },
        vehicle: {
          select: {
            vehicleNumber: true,  // ← ADD THIS
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const formatted = loadings.map((l) => ({
      ...l,
      vehicleNo: l.vehicle?.vehicleNumber ?? "",
    }));
    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error fetching agent loadings:", error);
    return NextResponse.json(
      { message: "Failed to fetch agent loadings" },
      { status: 500 }
    );
  }
}