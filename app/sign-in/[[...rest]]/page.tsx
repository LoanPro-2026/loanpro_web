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
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-center min-h-screen px-4 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left Side - Sign In Form */}
          <div className="flex justify-center">
            <SignedIn>
              {/* Redirect signed-in users to profile */}
              <RedirectToProfile />
            </SignedIn>
            <SignedOut>
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <SignIn 
                  fallbackRedirectUrl="/profile"
                  signUpUrl="/sign-up"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none"
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
              <h2 className="text-3xl font-semibold text-slate-900 font-display mb-2">
                Welcome back to LoanPro
              </h2>
              <p className="text-slate-600 text-lg">
                Sign in to manage loans, collections, and reports.
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-4 mb-10">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Why LoanPro</h3>
              
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
                    <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Secure access</p>
                  <p className="text-slate-600 text-sm">Role-based access and optional biometrics.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
                    <SparklesIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Clear analytics</p>
                  <p className="text-slate-600 text-sm">Track collections and portfolio health.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
                    <CheckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Local-first performance</p>
                  <p className="text-slate-600 text-sm">Fast daily operations with optional cloud backup.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-700">Need help?</p>
              <p className="text-sm text-slate-600 mt-2">
                Contact support for onboarding or account access.
              </p>
              <a
                href="mailto:support@loanpro.tech"
                className="inline-flex items-center mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                support@loanpro.tech
              </a>
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
