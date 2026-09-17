import { redirect } from "next/navigation";
import DoctorLogin from "@/components/DoctorLogin";
import { isDoctorAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await isDoctorAuthenticated()) redirect("/doctor/dashboard");
  return <main><DoctorLogin /></main>;
}
