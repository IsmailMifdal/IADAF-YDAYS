/**
 * Web app manifest (/manifest.webmanifest): lets visitors install IA-DAF on
 * their phone's home screen and open it full-screen, like an app.
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IA-DAF — Assistant pour vos démarches administratives",
    short_name: "IA-DAF",
    description:
      "Assistant IA multilingue pour vos démarches administratives en France : titre de séjour, CAF, CPAM, impôts.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
