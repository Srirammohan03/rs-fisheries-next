// app/api/former-loading/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_WEIGHT = 35;
const DEDUCTION_PERCENT = 5;

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // BillNo required
    if (!data.billNo) {
      return NextResponse.json(
        { success: false, message: "Bill number is required" },
        { status: 400 }
      );
    }

    // Date validation
    const loadingDate = data.date ? new Date(data.date) : new Date();
    if (isNaN(loadingDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date provided" },
        { status: 400 }
      );
    }

    // Vehicle validation (Either vehicleId OR vehicleNo)
    const vehicleId: string | null =
      typeof data.vehicleId === "string" && data.vehicleId.trim()
        ? data.vehicleId.trim()
        : null;

    const vehicleNo: string | null =
      typeof data.vehicleNo === "string" && data.vehicleNo.trim()
        ? data.vehicleNo.trim()
        : null;

    if (!vehicleId && !vehicleNo) {
      return NextResponse.json(
        { success: false, message: "Vehicle selection is required" },
        { status: 400 }
      );
    }

    // Compute totals from items (authoritative)
    const items = (data.items || []).map((item: any) => {
      const trays = Number(item.noTrays) || 0;
      const loose = Number(item.loose) || 0;

      const totalKgs = trays * TRAY_WEIGHT + loose;

      const pricePerKg = Number(item.pricePerKg) || 0;
      const totalPrice =
        Number(item.totalPrice) || (pricePerKg ? pricePerKg * totalKgs : 0);

      return {
        varietyCode: item.varietyCode,
        noTrays: trays,
        trayKgs: trays * TRAY_WEIGHT,
        loose,
        totalKgs,
        pricePerKg,
        totalPrice,
      };
    });

    const totalTrays = items.reduce((sum: number, i: any) => sum + i.noTrays, 0);
    const totalLooseKgs = items.reduce((sum: number, i: any) => sum + i.loose, 0);
    const totalTrayKgs = items.reduce((sum: number, i: any) => sum + i.trayKgs, 0);
    const totalKgs = items.reduce((sum: number, i: any) => sum + i.totalKgs, 0);

    // ✅ 5% deduction on total
    const grandTotal = Number(
      (totalKgs * (1 - DEDUCTION_PERCENT / 100)).toFixed(2)
    );

    // ✅ Build create payload conditionally (THIS FIXES your error)
    const createData: any = {
      fishCode: data.fishCode || "NA",
      billNo: data.billNo,
      FarmerName: data.FarmerName || null,
      village: data.village || null,
      date: loadingDate,

      totalTrays,
      totalLooseKgs,
      totalTrayKgs,
      totalKgs,
      grandTotal,

      items: { create: items },
    };

    if (vehicleId) {
      // ✅ Connect existing vehicle
      createData.vehicle = { connect: { id: vehicleId } };
      createData.vehicleNo = null;
    } else {
      // ✅ Store custom vehicle number
      createData.vehicleNo = vehicleNo;
      // IMPORTANT: don't send vehicleId or vehicle relation at all
    }

    const loading = await prisma.formerLoading.create({
      data: createData,
      include: {
        items: true,
        vehicle: { select: { vehicleNumber: true } },
      },
    });

    return NextResponse.json({ success: true, loading });
  } catch (error: any) {
    console.error("Error creating formerLoading:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as any).code === "string"
    ) {
      const code = (error as any).code;

      if (code === "P2002") {
        return NextResponse.json(
          { success: false, message: "Duplicate bill number. Please refresh." },
          { status: 400 }
        );
      }

      if (code === "P2003") {
        return NextResponse.json(
          { success: false, message: "Invalid vehicle selected" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Save failed. Check server logs for details." },
      { status: 500 }
    );
  }
}

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
          select: { vehicleNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = loadings.map((l) => ({
      ...l,
      vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error fetching former loadings:", error);
    return NextResponse.json(
      { message: "Failed to fetch former loadings" },
      { status: 500 }
    );
  }
}
