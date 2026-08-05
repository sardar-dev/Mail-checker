import AnimatedBackground from "@/components/AnimatedBackground";
import Hero from "@/components/Hero";
import GmailChecker from "@/components/GmailChecker";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <AnimatedBackground />
      <main className="relative z-10">
        <Hero />
        <GmailChecker />
        <Features />
        <FAQ />
        <Footer />
      </main>
    </>
  );
}
