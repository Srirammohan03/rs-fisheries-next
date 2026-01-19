// app/api/former-loading/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;
const DEDUCTION_PERCENT = 5;

type FormerItemInput = {
  varietyCode: string;
  noTrays: number | string;
  loose: number | string;
};

type FormerLoadingBody = {
  fishCode?: string;
  billNo: string;
  FarmerName?: string;
  village?: string;
  date?: string;

  // ✅ NEW
  useVehicle?: boolean;

  vehicleId?: string | null;
  vehicleNo?: string | null;

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

    const farmerName = asTrim(body.FarmerName);
    if (!farmerName) {
      return NextResponse.json(
        { success: false, message: "Farmer name is required" },
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

    const useVeh = Boolean(body.useVehicle);

    const normalizedVehicleId =
      useVeh && typeof body.vehicleId === "string" && body.vehicleId.trim()
        ? body.vehicleId.trim()
        : null;

    const normalizedVehicleNo =
      useVeh && typeof body.vehicleNo === "string" && body.vehicleNo.trim()
        ? body.vehicleNo.trim()
        : null;

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

    const totalTrays = items.reduce((s, i) => s + i.noTrays, 0);
    const totalLooseKgs = round2(items.reduce((s, i) => s + i.loose, 0));
    const totalTrayKgs = round2(items.reduce((s, i) => s + i.trayKgs, 0));
    const totalKgs = round2(items.reduce((s, i) => s + i.totalKgs, 0));

    // ✅ NET KGS logic like client
    const grandTotal = useVeh
      ? Math.round(totalKgs)
      : Math.round(totalKgs * (1 - DEDUCTION_PERCENT / 100));

    const createData: Parameters<typeof prisma.formerLoading.create>[0]["data"] =
    {
      fishCode: asTrim(body.fishCode) || "NA",
      billNo,
      FarmerName: farmerName, // keep string (not null)
      village: asTrim(body.village) || "", // avoid null
      date: loadingDate,

      totalTrays,
      totalLooseKgs,
      totalTrayKgs,
      totalKgs,

      totalPrice: 0,
      dispatchChargesTotal: 0,
      packingAmountTotal: 0,

      // ✅ store net kgs
      grandTotal,

      items: { create: items },
    };

    // ✅ attach vehicle ONLY if useVeh true
    if (useVeh && normalizedVehicleId) {
      createData.vehicle = { connect: { id: normalizedVehicleId } };
      createData.vehicleNo = null;
    } else if (useVeh && normalizedVehicleNo) {
      createData.vehicleNo = normalizedVehicleNo;
    } else {
      createData.vehicleNo = null;
    }

    const saved = await prisma.formerLoading.create({
      data: createData,
      include: { items: true, vehicle: { select: { vehicleNumber: true } } },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (err: any) {
    console.error("FormerLoading POST error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save farmer loading",
        prisma: { code: err?.code, meta: err?.meta }, // ✅ debug
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const rows = await prisma.formerLoading.findMany({
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
        else if (c.type === "OTHER" && c.label) {
          breakdown.otherCharges.push({ label: c.label, amount: amt });
        }
      });

      return {
        ...l,
        vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
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
