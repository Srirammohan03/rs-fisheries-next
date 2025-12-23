// app/api/agent-loading/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_WEIGHT = 35;
const DEDUCTION_PERCENT = 5;

export async function POST(req: Request) {
    try {
        const data = await req.json();

        // ---------- VALIDATIONS ----------
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

        // Date validation
        const loadingDate = data.date ? new Date(data.date) : new Date();
        if (isNaN(loadingDate.getTime())) {
            return NextResponse.json(
                { success: false, message: "Invalid date provided" },
                { status: 400 }
            );
        }

        // Vehicle: either dropdown vehicleId OR otherVehicleNo
        const vehicleId: string | null =
            typeof data.vehicleId === "string" && data.vehicleId.trim()
                ? data.vehicleId.trim()
                : null;

        const vehicleNo: string | null =
            typeof data.vehicleNo === "string" && data.vehicleNo.trim()
                ? data.vehicleNo.trim()
                : null;

        if (!vehicleId && !vehicleNo) {
            return NextResponse.json(
                { success: false, message: "Vehicle is required" },
                { status: 400 }
            );
        }

        // ---------- Compute totals from items ----------
        const items = data.items.map((item: any) => {
            const trays = Number(item.noTrays) || 0;
            const loose = Number(item.loose) || 0;
            const totalKgs = trays * TRAY_WEIGHT + loose;

            return {
                varietyCode: item.varietyCode,
                noTrays: trays,
                trayKgs: trays * TRAY_WEIGHT,
                loose,
                totalKgs,
                pricePerKg: 0,
                totalPrice: 0,
            };
        });

        const totalTrays = items.reduce((sum: number, i: any) => sum + i.noTrays, 0);
        const totalLooseKgs = items.reduce((sum: number, i: any) => sum + i.loose, 0);
        const totalTrayKgs = items.reduce((sum: number, i: any) => sum + i.trayKgs, 0);
        const totalKgs = items.reduce((sum: number, i: any) => sum + i.totalKgs, 0);

        // ✅ Apply 5% deduction on totalKgs
        const grandTotal = Number(
            (totalKgs * (1 - DEDUCTION_PERCENT / 100)).toFixed(2)
        );

        // ---------- SAVE ----------
        const createData: any = {
            fishCode: data.fishCode || "NA",
            agentName: data.agentName.trim(),
            billNo: data.billNo.trim(),
            village: data.village?.trim() || "",
            date: loadingDate,

            totalTrays,
            totalLooseKgs,
            totalTrayKgs,
            totalKgs,
            totalPrice: 0,
            grandTotal,

            items: { create: items },
        };

        // ✅ connect if dropdown vehicleId provided, else store vehicleNo
        if (vehicleId) {
            createData.vehicle = { connect: { id: vehicleId } };
            createData.vehicleNo = null;
        } else {
            createData.vehicleNo = vehicleNo;
            // do not set vehicle/vehicleId
        }

        const saved = await prisma.agentLoading.create({
            data: createData,
            include: {
                items: true,
                vehicle: { select: { vehicleNumber: true } },
            },
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
                vehicle: { select: { vehicleNumber: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const formatted = loadings.map((l) => ({
            ...l,
            // ✅ prefer connected vehicle number else custom vehicleNo
            vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
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
