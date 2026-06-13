import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbit — Founder OS",
    short_name: "Orbit",
    description: "CRM + deal pipeline + product backlog for solo founders",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "New Contact",
        short_name: "Contact",
        url: "/dashboard/contacts/new",
        description: "Add a new contact",
      },
      {
        name: "New Deal",
        short_name: "Deal",
        url: "/dashboard/deals/new",
        description: "Create a new deal",
      },
    ],
  };
}
