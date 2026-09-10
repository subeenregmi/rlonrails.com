import type { MetadataRoute } from "next";

/*
 * Safari's own chrome cannot be hidden from a page — in landscape it costs the
 * map a good slice of the little height a phone has on its side. Installed to
 * the home screen the map gets the whole screen instead, so the site declares
 * itself installable: `standalone` here, and `appleWebApp.capable` with the
 * translucent status bar in the layout's metadata for iOS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RL on Rails",
    short_name: "RL on Rails",
    description: "A London Underground style map of a reinforcement learning reading curriculum",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f7f3",
    theme_color: "#0019a8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
