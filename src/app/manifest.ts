import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GmailChecker.VIP | Gmail & Bulk Email Checker",
    short_name: "GmailChecker.VIP",
    description: "Gmail and bulk email checker with MX lookup and SMTP verification.",
    start_url: "https://gmailchecker.vip",
    scope: "https://gmailchecker.vip/",
    display: "standalone",
    background_color: "#0f1117",
    theme_color: "#4f6ef7",
    icons: [
      {
        src: "https://gmailchecker.vip/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
