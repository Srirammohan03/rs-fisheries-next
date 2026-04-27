// app\api\agent-loading\route.ts
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLogger";
import { withAuth } from "@/lib/withAuth";
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
  agentId?: string | null;
  billNo: string;
  village?: string;
  date?: string;
  useVehicle?: boolean;
  vehicleId?: string | null;
  vehicleNo?: string | null;
  localVehicle?: string | null;
  items: AgentItemInput[];
  trayWeight?: number;
};

const asTrim = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const toNum = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const POST = withAuth(async (req: Request) => {
  try {
    const body = (await req.json()) as AgentLoadingBody;

    const agentName = asTrim(body.agentName);
    const billNo = asTrim(body.billNo);

    if (!agentName) {
      return NextResponse.json(
        { success: false, message: "Agent name is required" },
        { status: 400 },
      );
    }

    if (!billNo) {
      return NextResponse.json(
        { success: false, message: "Bill number is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one item is required" },
        { status: 400 },
      );
    }

    const loadingDate = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(loadingDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date provided" },
        { status: 400 },
      );
    }

    const useVehicle = Boolean(body.useVehicle);
    const vehicleId = asTrim(body.vehicleId) || null;
    const vehicleNo = asTrim(body.vehicleNo) || null;

    /* ---------- ITEMS ---------- */
    const trayKg = Number(body.trayWeight) || 35;
    const items = body.items.map((it) => {
      const varietyCode = asTrim(it.varietyCode);
      const noTrays = Math.max(0, Math.floor(toNum(it.noTrays)));
      const loose = Math.max(0, toNum(it.loose));

      const trayKgs = noTrays * trayKg;
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

    //  WEIGHT-BASED GRAND TOTAL
    const grandTotal = useVehicle
      ? Math.round(totalKgs)
      : Math.round(totalKgs * (1 - DEDUCTION_PERCENT / 100));

    /* ---------- CREATE DATA ---------- */
    const createData: any = {
      fishCode: asTrim(body.fishCode) || "NA",
      agentName,
      billNo,
      village: asTrim(body.village) || "",
      date: loadingDate,
      localVehicle: asTrim(body.localVehicle) || null,

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

    //  VEHICLE HANDLING (SAFE)
    if (useVehicle && vehicleId) {
      createData.vehicle = { connect: { id: vehicleId } };
      createData.vehicleNo = null;
    } else if (useVehicle && vehicleNo) {
      createData.vehicleNo = vehicleNo;
    } else {
      createData.vehicleNo = null;
    }

    if (body.agentId && body.agentId.trim() !== "") {
      createData.agent = { connect: { id: body.agentId } };
    }

    const saved = await prisma.agentLoading.create({
      data: createData,
      include: {
        items: true,
        vehicle: { select: { vehicleNumber: true } },
      },
    });

    await logAudit({
      user: (req as any).user,
      action: "CREATE",
      module: "Agent Loading",
      recordId: saved.id,
      request: req,
      label: `Agent loading created: ${saved.billNo}`,
      oldValues: null,
      newValues: {
        billNo: saved.billNo,
        agentName: saved.agentName,
        agentId: saved.agentId ?? null,
        fishCode: saved.fishCode,
        totalKgs: saved.totalKgs,
        totalPrice: saved.totalPrice,
        grandTotal: saved.grandTotal,
        vehicleNo: saved.vehicle?.vehicleNumber ?? saved.vehicleNo ?? null,
        localVehicle: saved.localVehicle ?? null,
      },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (err: any) {
    console.error("AgentLoading POST error:", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: `A loading record with Bill No ${asTrim(err?.meta?.target?.[0] || "Unknown")} already exists`,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save agent loading",
        error: err.message,
      },
      { status: 500 },
    );
  }
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const where: any = {};

    // 🔎 SEARCH (BillNo OR AgentName)
    if (search) {
      where.OR = [
        {
          billNo: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          agentName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // 📅 DATE RANGE FILTER
    if (fromDate || toDate) {
      where.date = {};

      if (fromDate) {
        where.date.gte = new Date(fromDate);
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const rows = await prisma.agentLoading.findMany({
      where,
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

      const itemTotal = l.items.reduce(
        (sum, item) => sum + Number(item.totalPrice || 0),
        0,
      );

      const grandTotal = round2(
        itemTotal +
          breakdown.dispatchChargesTotal +
          toNum(l.packingAmountTotal),
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
      { status: 500 },
    );
  }
}
