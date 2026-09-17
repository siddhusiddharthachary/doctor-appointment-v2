import { redirect } from "next/navigation";
import DoctorDashboard from "@/components/DoctorDashboard";
import { isDoctorAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  if (!(await isDoctorAuthenticated())) redirect("/doctor/login");
  return <main><DoctorDashboard /></main>;
}
