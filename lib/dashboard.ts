// lib/dashboard.ts
import { prisma } from "@/lib/prisma";

export type DashboardMetrics = {
    today: {
        sales: number;
        purchase: number;
        pendingShipments: number;
        outstanding: number;
    };
    weekly: { label: string; purchase: number; sales: number }[];
    movement: { label: string; purchase: number; sales: number }[];
    topVarieties: { code: string; kgs: number }[];
    outstandingAgeing: { bucket: string; amount: number }[];
    fishVarieties: { code: string; name: string }[];
};

function startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function endOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

function startOfWeek(d = new Date()) {
    const x = startOfDay(d);
    x.setDate(x.getDate() - x.getDay()); // Sunday start
    return x;
}

function endOfWeek(d = new Date()) {
    const x = endOfDay(d);
    x.setDate(x.getDate() + (6 - x.getDay()));
    return x;
}

function startOfMonth(d = new Date()) {
    const x = startOfDay(d);
    x.setDate(1);
    return x;
}

function endOfMonth(d = new Date()) {
    const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return endOfDay(x);
}

function addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

function addWeeks(d: Date, n: number) {
    return addDays(d, n * 7);
}

function addMonths(d: Date, n: number) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n);
    return x;
}

function diffDays(a: Date, b: Date) {
    const ms = Math.abs(startOfDay(a).getTime() - startOfDay(b).getTime());
    return Math.floor(ms / 86400000);
}

function dayLabel(d: Date) {
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

function weekLabel(d: Date) {
    const start = startOfWeek(d);
    const end = endOfWeek(d);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function monthLabel(d: Date) {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export async function getDashboardMetrics(
    range: { from: Date; to: Date },
    agg: "day" | "week" | "month" = "day"
): Promise<DashboardMetrics> {
    const now = new Date();
    const from = startOfDay(range.from || addDays(now, -6));
    const to = endOfDay(range.to || now);

    // Aggregated sums for range
    const [salesAgg, formerAgg, agentAgg, paymentsAgg, clientLoadings, clientItems, fishVars] = await Promise.all([
        prisma.clientLoading.aggregate({
            where: { date: { gte: from, lte: to } },
            _sum: { totalPrice: true },
            _count: true,
        }),
        prisma.formerLoading.aggregate({
            where: { date: { gte: from, lte: to } },
            _sum: { totalPrice: true },
        }),
        prisma.agentLoading.aggregate({
            where: { date: { gte: from, lte: to } },
            _sum: { totalPrice: true },
        }),
        prisma.clientPayment.aggregate({
            where: { date: { gte: from, lte: to } },
            _sum: { amount: true },
        }),
        prisma.clientLoading.findMany({
            where: { date: { gte: from, lte: to } },
            select: { id: true, date: true, totalPrice: true },
        }),
        prisma.clientItem.findMany({
            where: { loading: { date: { gte: from, lte: to } } },
            select: { varietyCode: true, totalKgs: true },
        }),
        prisma.fishVariety.findMany({
            select: { code: true, name: true },
            orderBy: { code: "asc" },
        }),
    ]);

    const fishVarieties = fishVars;
    const sales = Number(salesAgg._sum.totalPrice || 0);
    const purchase = Number(formerAgg._sum.totalPrice || 0) + Number(agentAgg._sum.totalPrice || 0);
    const pendingShipments = salesAgg._count;
    const paid = Number(paymentsAgg._sum.amount || 0);
    const outstanding = Math.max(0, sales - paid);

    // Series data
    const [salesRows, formerRows, agentRows, paymentRows] = await Promise.all([
        prisma.clientLoading.findMany({
            where: { date: { gte: from, lte: to } },
            select: { date: true, totalPrice: true },
        }),
        prisma.formerLoading.findMany({
            where: { date: { gte: from, lte: to } },
            select: { date: true, totalPrice: true },
        }),
        prisma.agentLoading.findMany({
            where: { date: { gte: from, lte: to } },
            select: { date: true, totalPrice: true },
        }),
        prisma.clientPayment.findMany({
            where: { date: { gte: from, lte: to } },
            select: { date: true, amount: true, clientId: true },
        }),
    ]);

    let buckets: { label: string; start: Date; end: Date }[] = [];
    if (agg === "month") {
        let current = startOfMonth(from);
        while (current <= to) {
            buckets.push({
                label: monthLabel(current),
                start: startOfMonth(current),
                end: endOfMonth(current),
            });
            current = addMonths(current, 1);
        }
    } else if (agg === "week") {
        let current = startOfWeek(from);
        while (current <= to) {
            buckets.push({
                label: weekLabel(current),
                start: startOfWeek(current),
                end: endOfWeek(current),
            });
            current = addWeeks(current, 1);
        }
    } else {
        let current = startOfDay(from);
        while (current <= to) {
            buckets.push({
                label: dayLabel(current),
                start: startOfDay(current),
                end: endOfDay(current),
            });
            current = addDays(current, 1);
        }
    }

    const weekly = buckets.map((b) => {
        const filterRows = <T extends { date: Date }>(rows: T[]) =>
            rows.filter((r) => r.date >= b.start && r.date <= b.end);

        const salesAmount = filterRows(salesRows).reduce((s, r) => s + Number(r.totalPrice || 0), 0);
        const formerAmount = filterRows(formerRows).reduce((s, r) => s + Number(r.totalPrice || 0), 0);
        const agentAmount = filterRows(agentRows).reduce((s, r) => s + Number(r.totalPrice || 0), 0);

        return {
            label: b.label,
            sales: salesAmount,
            purchase: formerAmount + agentAmount,
        };
    });

    // Top varieties
    const qtyMap = new Map<string, number>();
    clientItems.forEach((it) => {
        const code = it.varietyCode?.trim();
        if (code) qtyMap.set(code, (qtyMap.get(code) || 0) + Number(it.totalKgs || 0));
    });

    const topVarieties = Array.from(qtyMap.entries())
        .map(([code, kgs]) => ({ code, kgs: Math.round(kgs * 10) / 10 }))
        .sort((a, b) => b.kgs - a.kgs)
        .slice(0, 6);

    // Outstanding ageing
    const paidMap = new Map<string, number>();
    paymentRows.forEach((p) => {
        if (p.clientId) paidMap.set(p.clientId, (paidMap.get(p.clientId) || 0) + Number(p.amount || 0));
    });

    const ageingBuckets = [
        { bucket: "0-7 days", min: 0, max: 7, amount: 0 },
        { bucket: "8-15 days", min: 8, max: 15, amount: 0 },
        { bucket: "16-30 days", min: 16, max: 30, amount: 0 },
        { bucket: "> 30 days", min: 31, max: Infinity, amount: 0 },
    ];

    clientLoadings.forEach((l) => {
        const remaining = Math.max(0, Number(l.totalPrice || 0) - (paidMap.get(l.id) || 0));
        if (remaining > 0) {
            const age = diffDays(now, l.date);
            const bucket = ageingBuckets.find((b) => age >= b.min && age <= b.max);
            if (bucket) bucket.amount += remaining;
        }
    });

    return {
        today: { sales, purchase, pendingShipments, outstanding },
        weekly,
        movement: weekly,
        topVarieties,
        outstandingAgeing: ageingBuckets,
        fishVarieties,
    };
}