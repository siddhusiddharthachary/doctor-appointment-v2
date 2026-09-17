import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "ClinicSlot",
  description: "Simple live token queue for clinics",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" }
};
export const viewport: Viewport = { themeColor: "#173a2a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><PwaRegister /><div className="site-shell"><nav className="nav"><Link className="brand" href="/">ClinicSlot</Link><div className="navlinks"><Link href="/clinic">Patient</Link><Link href="/doctor/login">Clinic staff</Link></div></nav>{children}<footer>ClinicSlot V1 · Token queue, not medical records.</footer></div></body></html>;
}
