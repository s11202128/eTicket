import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Private areas stay out of search engines (they also require sign-in).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/tickets", "/profile", "/auth", "/login", "/signup", "/logout", "/reset-password", "/forgot-password"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
