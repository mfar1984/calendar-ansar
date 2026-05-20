import { getSession } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  return <DashboardClient user={session!} />;
}
