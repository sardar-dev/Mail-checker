import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://gmailchecker.vip/sitemap.xml",
    host: "https://gmailchecker.vip",
  };
}
