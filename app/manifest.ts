import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Subtrack Web",
    short_name: "Subtrack",
    description: "A private-by-default, self-hosted subscription manager backed by PostgreSQL.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#208962",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
