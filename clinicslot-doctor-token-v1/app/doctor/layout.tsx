import type { Metadata } from "next";
export const metadata: Metadata = { manifest: "/staff-manifest.webmanifest", title: "ClinicSlot Staff" };
export default function DoctorLayout({ children }: { children: React.ReactNode }) { return children; }
