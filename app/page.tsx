import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import PricingSection from '../components/PricingSection';
import CustomerReviewsSection from '../components/CustomerReviewsSection';
import Footer from '../components/Footer';
import FAQSection from '../components/FAQSection';
import OnboardingSection from '@/components/OnboardingSection';
export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <OnboardingSection />
      <PricingSection />
      <FAQSection />
      <CustomerReviewsSection />
      <Footer />
    </main>
  );
} 