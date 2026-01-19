// app/api/client-bills/item/route.ts
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { NextResponse } from "next/server";

const TRAY_KG = 35;
const DEDUCTION_PERCENT = 5;

export const POST = withAuth(async (req: Request) => {
  try {
    const body = (await req.json()) as {
      loadingId?: string;
      varietyCode?: string;
      noTrays?: number;
      loose?: number;
    };

    const loadingId = (body.loadingId || "").trim();
    const varietyCode = (body.varietyCode || "").trim();
    const noTrays = Math.max(0, Number(body.noTrays ?? 0));
    const loose = Math.max(0, Number(body.loose ?? 0));

    if (!loadingId)
      return NextResponse.json(
        { message: "loadingId is required" },
        { status: 400 }
      );
    if (!varietyCode)
      return NextResponse.json(
        { message: "varietyCode is required" },
        { status: 400 }
      );
    if (noTrays <= 0 && loose <= 0)
      return NextResponse.json(
        { message: "Enter trays or loose" },
        { status: 400 }
      );

    const trayKgs = noTrays * TRAY_KG;
    const totalKgs = trayKgs + loose;

    const loading = await prisma.clientLoading.findUnique({
      where: { id: loadingId },
      include: { items: true, vehicle: { select: { vehicleNumber: true } } },
    });
    if (!loading)
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });

    // ✅ stock check for adding
    const [formerAgg, agentAgg, usedAgg] = await Promise.all([
      prisma.formerItem.aggregate({
        where: { varietyCode },
        _sum: { totalKgs: true },
      }),
      prisma.agentItem.aggregate({
        where: { varietyCode },
        _sum: { totalKgs: true },
      }),
      prisma.clientItem.aggregate({
        where: { varietyCode },
        _sum: { totalKgs: true },
      }),
    ]);

    const incoming =
      Number(formerAgg._sum.totalKgs || 0) +
      Number(agentAgg._sum.totalKgs || 0);
    const used = Number(usedAgg._sum.totalKgs || 0);
    const available = Math.max(0, incoming - used);

    if (totalKgs > available) {
      return NextResponse.json(
        {
          message: `Stock exceeded for ${varietyCode}. Available ${available.toFixed(
            2
          )} Kgs`,
        },
        { status: 400 }
      );
    }

    // ✅ transaction: create item + recompute totals
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.clientItem.create({
        data: {
          clientLoadingId: loadingId,
          varietyCode,
          noTrays,
          loose,
          trayKgs,
          totalKgs,
          pricePerKg: 0,
          totalPrice: 0,
        },
      });

      const updatedLoading = await tx.clientLoading.findUnique({
        where: { id: loadingId },
        include: { items: true, vehicle: { select: { vehicleNumber: true } } },
      });
      if (!updatedLoading) throw new Error("Loading missing after create");

      const hasVehicle =
        Boolean(updatedLoading.vehicleId) ||
        Boolean((updatedLoading.vehicleNo || "").trim()) ||
        Boolean((updatedLoading.vehicle?.vehicleNumber || "").trim());

      const totalTrays = updatedLoading.items.reduce(
        (s, i) => s + Number(i.noTrays || 0),
        0
      );
      const totalKgsAll = updatedLoading.items.reduce(
        (s, i) => s + Number(i.totalKgs || 0),
        0
      );

      const grandTotal = hasVehicle
        ? Number(totalKgsAll.toFixed(2))
        : Number((totalKgsAll * (1 - DEDUCTION_PERCENT / 100)).toFixed(2));

      // recompute each item totalPrice based on effectiveKgs
      const updates = updatedLoading.items.map((it) => {
        const itemKgs = Number(it.totalKgs || 0);
        const effectiveKgs =
          totalKgsAll > 0
            ? Number(((itemKgs / totalKgsAll) * grandTotal).toFixed(3))
            : itemKgs;
        const price = Number(it.pricePerKg || 0);
        const totalPrice = Number((effectiveKgs * price).toFixed(2));
        return { id: it.id, totalPrice };
      });

      const totalPrice = updates.reduce(
        (s, u) => s + Number(u.totalPrice || 0),
        0
      );

      for (const u of updates) {
        await tx.clientItem.update({
          where: { id: u.id },
          data: { totalPrice: u.totalPrice },
        });
      }

      const client = await tx.clientLoading.update({
        where: { id: loadingId },
        data: { totalTrays, totalKgs: totalKgsAll, grandTotal, totalPrice },
      });

      await logAudit({
        user: (req as any).user,
        action: "CREATE",
        module: "Client Bills",
        recordId: created.id,
        request: req,
        oldValues: null,
        newValues: {
          billNo: client.billNo,
          clientName: client.clientName,
          varietyCode,
          noTrays,
          loose,
          trayKgs,
          totalKgs,
          vehicleNumber:
            updatedLoading.vehicle?.vehicleNumber ??
            updatedLoading.vehicleNo ??
            null,
        },
      });

      return { created };
    });

    return NextResponse.json(
      { success: true, item: result.created },
      { status: 201 }
    );
  } catch (e) {
    console.error("Add client bill item error:", e);
    return NextResponse.json(
      { message: "Failed to add item" },
      { status: 500 }
    );
  }
});
