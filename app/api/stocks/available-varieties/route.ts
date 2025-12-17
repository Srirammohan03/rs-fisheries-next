// app/api/stocks/available-varieties/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TRAY_KG = 35;

export async function GET() {
    try {
        const [vars, inFormer, inAgent, outClient] = await Promise.all([
            prisma.fishVariety.findMany({
                orderBy: { name: "asc" },
                select: { code: true, name: true },
            }),

            prisma.formerItem.groupBy({
                by: ["varietyCode"],
                _sum: { totalKgs: true },
            }),

            prisma.agentItem.groupBy({
                by: ["varietyCode"],
                _sum: { totalKgs: true },
            }),

            prisma.clientItem.groupBy({
                by: ["varietyCode"],
                _sum: { totalKgs: true },
            }),
        ]);

        const formerMap = Object.fromEntries(
            inFormer.map((x) => [x.varietyCode, Number(x._sum.totalKgs || 0)])
        );
        const agentMap = Object.fromEntries(
            inAgent.map((x) => [x.varietyCode, Number(x._sum.totalKgs || 0)])
        );
        const clientMap = Object.fromEntries(
            outClient.map((x) => [x.varietyCode, Number(x._sum.totalKgs || 0)])
        );

        const data = vars.map((v) => {
            const incoming = (formerMap[v.code] || 0) + (agentMap[v.code] || 0);
            const outgoing = clientMap[v.code] || 0;

            const netKgs = Math.max(0, incoming - outgoing);
            const netTrays = Math.floor(netKgs / TRAY_KG); // ✅ convert to trays

            return { ...v, netKgs, netTrays };
        });

        // ✅ only return varieties that have at least 1 tray available
        const available = data.filter((x) => x.netTrays > 0);

        return NextResponse.json({ success: true, data: available });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { success: false, message: "Failed to load available varieties" },
            { status: 500 }
        );
    }
}
