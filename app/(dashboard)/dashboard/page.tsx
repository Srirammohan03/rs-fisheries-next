// app/(dashboard)/dashboard/page.tsx
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import AddFishButton from "./components/AddFishButton";
// import DashboardClient from "./components/DashboardClient";
import { getDashboardMetrics } from "@/lib/dashboard";
import DashboardClient from "./components/DashboardClient";
import { fetchDashboardMetrics } from "./components/fetchDashboardMetrics";

export default async function Dashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  let user: any = null;
  if (token) {
    try {
      user = verifyToken(token);
    } catch {
      console.log("Invalid token");
    }
  }

  // optional: block if not logged in
  // if (!user) redirect("/login");
const data = await fetchDashboardMetrics();
  // const data = await getDashboardMetrics();

  return (
    <div className="p-6 space-y-6">
      
      <AddFishButton />
      <DashboardClient data={data} />
    </div>
  );
}
