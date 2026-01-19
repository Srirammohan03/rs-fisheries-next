// app/api/client-loading/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

const TRAY_KG = 35;
const DEDUCTION_PERCENT = 5;

type CreateItemInput = { varietyCode: string; noTrays: number; loose: number };

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

  type GroupedResult = { varietyCode: string; _sum: { totalKgs: number | null } };

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      clientName?: string;
      billNo?: string;
      date?: string;
      village?: string;
      fishCode?: string;
      clientId?: string;
      useVehicle?: boolean; // ✅ checkbox flag
      vehicleId?: string | null;
      vehicleNo?: string | null;

      items?: CreateItemInput[];
    };

    const clientName = body.clientName?.trim() || "";
    const billNo = body.billNo?.trim() || "";
    const village = body.village?.trim() || "";
    const fishCode = body.fishCode?.trim() || "";
    const clientId = body.clientId?.trim() || "";

    const useVehicle = Boolean(body.useVehicle);

    if (!clientName) {
      return NextResponse.json({ success: false, message: "Client name is required" }, { status: 400 });
    }
    if (!billNo) {
      return NextResponse.json({ success: false, message: "Bill number is required" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, message: "At least one item is required" }, { status: 400 });
    }

    const loadingDate = body.date ? new Date(body.date) : new Date();
    if (isNaN(loadingDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid date provided" }, { status: 400 });
    }

    const normalizedVehicleId =
      useVehicle && typeof body.vehicleId === "string" && body.vehicleId.trim()
        ? body.vehicleId.trim()
        : null;

    const normalizedVehicleNo =
      useVehicle && typeof body.vehicleNo === "string" && body.vehicleNo.trim()
        ? body.vehicleNo.trim()
        : "";

    // Build items
    const processedItems = body.items.map((item) => {
      const trays = Math.max(0, Number(item.noTrays) || 0);
      const loose = Math.max(0, Number(item.loose) || 0);
      const totalKgs = trays * TRAY_KG + loose;

      return {
        varietyCode: String(item.varietyCode || "").trim(),
        noTrays: trays,
        trayKgs: trays * TRAY_KG,
        loose,
        totalKgs,
        pricePerKg: 0,
        totalPrice: 0,
      };
    });

    // Validate varieties
    const codesUsed = processedItems.map((x) => x.varietyCode).filter(Boolean);
    if (codesUsed.length === 0) {
      return NextResponse.json({ success: false, message: "Select at least one variety" }, { status: 400 });
    }

    // Stock check
    const reqMap: Record<string, number> = {};
    for (const it of processedItems) {
      if (!it.varietyCode) continue;
      reqMap[it.varietyCode] = (reqMap[it.varietyCode] || 0) + it.totalKgs;
    }
    const codes = Object.keys(reqMap);
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
    const totalTrays = processedItems.reduce((sum, i) => sum + i.noTrays, 0);
    const totalLooseKgs = processedItems.reduce((sum, i) => sum + i.loose, 0);
    const totalTrayKgs = processedItems.reduce((sum, i) => sum + i.trayKgs, 0);
    const totalKgs = processedItems.reduce((sum, i) => sum + i.totalKgs, 0);

    // ✅ GRAND TOTAL RULE
    const grandTotal = useVehicle
      ? Number(totalKgs.toFixed(2))
      : Number((totalKgs * (1 - DEDUCTION_PERCENT / 100)).toFixed(2));

    const createData: any = {
      clientName,
      billNo,
      date: loadingDate,
      village,         // schema requires String (non-null)
      fishCode,         // schema requires String (non-null)
      totalTrays,
      totalTrayKgs,
      totalLooseKgs,
      totalKgs,
      totalPrice: 0,
      grandTotal,
      clientId,

      // ✅ IMPORTANT: to avoid DB null violation, keep vehicleNo always string
      vehicleNo: "",
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

    // vehicle attach only if useVehicle
    if (useVehicle) {
      if (normalizedVehicleId) {
        createData.vehicleId = normalizedVehicleId; // ✅ FIX
        createData.vehicleNo = normalizedVehicleNo || "";
      } else {
        createData.vehicleNo = normalizedVehicleNo || "";
      }
    } else {
      createData.vehicleNo = ""; // never null
    }
    const saved = await prisma.clientLoading.create({
      data: createData,
      include: {
        items: true,
        vehicle: { select: { vehicleNumber: true } }, // ✅ works for reading
      },
    });


    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (e) {
    console.error("ClientLoading POST error:", e);
    return NextResponse.json({ success: false, message: "Failed to save loading" }, { status: 500 });
  }
}

// export async function GET() {
//   try {
//     const loadings = await prisma.clientLoading.findMany({
//       where: {
//         packingAmounts: {
//           none: {}, // ✅ EXCLUDE already packed client loadings
//         },
//       },
//       include: {
//         items: {
//           select: {
//             id: true,
//             varietyCode: true,
//             noTrays: true,
//             trayKgs: true,
//             loose: true,
//             totalKgs: true,
//             pricePerKg: true,
//             totalPrice: true,
//           },
//         },
//         vehicle: { select: { vehicleNumber: true } },
//         dispatchCharges: {
//           select: { type: true, label: true, amount: true },
//           orderBy: { createdAt: "desc" },
//         },
//       },
//       orderBy: { date: "desc" },
//     });

//     const formatted = loadings.map((l) => {
//       const breakdown = {
//         iceCooling: 0,
//         transportCharges: 0,
//         otherCharges: [] as { label: string; amount: number }[],
//         dispatchChargesTotal: 0,
//       };

//       l.dispatchCharges.forEach((c) => {
//         const amt = Number(c.amount);
//         breakdown.dispatchChargesTotal += amt;

//         if (c.type === "ICE_COOLING") breakdown.iceCooling += amt;
//         else if (c.type === "TRANSPORT") breakdown.transportCharges += amt;
//         else if (c.type === "OTHER" && c.label)
//           breakdown.otherCharges.push({ label: c.label, amount: amt });
//       });

//       return {
//         ...l,
//         vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
//         vehicle: undefined,
//         dispatchBreakdown: breakdown,
//       };
//     });

//     return NextResponse.json({ success: true, data: formatted });
//   } catch (error) {
//     console.error("ClientLoading GET error:", error);
//     return NextResponse.json(
//       { success: false, message: "Failed to fetch data" },
//       { status: 500 }
//     );
//   }
// }
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const onlyUnpacked = searchParams.get("onlyUnpacked") === "true";

//     const whereClause: any = {};

//     // ✅ keep your old logic only when explicitly requested
//     if (onlyUnpacked) {
//       whereClause.packingAmounts = { none: {} };
//     }

//     const loadings = await prisma.clientLoading.findMany({
//       where: whereClause,
//       include: {
//         items: {
//           select: {
//             id: true,
//             varietyCode: true,
//             noTrays: true,
//             trayKgs: true,
//             loose: true,
//             totalKgs: true,
//             pricePerKg: true,
//             totalPrice: true,
//           },
//         },
//         vehicle: { select: { vehicleNumber: true } },
//         dispatchCharges: {
//           select: { type: true, label: true, amount: true },
//           orderBy: { createdAt: "desc" },
//         },
//       },
//       orderBy: { date: "desc" },
//     });

//     const formatted = loadings.map((l) => {
//       const breakdown = {
//         iceCooling: 0,
//         transportCharges: 0,
//         otherCharges: [] as { label: string; amount: number }[],
//         dispatchChargesTotal: 0,
//       };

//       l.dispatchCharges.forEach((c) => {
//         const amt = Number(c.amount);
//         breakdown.dispatchChargesTotal += amt;

//         if (c.type === "ICE_COOLING") breakdown.iceCooling += amt;
//         else if (c.type === "TRANSPORT") breakdown.transportCharges += amt;
//         else if (c.type === "OTHER" && c.label)
//           breakdown.otherCharges.push({ label: c.label, amount: amt });
//       });

//       return {
//         ...l,
//         vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
//         vehicle: undefined,
//         dispatchBreakdown: breakdown,
//       };
//     });

//     return NextResponse.json({ success: true, data: formatted });
//   } catch (error) {
//     console.error("ClientLoading GET error:", error);
//     return NextResponse.json(
//       { success: false, message: "Failed to fetch data" },
//       { status: 500 }
//     );
//   }
// }

type Stage = "PACKING_PENDING" | "DISPATCH_PENDING" | "PAYMENT_PENDING" | "ALL";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = (searchParams.get("stage") || "ALL") as Stage;

    const whereClause: any = {};

    // ✅ Stage filters
    if (stage === "PACKING_PENDING") {
      // packing not done yet
      whereClause.packingAmounts = { none: {} };
    }

    if (stage === "DISPATCH_PENDING") {
      // packing done, dispatch not done
      whereClause.AND = [
        { packingAmounts: { some: {} } },
        { dispatchCharges: { none: {} } },
      ];
    }

    if (stage === "PAYMENT_PENDING") {
      // packing done + dispatch done, payment not done
      // ⚠️ Change `clientPayments` to your real relation name in schema
      whereClause.AND = [
        { packingAmounts: { some: {} } },
        { dispatchCharges: { some: {} } },
        { clientPayments: { none: {} } },
      ];
    }

    const loadings = await prisma.clientLoading.findMany({
      where: whereClause,
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
        vehicle: { select: { vehicleNumber: true } },
        dispatchCharges: {
          select: { type: true, label: true, amount: true },
          orderBy: { createdAt: "desc" },
        },
        packingAmounts: {
          select: { id: true, totalAmount: true },
          orderBy: { createdAt: "desc" },
        },
        // ⚠️ Keep only if exists in schema
        // clientPayments: { select: { id: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { date: "desc" },
    });

    const formatted = loadings.map((l) => {
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
        vehicle: undefined,
        dispatchBreakdown: breakdown,

        // helpful flags for frontend
        packingDone: (l.packingAmounts?.length || 0) > 0,
        dispatchDone: (l.dispatchCharges?.length || 0) > 0,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("ClientLoading GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch data", details: error.message },
      { status: 500 }
    );
  }
}
