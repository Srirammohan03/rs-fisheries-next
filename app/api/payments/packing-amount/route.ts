// app/api/payments/packing-amount/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMode, DispatchSourceType } from "@prisma/client";

export const runtime = "nodejs";

function asString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function asPositiveNumber(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
}

function asPositiveInt(value: unknown): number | null {
    const num = Number(value);
    return Number.isInteger(num) && num > 0 ? num : null;
}

interface Counter {
    packingCount: number;
    packingYear: number;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            mode,
            sourceType,
            sourceRecordId,
            workers,
            temperature,
            totalAmount,
            paymentMode = "CASH",
            reference,
        } = body;

        if (!mode || !["loading", "unloading"].includes(mode)) {
            return NextResponse.json(
                { error: "Invalid or missing mode. Must be 'loading' or 'unloading'" },
                { status: 400 }
            );
        }

        const workersCount = asPositiveInt(workers);
        const temp = asPositiveNumber(temperature);
        const amount = asPositiveNumber(totalAmount);

        if (!workersCount || !temp || !amount) {
            return NextResponse.json(
                { error: "workers, temperature, and totalAmount must be positive numbers" },
                { status: 400 }
            );
        }

        if (!Object.values(PaymentMode).includes(paymentMode)) {
            return NextResponse.json(
                { error: "Invalid paymentMode. Allowed: CASH, AC, UPI, CHEQUE" },
                { status: 400 }
            );
        }

        const ref = asString(reference);
        // if (paymentMode !== "CASH" && !ref) {
        //     return NextResponse.json(
        //         { error: "reference is required for non-CASH payments" },
        //         { status: 400 }
        //     );
        // }

        let validatedSourceType: DispatchSourceType | undefined = undefined;
        let validatedSourceId: string | undefined = undefined;

        if (sourceType || sourceRecordId) {
            if (!sourceType || !Object.values(DispatchSourceType).includes(sourceType as any)) {
                return NextResponse.json(
                    { error: "Invalid sourceType. Must be FORMER, AGENT, or CLIENT" },
                    { status: 400 }
                );
            }
            if (!sourceRecordId) {
                return NextResponse.json(
                    { error: "sourceRecordId required when sourceType is provided" },
                    { status: 400 }
                );
            }

            validatedSourceType = sourceType as DispatchSourceType;
            validatedSourceId = asString(sourceRecordId);

            let exists = false;
            if (validatedSourceType === DispatchSourceType.FORMER) {
                exists = !!await prisma.formerLoading.findUnique({ where: { id: validatedSourceId } });
            } else if (validatedSourceType === DispatchSourceType.AGENT) {
                exists = !!await prisma.agentLoading.findUnique({ where: { id: validatedSourceId } });
            } else if (validatedSourceType === DispatchSourceType.CLIENT) {
                exists = !!await prisma.clientLoading.findUnique({ where: { id: validatedSourceId } });
            }

            if (!exists) {
                return NextResponse.json(
                    { error: `Linked ${validatedSourceType.toLowerCase()} loading not found` },
                    { status: 404 }
                );
            }
        }

        const currentYear = new Date().getFullYear() % 100;
        const shortYear = currentYear.toString().padStart(2, "0");

        const counter = await prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<Array<Counter>>`SELECT "packingCount", "packingYear" FROM "InvoiceCounter" WHERE "id" = 1 FOR UPDATE`;

            if (rows.length === 0) {
                await tx.$executeRaw`INSERT INTO "InvoiceCounter" ("id", "packingCount", "packingYear") VALUES (1, 1, ${currentYear})`;
                return { packingCount: 1, packingYear: currentYear };
            } else {
                const record = rows[0];
                let nextCount = record.packingCount + 1;
                let newYear = record.packingYear;

                if (record.packingYear !== currentYear) {
                    nextCount = 1;
                    newYear = currentYear;
                }

                await tx.$executeRaw`UPDATE "InvoiceCounter" SET "packingCount" = ${nextCount}, "packingYear" = ${newYear} WHERE "id" = 1`;
                return { packingCount: nextCount, packingYear: newYear };
            }
        });

        const seq = counter.packingCount.toString().padStart(4, "0");
        const billNo = `RS-PACKING-${shortYear}-${seq}`;

        const data: any = {
            billNo,
            mode,
            sourceType: validatedSourceType,
            sourceRecordId: validatedSourceId,
            workers: workersCount,
            temperature: temp,
            totalAmount: amount,
            paymentMode: paymentMode as PaymentMode,
            reference: ref || null,
        };

        if (validatedSourceType === DispatchSourceType.FORMER) {
            data.formerLoadingId = validatedSourceId;
        } else if (validatedSourceType === DispatchSourceType.AGENT) {
            data.agentLoadingId = validatedSourceId;
        } else if (validatedSourceType === DispatchSourceType.CLIENT) {
            data.clientLoadingId = validatedSourceId;
        }

        const packing = await prisma.packingAmount.create({
            data,
            include: {
                createdBy: { select: { id: true, } },
            },
        });

        return NextResponse.json(
            { success: true, data: packing },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("PackingAmount POST error:", error);
        return NextResponse.json(
            { error: "Failed to create packing amount", details: error.message },
            { status: 500 }
        );
    }
}

// app/api/payments/packing-amount/route.ts
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const sourceType = searchParams.get("sourceType") as DispatchSourceType | null;
        const sourceRecordId = searchParams.get("sourceRecordId");

        const where: any = {};
        if (sourceType) where.sourceType = sourceType;
        if (sourceRecordId) where.sourceRecordId = sourceRecordId;

        const records = await prisma.packingAmount.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        employee: {
                            select: {
                                fullName: true,
                                employeeId: true,
                            },
                        },
                    },
                },
            },
        });

        const enriched = await Promise.all(
            records.map(async (r) => {
                let partyName: string | null = null;
                let vehicleNo: string | null = null;

                if (r.sourceRecordId && r.sourceType) {
                    if (r.sourceType === "CLIENT") {
                        const client = await prisma.clientLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: {
                                clientName: true,
                                vehicle: { select: { vehicleNumber: true } },
                            },
                        });
                        partyName = client?.clientName ?? null;
                        vehicleNo = client?.vehicle?.vehicleNumber ?? null;
                    }

                    if (r.sourceType === "FORMER") {
                        const former = await prisma.formerLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: {
                                FarmerName: true,
                                vehicle: { select: { vehicleNumber: true } },
                            },
                        });
                        partyName = former?.FarmerName ?? null;
                        vehicleNo = former?.vehicle?.vehicleNumber ?? null;
                    }

                    if (r.sourceType === "AGENT") {
                        const agent = await prisma.agentLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: {
                                agentName: true,
                                vehicle: { select: { vehicleNumber: true } },
                            },
                        });
                        partyName = agent?.agentName ?? null;
                        vehicleNo = agent?.vehicle?.vehicleNumber ?? null;
                    }
                }

                return {
                    ...r,
                    createdByName: r.createdBy?.employee?.fullName ?? null,
                    partyName,
                    vehicleNo,
                };
            })
        );

        return NextResponse.json({ success: true, data: enriched });
    } catch (error: any) {
        console.error("PackingAmount GET error:", error);
        return NextResponse.json(
            { error: "Failed to fetch packing amounts", details: error.message },
            { status: 500 }
        );
    }
}
