import type { Metadata } from "next";
export const metadata: Metadata = { manifest: "/patient-manifest.webmanifest", title: "ClinicSlot Patient" };
export default function ClinicLayout({ children }: { children: React.ReactNode }) { return children; }
