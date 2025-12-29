// app/api/former-loading/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;
const MONEY_DEDUCTION_PERCENT = 5;

type FormerItemInput = {
  varietyCode: string;
  noTrays: number | string;
  loose: number | string;
  pricePerKg: number | string;
};

type FormerLoadingBody = {
  fishCode?: string;
  billNo: string;
  FarmerName?: string;
  village?: string;
  date?: string;
  vehicleId?: string;
  vehicleNo?: string;
  items: FormerItemInput[];
};

const asTrim = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const toNum = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FormerLoadingBody;

    const billNo = asTrim(body.billNo);
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

    const vehicleId = asTrim(body.vehicleId) || null;
    const vehicleNo = asTrim(body.vehicleNo) || null;

    if (!vehicleId && !vehicleNo) {
      return NextResponse.json(
        { success: false, message: "Vehicle is required" },
        { status: 400 }
      );
    }

    const items = body.items.map((it) => {
      const varietyCode = asTrim(it.varietyCode);
      const noTrays = Math.max(0, Math.floor(toNum(it.noTrays)));
      const loose = Math.max(0, toNum(it.loose));
      const pricePerKg = Math.max(0, toNum(it.pricePerKg));

      const trayKgs = noTrays * TRAY_KG;
      const totalKgs = trayKgs + loose;

      const gross = totalKgs * pricePerKg;
      const totalPrice = round2(gross * (1 - MONEY_DEDUCTION_PERCENT / 100));

      return {
        varietyCode,
        noTrays,
        trayKgs,
        loose,
        totalKgs,
        pricePerKg,
        totalPrice,
      };
    });

    const totalTrays = items.reduce((s, i) => s + i.noTrays, 0);
    const totalLooseKgs = round2(items.reduce((s, i) => s + i.loose, 0));
    const totalTrayKgs = round2(items.reduce((s, i) => s + i.trayKgs, 0));
    const totalKgs = round2(items.reduce((s, i) => s + i.totalKgs, 0));

    const totalPrice = round2(items.reduce((s, i) => s + i.totalPrice, 0));

    const createData: Parameters<typeof prisma.formerLoading.create>[0]["data"] = {
      fishCode: asTrim(body.fishCode) || "NA",
      billNo,
      FarmerName: asTrim(body.FarmerName) || null,
      village: asTrim(body.village) || "",
      date: loadingDate,

      totalTrays,
      totalLooseKgs,
      totalTrayKgs,
      totalKgs,

      totalPrice,
      dispatchChargesTotal: 0,
      packingAmountTotal: 0,
      grandTotal: totalPrice,

      items: { create: items },
    };

    if (vehicleId) {
      createData.vehicle = { connect: { id: vehicleId } };
      createData.vehicleNo = null;
    } else {
      createData.vehicleNo = vehicleNo;
    }

    const saved = await prisma.formerLoading.create({
      data: createData,
      include: { items: true, vehicle: { select: { vehicleNumber: true } } },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (err: unknown) {
    console.error("FormerLoading POST error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to save farmer loading";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const rows = await prisma.formerLoading.findMany({
      include: {
        items: true,
        vehicle: { select: { vehicleNumber: true } },
        // Include all dispatch charges
        dispatchCharges: {
          select: {
            type: true,
            label: true,
            amount: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = rows.map((l) => {
      const itemsTotalPrice = round2(
        l.items.reduce((s, it) => s + toNum(it.totalPrice), 0)
      );

      const totalPrice = itemsTotalPrice;

      // ✅ Calculate breakdown from real dispatch charges
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

      const packingTotal = toNum(l.packingAmountTotal);

      const grandTotal = round2(totalPrice + breakdown.dispatchChargesTotal + packingTotal);

      return {
        ...l,
        totalPrice,
        grandTotal,
        vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
        // ✅ Add breakdown to response
        dispatchBreakdown: breakdown,
      };
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    console.error("FormerLoading GET error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch farmer loadings" },
      { status: 500 }
    );
  }
}