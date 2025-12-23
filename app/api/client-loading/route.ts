// app/api/client-loading/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type ClientLoadingItem = {
  varietyCode: string;
  noTrays: number;
  loose: number;
};

type CreateClientLoadingInput = {
  clientName: string;
  billNo: string;
  date: string;

  // ✅ new pattern: either connect vehicleId OR store vehicleNo
  vehicleId?: string | null;
  vehicleNo?: string | null;

  village?: string;
  fishCode?: string;
  items: ClientLoadingItem[];
};

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
    inFormer.map((x: GroupedResult) => [x.varietyCode, Number(x._sum.totalKgs ?? 0)])
  );
  const agentMap = Object.fromEntries(
    inAgent.map((x: GroupedResult) => [x.varietyCode, Number(x._sum.totalKgs ?? 0)])
  );
  const clientMap = Object.fromEntries(
    outClient.map((x: GroupedResult) => [x.varietyCode, Number(x._sum.totalKgs ?? 0)])
  );

  const netMap: Record<string, number> = {};
  for (const code of codes) {
    const incoming = (formerMap[code] || 0) + (agentMap[code] || 0);
    const outgoing = clientMap[code] || 0;
    netMap[code] = Math.max(0, incoming - outgoing);
  }
  return netMap;
}

// POST - Create new client loading
export async function POST(req: Request) {
  try {
    const body: CreateClientLoadingInput = await req.json();
    const { clientName, billNo, date, vehicleId, vehicleNo, village, fishCode, items } = body;

    if (!clientName?.trim())
      return NextResponse.json(
        { success: false, message: "Client name is required" },
        { status: 400 }
      );

    if (!billNo?.trim())
      return NextResponse.json(
        { success: false, message: "Bill number is required" },
        { status: 400 }
      );

    // Date validation
    const loadingDate = date ? new Date(date) : new Date();
    if (isNaN(loadingDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date provided" },
        { status: 400 }
      );
    }

    const normalizedVehicleId =
      typeof vehicleId === "string" && vehicleId.trim() ? vehicleId.trim() : null;

    const normalizedVehicleNo =
      typeof vehicleNo === "string" && vehicleNo.trim() ? vehicleNo.trim() : null;

    // ✅ Vehicle required: either ID or Other number
    if (!normalizedVehicleId && !normalizedVehicleNo) {
      return NextResponse.json(
        { success: false, message: "Vehicle is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json(
        { success: false, message: "At least one item is required" },
        { status: 400 }
      );

    // Build requested kgs per variety
    const reqMap: Record<string, number> = {};
    for (const it of items) {
      if (!it.varietyCode) continue;
      const trays = Number(it.noTrays) || 0;
      const loose = Number(it.loose) || 0;
      const kgs = trays * TRAY_KG + loose;
      reqMap[it.varietyCode] = (reqMap[it.varietyCode] || 0) + kgs;
    }

    const codes = Object.keys(reqMap);
    if (codes.length === 0)
      return NextResponse.json(
        { success: false, message: "Select at least one variety" },
        { status: 400 }
      );

    // Stock check
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

    // Totals
    const totalTrays = items.reduce((s, i) => s + (Number(i.noTrays) || 0), 0);
    const totalTrayKgs = totalTrays * TRAY_KG;
    const totalLooseKgs = items.reduce((s, i) => s + (Number(i.loose) || 0), 0);
    const totalKgs = totalTrayKgs + totalLooseKgs;

    // ✅ 5% deduction
    const grandTotal = Number((totalKgs * (1 - DEDUCTION_PERCENT / 100)).toFixed(2));

    // Build create payload conditionally (very important)
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
      grandTotal,
      items: {
        create: items.map((i) => ({
          varietyCode: i.varietyCode,
          noTrays: Number(i.noTrays) || 0,
          trayKgs: (Number(i.noTrays) || 0) * TRAY_KG,
          loose: Number(i.loose) || 0,
          totalKgs: (Number(i.noTrays) || 0) * TRAY_KG + (Number(i.loose) || 0),
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
      // don't set vehicle or vehicleId
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

// GET - All loadings (for list page)
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
      },
      orderBy: { date: "desc" },
    });

    const formatted = loadings.map((l) => ({
      ...l,
      vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
      vehicle: undefined,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("ClientLoading GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
