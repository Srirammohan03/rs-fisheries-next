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
  vehicleNo?: string;
  village?: string;
  fishCode?: string;
  items: ClientLoadingItem[];
};

const TRAY_KG = 35;

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

  const formerMap = Object.fromEntries(
    inFormer.map((x) => [x.varietyCode, Number(x._sum.totalKgs || 0)])
  );
  const agentMap = Object.fromEntries(
    inAgent.map((x) => [x.varietyCode, Number(x._sum.totalKgs || 0)])
  );
  const clientMap = Object.fromEntries(
    outClient.map((x) => [x.varietyCode, Number(x._sum.totalKgs || 0)])
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
    const { clientName, billNo, date, vehicleNo, village, fishCode, items } = body;

    if (!clientName?.trim())
      return NextResponse.json({ success: false, message: "Client name is required" }, { status: 400 });

    if (!billNo?.trim())
      return NextResponse.json({ success: false, message: "Bill number is required" }, { status: 400 });

    if (!vehicleNo?.trim())
      return NextResponse.json({ success: false, message: "Vehicle is required" }, { status: 400 });

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ success: false, message: "At least one item is required" }, { status: 400 });

    // Validate vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { vehicleNumber: vehicleNo },
    });
    if (!vehicle)
      return NextResponse.json({ success: false, message: "Invalid vehicle number" }, { status: 400 });

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
      return NextResponse.json({ success: false, message: "Select at least one variety" }, { status: 400 });

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

    // Save
    const saved = await prisma.clientLoading.create({
      data: {
        clientName: clientName.trim(),
        billNo: billNo.trim(),
        date: new Date(date),
        vehicle: { connect: { id: vehicle.id } },
        village: village?.trim() || "",
        fishCode: fishCode?.trim() || "",
        totalTrays,
        totalTrayKgs,
        totalLooseKgs,
        totalKgs,
        totalPrice: 0,
        grandTotal: totalKgs,
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
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (e) {
    console.error("ClientLoading POST error:", e);
    return NextResponse.json({ success: false, message: "Failed to save loading" }, { status: 500 });
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
            pricePerKg: true,     // ← CRITICAL: Now included
            totalPrice: true,     // ← CRITICAL: Now included
          },
        },
        vehicle: {
          select: {
            vehicleNumber: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const formatted = loadings.map((l) => ({
      ...l,
      vehicleNo: l.vehicle?.vehicleNumber ?? "",
      // Optional: clean up nested vehicle object if not needed on frontend
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