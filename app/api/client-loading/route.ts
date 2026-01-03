// app/api/client-loading/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;
const DEDUCTION_PERCENT = 5;

async function getNetKgsByCodes(codes: string[]) {
  const [inFormer, inAgent, outClient] = await Promise.all([
    prisma.formerItem.groupBy({
      by: ["varietyCode"],
      where: { varietyCode: { in: codes } },
      _sum: { totalKgs: true },
    }),
    prisma.agentItem.groupBy({
      by: ["varietyCode"],
      where: { varietyCode: { in: codes } },
      _sum: { totalKgs: true },
    }),
    prisma.clientItem.groupBy({
      by: ["varietyCode"],
      where: { varietyCode: { in: codes } },
      _sum: { totalKgs: true },
    }),
  ]);

  type GroupedResult = {
    varietyCode: string;
    _sum: { totalKgs: number | null };
  };

  const formerMap = Object.fromEntries(
    inFormer.map((x: GroupedResult) => [
      x.varietyCode,
      Number(x._sum.totalKgs ?? 0),
    ])
  );
  const agentMap = Object.fromEntries(
    inAgent.map((x: GroupedResult) => [
      x.varietyCode,
      Number(x._sum.totalKgs ?? 0),
    ])
  );
  const clientMap = Object.fromEntries(
    outClient.map((x: GroupedResult) => [
      x.varietyCode,
      Number(x._sum.totalKgs ?? 0),
    ])
  );

  const netMap: Record<string, number> = {};
  for (const code of codes) {
    const incoming = (formerMap[code] || 0) + (agentMap[code] || 0);
    const outgoing = clientMap[code] || 0;
    netMap[code] = Math.max(0, incoming - outgoing);
  }
  return netMap;
}

export async function POST(req: Request) {
  // Your existing POST logic — unchanged
  try {
    const body = await req.json();
    const {
      clientName,
      billNo,
      date,
      vehicleId,
      vehicleNo,
      village,
      fishCode,
      items,
    } = body;

    if (!clientName?.trim()) {
      return NextResponse.json(
        { success: false, message: "Client name is required" },
        { status: 400 }
      );
    }

    if (!billNo?.trim()) {
      return NextResponse.json(
        { success: false, message: "Bill number is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one item is required" },
        { status: 400 }
      );
    }

    const loadingDate = date ? new Date(date) : new Date();
    if (isNaN(loadingDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date provided" },
        { status: 400 }
      );
    }

    const normalizedVehicleId =
      typeof vehicleId === "string" && vehicleId.trim()
        ? vehicleId.trim()
        : null;
    const normalizedVehicleNo =
      typeof vehicleNo === "string" && vehicleNo.trim()
        ? vehicleNo.trim()
        : null;

    // if (!normalizedVehicleId && !normalizedVehicleNo) {
    //   return NextResponse.json({ success: false, message: "Vehicle is required" }, { status: 400 });
    // }

    const processedItems = items.map((item: any) => {
      const trays = Number(item.noTrays) || 0;
      const loose = Number(item.loose) || 0;
      const totalKgs = trays * TRAY_KG + loose;

      return {
        varietyCode: item.varietyCode,
        noTrays: trays,
        trayKgs: trays * TRAY_KG,
        loose,
        totalKgs,
        pricePerKg: 0,
        totalPrice: 0,
      };
    });

    const reqMap: Record<string, number> = {};
    for (const it of processedItems) {
      if (!it.varietyCode) continue;
      reqMap[it.varietyCode] = (reqMap[it.varietyCode] || 0) + it.totalKgs;
    }

    const codes = Object.keys(reqMap);
    if (codes.length === 0) {
      return NextResponse.json(
        { success: false, message: "Select at least one variety" },
        { status: 400 }
      );
    }

    const netMap = await getNetKgsByCodes(codes);
    for (const code of codes) {
      const available = netMap[code] || 0;
      const requested = reqMap[code] || 0;
      if (requested > available) {
        return NextResponse.json(
          {
            success: false,
            message: `Stock exceeded for ${code}. Available ${available} Kgs, requested ${requested} Kgs`,
          },
          { status: 400 }
        );
      }
    }

    const totalTrays = processedItems.reduce((sum, i) => sum + i.noTrays, 0);
    const totalLooseKgs = processedItems.reduce((sum, i) => sum + i.loose, 0);
    const totalTrayKgs = processedItems.reduce((sum, i) => sum + i.trayKgs, 0);
    const totalKgs = processedItems.reduce((sum, i) => sum + i.totalKgs, 0);

    const grandTotal = Number(
      (totalKgs * (1 - DEDUCTION_PERCENT / 100)).toFixed(2)
    );

    const createData: any = {
      clientName: clientName.trim(),
      billNo: billNo.trim(),
      date: loadingDate,
      village: village?.trim() || "",
      fishCode: fishCode?.trim() || "",
      totalTrays,
      totalTrayKgs,
      totalLooseKgs,
      totalKgs,

      totalPrice: 0,
      grandTotal: grandTotal,

      items: {
        create: processedItems.map((i) => ({
          varietyCode: i.varietyCode,
          noTrays: i.noTrays,
          trayKgs: i.trayKgs,
          loose: i.loose,
          totalKgs: i.totalKgs,
          pricePerKg: 0,
          totalPrice: 0,
        })),
      },
    };

    if (normalizedVehicleId) {
      createData.vehicle = { connect: { id: normalizedVehicleId } };
      createData.vehicleNo = null;
    } else {
      createData.vehicleNo = normalizedVehicleNo;
    }

    const saved = await prisma.clientLoading.create({
      data: createData,
      include: {
        items: true,
        vehicle: { select: { vehicleNumber: true } },
      },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (e) {
    console.error("ClientLoading POST error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to save loading" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const loadings = await prisma.clientLoading.findMany({
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
        // ✅ Include dispatch charges to calculate breakdown
        dispatchCharges: {
          select: {
            type: true,
            label: true,
            amount: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { date: "desc" },
    });

    const formatted = loadings.map((l) => {
      // ✅ Calculate dispatch breakdown from real records
      const breakdown = {
        iceCooling: 0,
        transportCharges: 0,
        otherCharges: [] as { label: string; amount: number }[],
        dispatchChargesTotal: 0,
      };

      l.dispatchCharges.forEach((c) => {
        const amt = Number(c.amount);
        breakdown.dispatchChargesTotal += amt;

        if (c.type === "ICE_COOLING") {
          breakdown.iceCooling += amt;
        } else if (c.type === "TRANSPORT") {
          breakdown.transportCharges += amt;
        } else if (c.type === "OTHER" && c.label) {
          breakdown.otherCharges.push({
            label: c.label,
            amount: amt,
          });
        }
      });

      return {
        ...l,
        vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
        vehicle: undefined,
        // ✅ Add the breakdown
        dispatchBreakdown: breakdown,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("ClientLoading GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
