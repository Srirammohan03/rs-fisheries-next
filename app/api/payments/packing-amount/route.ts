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

        // Validate mode
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

        // Validate paymentMode
        if (!Object.values(PaymentMode).includes(paymentMode)) {
            return NextResponse.json(
                { error: "Invalid paymentMode. Allowed: CASH, AC, UPI, CHEQUE" },
                { status: 400 }
            );
        }

        const ref = asString(reference);
        if (paymentMode !== "CASH" && !ref) {
            return NextResponse.json(
                { error: "reference is required for non-CASH payments" },
                { status: 400 }
            );
        }

        // Validate sourceType + sourceRecordId if provided
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

            // Verify loading exists
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

        // ========== BILL NUMBER GENERATION (AUDIT-SAFE, NO REUSE) ==========
        const currentYear = new Date().getFullYear() % 100;
        const shortYear = currentYear.toString().padStart(2, "0");

        // Get or create counter
        let counter = await prisma.invoiceCounter.findUnique({ where: { id: 1 } });

        if (!counter) {
            counter = await prisma.invoiceCounter.create({
                data: { id: 1, packingCount: 0, packingYear: currentYear },
            });
        }

        // Determine next number
        let nextCount = counter.packingCount + 1;

        // Reset only if year changed
        if (counter.packingYear !== currentYear) {
            nextCount = 1;
        }

        const seq = nextCount.toString().padStart(4, "0");
        const billNo = `RS-PACKING-${shortYear}-${seq}`;

        // Prepare data
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

        // Set dedicated foreign key
        if (validatedSourceType === DispatchSourceType.FORMER) {
            data.formerLoadingId = validatedSourceId;
        } else if (validatedSourceType === DispatchSourceType.AGENT) {
            data.agentLoadingId = validatedSourceId;
        } else if (validatedSourceType === DispatchSourceType.CLIENT) {
            data.clientLoadingId = validatedSourceId;
        }

        // Create record
        const packing = await prisma.packingAmount.create({
            data,
            include: {
                createdBy: { select: { name: true, email: true } },
            },
        });

        // Always increment counter (even if record is later deleted)
        await prisma.invoiceCounter.update({
            where: { id: 1 },
            data: {
                packingCount: nextCount,
                packingYear: currentYear,
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

// GET remains unchanged — it's already perfect
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
                createdBy: { select: { name: true } },
            },
        });

        const enriched = await Promise.all(
            records.map(async (r) => {
                let partyName: string | null = null;
                let vehicleNo: string | null = null;

                if (r.sourceRecordId && r.sourceType) {
                    if (r.sourceType === DispatchSourceType.CLIENT && r.mode === "loading") {
                        const client = await prisma.clientLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: { clientName: true, vehicle: { select: { vehicleNumber: true } } },
                        });
                        partyName = client?.clientName ?? null;
                        vehicleNo = client?.vehicle?.vehicleNumber ?? null;
                    } else if (r.sourceType === DispatchSourceType.FORMER) {
                        const former = await prisma.formerLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: { FarmerName: true, vehicle: { select: { vehicleNumber: true } } },
                        });
                        partyName = former?.FarmerName ?? null;
                        vehicleNo = former?.vehicle?.vehicleNumber ?? null;
                    } else if (r.sourceType === DispatchSourceType.AGENT) {
                        const agent = await prisma.agentLoading.findUnique({
                            where: { id: r.sourceRecordId },
                            select: { agentName: true, vehicle: { select: { vehicleNumber: true } } },
                        });
                        partyName = agent?.agentName ?? null;
                        vehicleNo = agent?.vehicle?.vehicleNumber ?? null;
                    }
                }

                return {
                    ...r,
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