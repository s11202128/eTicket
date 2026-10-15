import type { MetadataRoute } from "next";
import { ICON_BACKGROUND } from "@/lib/appIcon";
import { SITE_NAME } from "@/lib/site";

// Lets visitors add the site to their Android or iOS home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Browse concerts, sports, festivals and more, and book tickets in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: ICON_BACKGROUND,
    theme_color: ICON_BACKGROUND,
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
