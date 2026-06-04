import type { MetadataRoute } from "next";

import {
  appDescription,
  appName,
  appShortName,
  pwaBackgroundColor,
  pwaThemeColor,
} from "@/app/pwa-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appShortName,
    description: appDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: pwaBackgroundColor,
    theme_color: pwaThemeColor,
    lang: "es-AR",
    categories: ["sports", "games"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
