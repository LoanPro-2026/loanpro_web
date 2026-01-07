// app/sign-in/page.tsx
'use client';
import { SignedIn, SignedOut, SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckIcon, ShieldCheckIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    // This effect will run after Clerk is loaded
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-purple-50 to-blue-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-pink-400/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-6xl mx-auto relative z-10 flex items-center justify-center min-h-screen px-4 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left Side - Sign In Form */}
          <div className="flex justify-center">
            <SignedIn>
              {/* Redirect signed-in users to profile */}
              <RedirectToProfile />
            </SignedIn>
            <SignedOut>
              <div className="w-full max-w-md">
                <SignIn 
                  fallbackRedirectUrl="/profile"
                  signUpUrl="/sign-up"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-2xl"
                    }
                  }}
                />
              </div>
            </SignedOut>
          </div>

          {/* Right Side - Benefits & Trust */}
          <div className="hidden lg:block">
            {/* Welcome Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back to
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> LoanPro</span>
              </h2>
              <p className="text-gray-600 text-lg">
                Secure loan management at your fingertips
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-4 mb-10">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Why LoanPro</h3>
              
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                    <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Bank-Level Security</p>
                  <p className="text-gray-600 text-sm">Biometric authentication & encrypted data</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-100">
                    <SparklesIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Smart Analytics</p>
                  <p className="text-gray-600 text-sm">Track loans, payments & insights in real-time</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100">
                    <CheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Multi-Device Sync</p>
                  <p className="text-gray-600 text-sm">Access your loans across all your devices</p>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-2xl p-6">
              <p className="text-sm text-gray-600 mb-4 font-semibold">Trusted by Users</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">10K+</p>
                  <p className="text-xs text-gray-600">Active Users</p>
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">₹500Cr+</p>
                  <p className="text-xs text-gray-600">Loans Managed</p>
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">99.9%</p>
                  <p className="text-xs text-gray-600">Uptime</p>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-8 flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheckIcon className="h-5 w-5 text-green-600" />
              <span>SSL Encrypted • GDPR Compliant • Data Protected</span>
            </div>
          </div>
        </div>
      </div>
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
