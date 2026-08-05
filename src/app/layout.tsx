import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gmail Checker - Instantly Validate Gmail Addresses",
  description:
    "Free online Gmail checker tool. Instantly validate one or hundreds of Gmail addresses with advanced email validation including DNS lookup, MX record verification, and deliverability scoring.",
  keywords: [
    "gmail checker",
    "email validator",
    "gmail validator",
    "email verification",
    "mx record check",
    "dns lookup",
    "bulk email checker",
    "email validation tool",
  ],
  authors: [{ name: "Gmail Checker" }],
  creator: "Gmail Checker",
  metadataBase: new URL("https://gmailchecker.app"),
  openGraph: {
    title: "Gmail Checker - Instantly Validate Gmail Addresses",
    description:
      "Free online Gmail checker tool. Instantly validate one or hundreds of Gmail addresses with advanced email validation including DNS lookup, MX record verification, and deliverability scoring.",
    url: "https://gmailchecker.app",
    siteName: "Gmail Checker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gmail Checker - Instantly Validate Gmail Addresses",
    description:
      "Free online Gmail checker tool. Instantly validate one or hundreds of Gmail addresses with advanced email validation including DNS lookup, MX record verification, and deliverability scoring.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          // Runs before paint to apply the saved theme immediately —
          // without this, the page would flash dark before switching
          // to a saved light preference (or vice versa).
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.classList.add("light");document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Gmail Checker",
              description:
                "Free online Gmail checker tool. Instantly validate Gmail addresses with advanced email validation including DNS lookup, MX record verification, and deliverability scoring.",
              url: "https://gmailchecker.app",
              applicationCategory: "UtilityApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Gmail Detection",
                "Email Syntax Validation",
                "MX Record Check",
                "DNS Lookup",
                "Duplicate Removal",
                "Bulk Checking",
                "Instant Results",
                "Deliverability Score",
              ],
            }),
          }}
        />
      </head>
      <body className="bg-[#0a0a1a] light:bg-slate-50 text-white light:text-slate-900 antialiased min-h-screen transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
