// app/sign-up/page.tsx
'use client';
import { SignUp, SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckIcon, SparklesIcon, LockClosedIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function SignUpPage() {
  const router = useRouter();
  const plans = [
    {
      name: "Basic",
      color: "bg-blue-50",
      icon: "💼",
      features: ["Single device", "Basic analytics", "Email support"]
    },
    {
      name: "Pro",
      color: "bg-purple-50",
      icon: "⭐",
      features: ["Dual devices", "Advanced analytics", "Priority support", "Cloud sync"],
      highlighted: true
    },
    {
      name: "Enterprise",
      color: "bg-pink-50",
      icon: "🚀",
      features: ["Multi-device", "Custom features", "24/7 support", "Unlimited cloud"]
    }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-purple-50 to-blue-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-pink-400/10 rounded-full blur-3xl"></div>

      <SignedIn>
        {/* Redirect signed-in users to profile */}
        <RedirectToProfile />
      </SignedIn>
      <SignedOut>
      <div className="max-w-7xl mx-auto relative z-10 pt-24 pb-12 px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Create Your
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> LoanPro Account</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">
            Join thousands of users who manage their loans with confidence
          </p>
          <p className="text-gray-500">Start with a 14-day free Pro trial • No credit card required</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Sign-Up Form */}
          <div className="flex justify-center items-start">
            <div className="w-full max-w-md">
              <SignUp 
                fallbackRedirectUrl="/profile"
                signInUrl="/sign-in"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-2xl"
                  }
                }}
              />
            </div>
          </div>

          {/* Plans Overview */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan After Sign Up</h2>
              <p className="text-gray-600">Start with a 14-day free trial, then select the plan that fits your needs</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`${plan.color} rounded-2xl p-6 border-2 ${
                    plan.highlighted ? "border-purple-300 ring-2 ring-purple-200" : "border-transparent"
                  } relative`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      POPULAR
                    </div>
                  )}
                  <div className="text-3xl mb-3">{plan.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-gray-700">
                        <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Why LoanPro */}
            <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Why Choose LoanPro?</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                      <LockClosedIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Military-Grade Encryption</p>
                    <p className="text-gray-600 text-xs mt-1">Your data is encrypted end-to-end</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-100">
                      <SparklesIcon className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Smart Dashboard</p>
                    <p className="text-gray-600 text-xs mt-1">Real-time insights & analytics</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100">
                      <ClockIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Always Available</p>
                    <p className="text-gray-600 text-xs mt-1">24/7 cloud access & sync</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-pink-100">
                      <CheckIcon className="h-6 w-6 text-pink-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Instant Device Binding</p>
                    <p className="text-gray-600 text-xs mt-1">Secure access with biometrics</p>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Already have an account? 
            <a href="/sign-in" className="text-purple-600 font-semibold hover:text-purple-700 ml-1">
              Sign in here
            </a>
          </p>
          <p className="text-sm text-gray-500">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
      </SignedOut>
    </div>
  );
}

// Client component for redirect
function RedirectToProfile() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/profile');
  }, [router]);

  return null;
}
