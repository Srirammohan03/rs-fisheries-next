// app\api\vendor-bills\add-item\route.ts
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { NextResponse } from "next/server";

const TRAY_KG = 35;
const PRICE_DEDUCTION_PERCENT = 5;

const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();

    const { source, loadingId, varietyCode, noTrays, loose, pricePerKg } =
      body as {
        source: "farmer" | "agent";
        loadingId: string;
        varietyCode: string;
        noTrays: number;
        loose: number;
        pricePerKg: number;
      };

    if (!source || !loadingId || !varietyCode) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const trays = Math.max(0, Math.floor(toNum(noTrays)));
    const looseKgs = Math.max(0, toNum(loose));
    const price = Math.max(0, toNum(pricePerKg));

    const trayKgs = trays * TRAY_KG;
    const totalKgs = round2(trayKgs + looseKgs);
    const gross = totalKgs * price;
    const totalPrice = Math.round(gross * (1 - PRICE_DEDUCTION_PERCENT / 100));

    const result = await prisma.$transaction(async (tx) => {
      /* ================= FARMER ================= */
      if (source === "farmer") {
        const loading = await tx.formerLoading.findUnique({
          where: { id: loadingId },
        });

        if (!loading) throw new Error("Farmer bill not found");

        const item = await tx.formerItem.create({
          data: {
            formerLoadingId: loadingId,
            varietyCode,
            noTrays: trays,
            trayKgs,
            loose: looseKgs,
            totalKgs,
            pricePerKg: price,
            totalPrice,
          },
          include: {
            loading: true,
          },
        });

        const items = await tx.formerItem.findMany({
          where: { formerLoadingId: loadingId },
        });

        const totalBillPrice = round2(
          items.reduce((s, i) => s + Number(i.totalPrice), 0)
        );

        await tx.formerLoading.update({
          where: { id: loadingId },
          data: {
            totalPrice: totalBillPrice,
            grandTotal: totalBillPrice,
          },
        });

        /* ---------- AUDIT : FARMER ITEM CREATE ---------- */
        await logAudit({
          user: (req as any).user,
          action: "CREATE",
          module: "Vendor Bill",
          recordId: item.id,
          request: req,
          oldValues: null,
          newValues: {
            source: "farmer",
            billNo: item.loading.billNo,
            name: item.loading.FarmerName,
            varietyCode,
            noTrays: trays,
            loose: looseKgs,
            totalKgs,
            pricePerKg: price,
            totalPrice,
          },
        });

        return item;
      }

      /* ================= AGENT ================= */

      const loading = await tx.agentLoading.findUnique({
        where: { id: loadingId },
      });

      if (!loading) throw new Error("Agent bill not found");

      const item = await tx.agentItem.create({
        data: {
          agentLoadingId: loadingId,
          varietyCode,
          noTrays: trays,
          trayKgs,
          loose: looseKgs,
          totalKgs,
          pricePerKg: price,
          totalPrice,
        },
        include: { loading: true },
      });

      const items = await tx.agentItem.findMany({
        where: { agentLoadingId: loadingId },
      });

      const totalBillPrice = round2(
        items.reduce((s, i) => s + Number(i.totalPrice), 0)
      );

      await tx.agentLoading.update({
        where: { id: loadingId },
        data: {
          totalPrice: totalBillPrice,
          grandTotal: totalBillPrice,
        },
      });

      /* ---------- AUDIT : AGENT ITEM CREATE ---------- */
      await logAudit({
        user: (req as any).user,
        action: "CREATE",
        module: "Vendor Bills",
        recordId: item.id,
        request: req,
        oldValues: null,
        newValues: {
          source: "agent",
          billNo: item.loading.billNo,
          name: item.loading.agentName,
          varietyCode,
          noTrays: trays,
          loose: looseKgs,
          totalKgs,
          pricePerKg: price,
          totalPrice,
        },
      });

      return item;
    });

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    console.error("ADD ITEM ERROR:", error);
    return NextResponse.json(
      { message: error.message || "Failed to add item" },
      { status: 500 }
    );
  }
});
