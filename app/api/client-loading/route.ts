// app/api/client-loading/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.clientName?.trim()) {
      return NextResponse.json({ success: false, message: "Client name required" }, { status: 400 });
    }

    if (!data.billNo) {
      return NextResponse.json({ success: false, message: "Bill number missing" }, { status: 400 });
    }

    const totalTrays = data.items?.reduce((a: number, i: any) => a + (Number(i.noTrays) || 0), 0) || 0;
    const totalTrayKgs = totalTrays * 35;
    const totalLooseKgs = data.items?.reduce((a: number, i: any) => a + (Number(i.loose) || 0), 0) || 0;
    const totalKgs = totalTrayKgs + totalLooseKgs;

    const saved = await prisma.clientLoading.create({
      data: {
        clientName: data.clientName.trim(),
        billNo: data.billNo,                    // ← from frontend
        date: new Date(data.date),
        vehicleNo: data.vehicleNo || "",
        fishCode: data.fishCode || "",
        totalTrays,
        totalLooseKgs,
        totalTrayKgs,
        totalKgs,
        totalPrice: 0,
        grandTotal: totalKgs,
        items: {
          create: data.items.map((i: any) => ({
            varietyCode: i.varietyCode || "",
            noTrays: Number(i.noTrays) || 0,
            trayKgs: (Number(i.noTrays) || 0) * 35,
            loose: Number(i.loose) || 0,
            totalKgs: (Number(i.noTrays) || 0) * 35 + (Number(i.loose) || 0),
            pricePerKg: 0,
            totalPrice: 0,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    console.error("Save error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Bill number already exists. Please refresh the page." },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, message: "Save failed" }, { status: 500 });
  }
}
// app/api/client-loading/route.ts → Add this GET

export async function GET() {
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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: loadings });
  } catch (error) {
    console.error("Fetch failed:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}