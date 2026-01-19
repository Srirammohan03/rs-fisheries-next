import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;
const DEDUCTION_PERCENT = 5;

type AgentItemInput = {
  varietyCode: string;
  noTrays: number | string;
  loose: number | string;
};

type AgentLoadingBody = {
  fishCode?: string;
  agentName: string;
  billNo: string;
  village?: string;
  date?: string;
  useVehicle?: boolean;
  vehicleId?: string | null;
  vehicleNo?: string | null;
  items: AgentItemInput[];
};

const asTrim = (v: unknown): string =>
  typeof v === "string" ? v.trim() : "";

const toNum = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AgentLoadingBody;

    const agentName = asTrim(body.agentName);
    const billNo = asTrim(body.billNo);

    if (!agentName) {
      return NextResponse.json(
        { success: false, message: "Agent name is required" },
        { status: 400 }
      );
    }

    if (!billNo) {
      return NextResponse.json(
        { success: false, message: "Bill number is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one item is required" },
        { status: 400 }
      );
    }

    const loadingDate = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(loadingDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date provided" },
        { status: 400 }
      );
    }

    const useVehicle = Boolean(body.useVehicle);
    const vehicleId = asTrim(body.vehicleId) || null;
    const vehicleNo = asTrim(body.vehicleNo) || null;

    /* ---------- ITEMS ---------- */
    const items = body.items.map((it) => {
      const varietyCode = asTrim(it.varietyCode);
      const noTrays = Math.max(0, Math.floor(toNum(it.noTrays)));
      const loose = Math.max(0, toNum(it.loose));

      const trayKgs = noTrays * TRAY_KG;
      const totalKgs = trayKgs + loose;

      return {
        varietyCode,
        noTrays,
        trayKgs,
        loose,
        totalKgs,
        pricePerKg: 0,
        totalPrice: 0,
      };
    });

    /* ---------- TOTALS ---------- */
    const totalTrays = items.reduce((s, i) => s + i.noTrays, 0);
    const totalLooseKgs = round2(items.reduce((s, i) => s + i.loose, 0));
    const totalTrayKgs = round2(items.reduce((s, i) => s + i.trayKgs, 0));
    const totalKgs = round2(items.reduce((s, i) => s + i.totalKgs, 0));

    // ✅ WEIGHT-BASED GRAND TOTAL
    const grandTotal = useVehicle
      ? Math.round(totalKgs)
      : Math.round(totalKgs * (1 - DEDUCTION_PERCENT / 100));

    /* ---------- CREATE DATA ---------- */
    const createData: Parameters<typeof prisma.agentLoading.create>[0]["data"] =
    {
      fishCode: asTrim(body.fishCode) || "NA",
      agentName,
      billNo,
      village: asTrim(body.village) || "",
      date: loadingDate,

      totalTrays,
      totalLooseKgs,
      totalTrayKgs,
      totalKgs,

      totalPrice: 0,
      dispatchChargesTotal: 0,
      packingAmountTotal: 0,
      grandTotal,

      items: { create: items },
    };

    // ✅ VEHICLE HANDLING (SAFE)
    if (useVehicle && vehicleId) {
      createData.vehicle = { connect: { id: vehicleId } };
      createData.vehicleNo = null;
    } else if (useVehicle && vehicleNo) {
      createData.vehicleNo = vehicleNo;
    } else {
      createData.vehicleNo = null;
    }

    const saved = await prisma.agentLoading.create({
      data: createData,
      include: {
        items: true,
        vehicle: { select: { vehicleNumber: true } },
      },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (err: any) {
    console.error("AgentLoading POST error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save agent loading",
        prisma: { code: err?.code, meta: err?.meta },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const rows = await prisma.agentLoading.findMany({
      include: {
        items: true,
        vehicle: { select: { vehicleNumber: true } },
        dispatchCharges: {
          select: { type: true, label: true, amount: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = rows.map((l) => {
      const breakdown = {
        iceCooling: 0,
        transportCharges: 0,
        otherCharges: [] as { label: string; amount: number }[],
        dispatchChargesTotal: 0,
      };

      l.dispatchCharges.forEach((c) => {
        const amt = Number(c.amount);
        breakdown.dispatchChargesTotal += amt;

        if (c.type === "ICE_COOLING") breakdown.iceCooling += amt;
        else if (c.type === "TRANSPORT") breakdown.transportCharges += amt;
        else if (c.type === "OTHER" && c.label)
          breakdown.otherCharges.push({ label: c.label, amount: amt });
      });

      const grandTotal = round2(
        l.grandTotal +
        breakdown.dispatchChargesTotal +
        toNum(l.packingAmountTotal)
      );

      return {
        ...l,
        vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
        grandTotal,
        dispatchBreakdown: breakdown,
      };
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("AgentLoading GET error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch agent loadings" },
      { status: 500 }
    );
  }
}
