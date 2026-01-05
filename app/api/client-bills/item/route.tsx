// app\api\client-bills\item\route.tsx
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const loadingId = String(body.loadingId || "");
    const varietyCode = String(body.varietyCode || "");
    const noTrays = Math.max(0, Number(body.noTrays ?? 0));
    const loose = Math.max(0, Number(body.loose ?? 0));

    if (!loadingId) {
      return NextResponse.json(
        { message: "loadingId is required" },
        { status: 400 }
      );
    }
    if (!varietyCode) {
      return NextResponse.json(
        { message: "varietyCode is required" },
        { status: 400 }
      );
    }
    if (noTrays <= 0 && loose <= 0) {
      return NextResponse.json(
        { message: "Enter trays or loose" },
        { status: 400 }
      );
    }

    const trayKgs = noTrays * TRAY_KG;
    const totalKgs = trayKgs + loose;

    // ensure bill exists
    const bill = await prisma.clientLoading.findUnique({
      where: { id: loadingId },
      select: { id: true },
    });

    if (!bill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    const created = await prisma.clientItem.create({
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

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (e) {
    console.error("Add client bill item error:", e);
    return NextResponse.json(
      { message: "Failed to add item" },
      { status: 500 }
    );
  }
}
