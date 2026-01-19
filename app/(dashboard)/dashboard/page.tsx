// app/(dashboard)/dashboard/page.tsx
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { getDashboardMetrics } from "@/lib/dashboard";
import DashboardClient from "./components/DashboardClient";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { redirect } from "next/navigation";

type SP = { from?: string; to?: string; agg?: string };

function parseDateSafe(v?: string) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    verifyToken(token);
  } catch {
    redirect("/login");
  }

  const sp = await Promise.resolve(searchParams || {});
  const fromQ = parseDateSafe(sp.from);
  const toQ = parseDateSafe(sp.to);
  const agg = (sp.agg || "day") as "day" | "week" | "month";

  const defaultFrom = startOfDay(subDays(new Date(), 6));
  const defaultTo = endOfDay(new Date());

  const range = {
    from: fromQ ? startOfDay(fromQ) : defaultFrom,
    to: toQ ? endOfDay(toQ) : defaultTo,
  };

  const data = await getDashboardMetrics(range, agg);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <DashboardClient
        data={data}
        initialFrom={range.from.toISOString()}
        initialTo={range.to.toISOString()}
        initialAgg={agg}
      />
    </div>
  );
}