// app/(site)/page.tsx

import { CallToActionBanner, FeatureHighlights, HeroSection, TestimonialsPreview } from "@/components/site/home";

export default async function Home() {
  return (
    <div className="space-y-20 px-4 pb-20">
      <HeroSection />
      <FeatureHighlights />
      <TestimonialsPreview />
      <CallToActionBanner />
    </div>
  );
}
