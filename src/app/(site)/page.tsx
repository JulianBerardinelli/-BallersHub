// app/(site)/page.tsx

import { CallToActionBanner, FeatureHighlights, HeroSection, TestimonialsPreview } from "@/components/site/home";

export default async function Home() {
  return (
    <div className="space-y-24 pb-12">
      <HeroSection />
      <FeatureHighlights />
      <TestimonialsPreview />
      <CallToActionBanner />
    </div>
  );
}
