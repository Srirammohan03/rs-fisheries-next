import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;

type Params = {
    id: string;
};

type GroupedResult = {
    varietyCode: string;
    _sum: { totalKgs: number | null };
};

async function getNetKgsByCodes(codes: string[]) {
    const [former, agent, client] = await Promise.all([
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

    const map = (arr: GroupedResult[]) =>
        Object.fromEntries(
            arr.map((x) => [x.varietyCode, Number(x._sum.totalKgs ?? 0)])
        );

    const f = map(former as GroupedResult[]);
    const a = map(agent as GroupedResult[]);
    const c = map(client as GroupedResult[]);

    const net: Record<string, number> = {};
    for (const code of codes) {
        net[code] = Math.max(0, (f[code] || 0) + (a[code] || 0) - (c[code] || 0));
    }
    return net;
}

/* ================= PATCH ================= */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<Params> }
) {
    const { id } = await params; // ✅ REQUIRED IN NEXT 16

    if (!id) {
        return NextResponse.json({ message: "Item ID required" }, { status: 400 });
    }

    try {
        const body = (await request.json()) as {
            noTrays?: number;
            loose?: number;
            pricePerKg?: number;
        };

        const existing = await prisma.clientItem.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ message: "Item not found" }, { status: 404 });
        }

        const nextTrays =
            body.noTrays !== undefined
                ? Math.max(0, Number(body.noTrays) || 0)
                : existing.noTrays;

        const nextLoose =
            body.loose !== undefined
                ? Math.max(0, Number(body.loose) || 0)
                : Number(existing.loose);

        const trayKgs = nextTrays * TRAY_KG;
        const nextTotalKgs = trayKgs + nextLoose;

        // stock validation
        const varietyCode = existing.varietyCode;

        const used = await prisma.clientItem.aggregate({
            where: { varietyCode, id: { not: id } },
            _sum: { totalKgs: true },
        });
        const usedByOthers = Number(used._sum.totalKgs ?? 0);
        const netMap = await getNetKgsByCodes([varietyCode]);
        const baseAvailable = netMap[varietyCode] || 0;

        // ✅ add back current item stock (important)
        const effectiveAvailable =
            baseAvailable + Number(existing.totalKgs || 0);

        if (usedByOthers + nextTotalKgs > effectiveAvailable) {
            return NextResponse.json(
                {
                    message: `Stock exceeded for ${varietyCode}. Available ${effectiveAvailable.toFixed(
                        2
                    )} Kgs`,
                },
                { status: 400 }
            );
        }


        const updated = await prisma.clientItem.update({
            where: { id },
            data: {
                noTrays: body.noTrays !== undefined ? nextTrays : undefined,
                loose: body.loose !== undefined ? nextLoose : undefined,
                trayKgs,
                totalKgs: nextTotalKgs,
                pricePerKg:
                    body.pricePerKg !== undefined
                        ? Math.max(0, Number(body.pricePerKg) || 0)
                        : undefined,
            },
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (err) {
        console.error("PATCH client item failed:", err);
        return NextResponse.json({ message: "Update failed" }, { status: 500 });
    }
}

/* ================= DELETE ================= */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<Params> }
) {
    const { id } = await params; // ✅ REQUIRED

    if (!id) {
        return NextResponse.json({ message: "Item ID required" }, { status: 400 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.clientItem.findUnique({ where: { id } });
            if (!item) return null;

            await tx.clientItem.delete({ where: { id } });

            const remaining = await tx.clientItem.count({
                where: { clientLoadingId: item.clientLoadingId },
            });

            if (remaining === 0) {
                await tx.clientLoading.delete({
                    where: { id: item.clientLoadingId },
                });
                return { deletedBill: true };
            }

            return { deletedBill: false };
        });

        if (!result) {
            return NextResponse.json({ message: "Item not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error("DELETE client item failed:", err);
        return NextResponse.json({ message: "Delete failed" }, { status: 500 });
    }
}
