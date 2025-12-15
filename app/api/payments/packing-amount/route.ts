// app/api/payments/packing-amount/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            mode,
            sourceRecordId,
            workers,
            temperature,
            totalAmount,
            paymentMode = "CASH",
            reference,
        } = body;

        // Validation
        if (!mode || workers == null || temperature == null || totalAmount == null) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!["loading", "unloading"].includes(mode)) {
            return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
        }

        if (!["CASH", "AC", "UPI", "CHEQUE"].includes(paymentMode)) {
            return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 });
        }

        if (paymentMode !== "CASH" && !reference?.trim()) {
            return NextResponse.json({ error: "Reference required for non-cash payment" }, { status: 400 });
        }

        const currentYear = new Date().getFullYear() % 100;
        const shortYear = currentYear.toString().padStart(2, "0");

        // Counter logic
        let counter = await prisma.invoiceCounter.findUnique({ where: { id: 1 } });
        if (!counter) {
            counter = await prisma.invoiceCounter.create({
                data: { id: 1, packingCount: 0, packingYear: currentYear },
            });
        }

        let nextCount = (counter.packingCount ?? 0) + 1;
        if (counter.packingYear !== currentYear) {
            nextCount = 1;
        }

        const seq = nextCount.toString().padStart(4, "0");
        const billNo = `RS-PACKING-${shortYear}-${seq}`;

        const packing = await prisma.packingAmount.create({
            data: {
                mode,
                sourceRecordId: sourceRecordId || null,
                workers: Number(workers),
                temperature: Number(temperature),
                totalAmount: Number(totalAmount),
                paymentMode: paymentMode as any,
                reference: reference?.trim() || null,
                billNo,
            },
            include: { createdBy: { select: { name: true } } },
        });

        await prisma.invoiceCounter.update({
            where: { id: 1 },
            data: { packingCount: nextCount, packingYear: currentYear },
        });

        return NextResponse.json({ success: true, data: packing }, { status: 201 });
    } catch (error: any) {
        console.error("Packing amount error:", error);
        return NextResponse.json({ error: "Failed to save", details: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const records = await prisma.packingAmount.findMany({
            orderBy: { createdAt: "desc" },
        });

        const data = await Promise.all(
            records.map(async (r) => {
                let partyName: string | null = null;
                let vehicleNo: string | null = null;

                if (r.sourceRecordId) {
                    if (r.mode === "loading") {
                        const client = await prisma.clientLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: {
                                clientName: true,
                                vehicle: { select: { vehicleNumber: true } },
                            },
                        });

                        partyName = client?.clientName || null;
                        vehicleNo = client?.vehicle?.vehicleNumber || null;
                    } else {
                        const farmer = await prisma.formerLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: {
                                FarmerName: true,
                                vehicle: { select: { vehicleNumber: true } },
                            },
                        });

                        const agent = await prisma.agentLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: {
                                agentName: true,
                                vehicle: { select: { vehicleNumber: true } },
                            },
                        });

                        partyName =
                            farmer?.FarmerName ||
                            agent?.agentName ||
                            null;

                        vehicleNo =
                            farmer?.vehicle?.vehicleNumber ||
                            agent?.vehicle?.vehicleNumber ||
                            null;
                    }
                }

                return {
                    id: r.id,
                    date: r.createdAt,
                    amount: r.totalAmount,
                    mode: r.mode,
                    workers: r.workers,
                    temperature: r.temperature,
                    billNo: r.billNo,
                    paymentMode: r.paymentMode,
                    reference: r.reference,
                    partyName,
                    vehicleNo, // ✅ IMPORTANT
                };
            })
        );

        return NextResponse.json({ data });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}
