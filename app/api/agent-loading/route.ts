// app/api/agent-loading/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const data = await req.json();

        // ---------- VALIDATIONS ----------
        if (!data.vehicleNo?.trim()) {
            return NextResponse.json(
                { success: false, message: "Vehicle is required" },
                { status: 400 }
            );
        }

        if (!data.agentName?.trim()) {
            return NextResponse.json(
                { success: false, message: "Agent name is required" },
                { status: 400 }
            );
        }

        if (!data.billNo?.trim()) {
            return NextResponse.json(
                { success: false, message: "Bill number is required" },
                { status: 400 }
            );
        }

        if (!Array.isArray(data.items) || data.items.length === 0) {
            return NextResponse.json(
                { success: false, message: "At least one item is required" },
                { status: 400 }
            );
        }

        // ---------- VEHICLE NORMALIZATION ----------
        const normalized = data.vehicleNo
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "");

        const vehicles = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM "Vehicle"
      WHERE REPLACE(UPPER("vehicleNumber"), ' ', '') = ${normalized}
      LIMIT 1
    `;

        if (!vehicles.length) {
            return NextResponse.json(
                { success: false, message: `Vehicle ${data.vehicleNo} not found` },
                { status: 400 }
            );
        }

        // ---------- SAVE ----------
        const saved = await prisma.agentLoading.create({
            data: {
                fishCode: data.fishCode || "NA",
                agentName: data.agentName.trim(),
                billNo: data.billNo.trim(),
                village: data.village?.trim() || "",
                date: new Date(data.date),

                vehicle: {
                    connect: { id: vehicles[0].id },
                },

                totalTrays: Number(data.totalTrays) || 0,
                totalLooseKgs: Number(data.totalLooseKgs) || 0,
                totalTrayKgs: Number(data.totalTrayKgs) || 0,
                totalKgs: Number(data.totalKgs) || 0,
                totalPrice: 0,
                grandTotal: Number(data.grandTotal) || 0,

                items: {
                    create: data.items.map((item: any) => ({
                        varietyCode: item.varietyCode,
                        noTrays: Number(item.noTrays) || 0,
                        trayKgs: (Number(item.noTrays) || 0) * 35,
                        loose: Number(item.loose) || 0,
                        totalKgs:
                            (Number(item.noTrays) || 0) * 35 +
                            (Number(item.loose) || 0),
                        pricePerKg: 0,
                        totalPrice: 0,
                    })),
                },
            },
            include: { items: true },
        });

        return NextResponse.json({ success: true, loading: saved });
    } catch (error) {
        console.error("Error saving agent loading:", error);
        return NextResponse.json(
            { success: false, message: "Failed to save agent loading" },
            { status: 500 }
        );
    }
}


export async function GET() {
    try {
        const loadings = await prisma.agentLoading.findMany({
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
                vehicle: {
                    select: {
                        vehicleNumber: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        type AgentLoadingWithVehicle = typeof loadings[number];

        const formatted = loadings.map((l: AgentLoadingWithVehicle) => ({
            ...l,
            vehicleNo: l.vehicle?.vehicleNumber ?? "",
        }));


        return NextResponse.json({ data: formatted });
    } catch (error) {
        console.error("Error fetching agent loadings:", error);
        return NextResponse.json(
            { message: "Failed to fetch agent loadings" },
            { status: 500 }
        );
    }
}
