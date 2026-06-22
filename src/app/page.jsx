import Header from "@/components/Header";

import Footer from "@/components/Footer";

import Hero from "@/components/ui/home/Hero";

import Features from "@/components/ui/home/Features";

import CallToAction from "@/components/ui/home/CallToAction";

import HowItWorks from "@/components/ui/home/HowItWorks";

import UpcomingTournaments from "@/components/ui/home/UpcomingTournaments";

import FAQ from "@/components/ui/home/FAQ";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <Features />
      <CallToAction />
      <HowItWorks />
      <UpcomingTournaments />
      <FAQ/>
      <Footer />

    </>
  );
}
