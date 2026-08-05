import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gmailchecker.vip"),
  title: {
    default: "GmailChecker.VIP | Gmail & Bulk Email Checker",
    template: "%s | GmailChecker.VIP",
  },
  description:
    "Check Gmail and email addresses in bulk with format validation, MX lookup, and SMTP verification. Clean email lists and verify deliverability with GmailChecker.VIP.",
  applicationName: "GmailChecker.VIP",
  keywords: [
    "gmailchecker",
    "gmail checker",
    "gmail email checker",
    "email checker",
    "email verifier",
    "email validation",
    "bulk email checker",
    "bulk email verification",
    "verify email",
    "verify gmail",
    "smtp verification",
    "mx lookup",
    "email validation tool",
    "email list cleaner",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GmailChecker.VIP",
    title: "GmailChecker.VIP | Gmail & Bulk Email Checker",
    description:
      "Verify email lists with format checks, MX lookup, and SMTP verification.",
  },
  twitter: {
    card: "summary",
    title: "GmailChecker.VIP | Gmail & Bulk Email Checker",
    description:
      "Verify email lists with format checks, MX lookup, and SMTP verification.",
  },
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>{children}</body>
    </html>
  );
}
