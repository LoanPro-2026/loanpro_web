import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import RequirementsSection from '../components/RequirementsSection';
import HowToSetup from '../components/HowToSetup';
import PricingSection from '../components/PricingSection';
import Footer from '../components/Footer';
import FAQSection from '../components/FAQSection';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <RequirementsSection />
      <HowToSetup />
      <PricingSection />
      <FAQSection />
      <Footer />
    </main>
  );
} 