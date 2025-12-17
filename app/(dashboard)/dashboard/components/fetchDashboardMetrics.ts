import { headers } from "next/headers";
import type { DashboardMetrics } from "@/lib/dashboard";

type ApiWrap<T> =
    | { success?: boolean; data?: T; loading?: T; records?: T; payments?: T }
    | T;

type BillItem = {
    varietyCode?: string | null;
    totalKgs?: number | null;
    totalPrice?: number | null;
};

type BillRow = {
    id: string;
    date?: string | Date | null;
    createdAt?: string | Date | null;
    items?: BillItem[] | null;
    totalPrice?: number | null; // parent level (optional)
};

type ClientPayment = {
    amount?: number | null;
    date?: string | Date | null;
    createdAt?: string | Date | null;
};

type FishVariety = { code: string; name: string };

function unwrapArray<T>(json: ApiWrap<T[]>): T[] {
    if (Array.isArray(json)) return json;
    const obj = json as any;
    return obj?.data || obj?.loading || obj?.records || obj?.payments || [];
}

function toDate(v: string | Date | null | undefined): Date | null {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isSameDay(a: string | Date | null | undefined, b: Date) {
    const d = toDate(a);
    if (!d) return false;
    return dayKey(d) === dayKey(b);
}

function startOfToday() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
}

function last7Days() {
    const base = startOfToday();
    const out: { label: string; date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        out.push({
            label: d.toLocaleDateString("en-IN", { weekday: "short" }),
            date: d,
        });
    }
    return out;
}

/**
 * ✅ Money total (₹):
 * Uses sum(items.totalPrice) first.
 * Never uses grandTotal/totalKgs (kgs), so your lakhs display correctly.
 */
function totalMoney(r: BillRow): number {
    const items = r.items || [];
    const sum = items.reduce((s, it) => s + Number(it.totalPrice || 0), 0);
    if (sum > 0) return sum;

    const parent = Number(r.totalPrice || 0);
    return parent > 0 ? parent : 0;
}

async function getBaseUrl() {
    const h = await headers(); // ✅ FIX: headers() is Promise in Next 16
    const host = h.get("host") || "localhost:3000";
    const proto =
        h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
}

async function safeFetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed: ${url}`);
    return res.json();
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
    const base = await getBaseUrl(); // ✅ now async

    const [
        formerJson,
        agentJson,
        clientLoadingJson,
        clientPayJson,
        fishVarJson,
    ] = await Promise.all([
        safeFetchJson<ApiWrap<BillRow[]>>(new URL("/api/former-loading", base).toString()),
        safeFetchJson<ApiWrap<BillRow[]>>(new URL("/api/agent-loading", base).toString()),
        safeFetchJson<ApiWrap<BillRow[]>>(new URL("/api/client-loading", base).toString()),
        safeFetchJson<ApiWrap<ClientPayment[]>>(new URL("/api/payments/client", base).toString()),
        safeFetchJson<ApiWrap<FishVariety[]>>(new URL("/api/fish-varieties", base).toString()),
    ]);

    const former = unwrapArray<BillRow>(formerJson);
    const agent = unwrapArray<BillRow>(agentJson);
    const clients = unwrapArray<BillRow>(clientLoadingJson);
    const clientPays = unwrapArray<ClientPayment>(clientPayJson);
    const fishVarieties = unwrapArray<FishVariety>(fishVarJson);

    const today = startOfToday();

    const purchaseToday = [...former, ...agent]
        .filter((r) => isSameDay(r.date || r.createdAt, today))
        .reduce((s, r) => s + totalMoney(r), 0);

    const salesToday = clients
        .filter((r) => isSameDay(r.date || r.createdAt, today))
        .reduce((s, r) => s + totalMoney(r), 0);

    const pendingShipments = clients.filter((r) =>
        isSameDay(r.date || r.createdAt, today)
    ).length;

    const totalSalesAll = clients.reduce((s, r) => s + totalMoney(r), 0);
    const totalClientPaid = clientPays.reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstanding = Math.max(0, totalSalesAll - totalClientPaid);

    const days = last7Days();
    const weekly = days.map((d) => {
        const purchase = [...former, ...agent]
            .filter((r) => isSameDay(r.date || r.createdAt, d.date))
            .reduce((s, r) => s + totalMoney(r), 0);

        const sales = clients
            .filter((r) => isSameDay(r.date || r.createdAt, d.date))
            .reduce((s, r) => s + totalMoney(r), 0);

        return { label: d.label, purchase, sales };
    });

    // top varieties (this week) by qty from client items
    const min = new Date(today);
    min.setDate(today.getDate() - 6);

    const qtyMap = new Map<string, number>();
    clients.forEach((r) => {
        const d = toDate(r.date || r.createdAt);
        if (!d || d.getTime() < min.getTime()) return;

        (r.items || []).forEach((it) => {
            const code = String(it.varietyCode || "").trim();
            if (!code) return;
            const kgs = Number(it.totalKgs || 0);
            qtyMap.set(code, (qtyMap.get(code) || 0) + kgs);
        });
    });

    const topVarieties = Array.from(qtyMap.entries())
        .map(([code, kgs]) => ({ code, kgs: Math.round(kgs * 10) / 10 }))
        .sort((a, b) => b.kgs - a.kgs)
        .slice(0, 6);

    // outstanding ageing (simple buckets)
    const now = new Date();
    const buckets = [
        { bucket: "0-7 days", min: 0, max: 7 },
        { bucket: "8-15 days", min: 8, max: 15 },
        { bucket: "16-30 days", min: 16, max: 30 },
        { bucket: "> 30 days", min: 31, max: 9999 },
    ];

    const outstandingAgeing = buckets.map((b) => ({ bucket: b.bucket, amount: 0 }));

    clients.forEach((r) => {
        const d = toDate(r.date || r.createdAt);
        if (!d) return;

        const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
        const amt = totalMoney(r);
        if (amt <= 0) return;

        const idx = buckets.findIndex((x) => diff >= x.min && diff <= x.max);
        if (idx >= 0) outstandingAgeing[idx].amount += amt;
    });

    return {
        today: {
            sales: salesToday,
            purchase: purchaseToday,
            pendingShipments,
            outstanding,
        },
        weekly,
        movement: weekly, // ✅ required by DashboardMetrics
        topVarieties,
        outstandingAgeing,
        fishVarieties: fishVarieties.map((v) => ({ code: v.code, name: v.name })),
    };
}
