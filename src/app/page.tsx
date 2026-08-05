import EmailValidator from "@/components/EmailValidator";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "GmailChecker.VIP",
  url: "https://gmailchecker.vip",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "A Gmail and bulk email checker for email validation, MX lookup, and SMTP verification.",
  sameAs: ["https://github.com/sardar-dev/Mail-checker"],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <EmailValidator />
    </>
  );
}
