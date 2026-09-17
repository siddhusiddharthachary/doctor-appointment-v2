import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClinicSlot",
    short_name: "ClinicSlot",
    description: "Live patient token queue for clinics",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#173a2a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
