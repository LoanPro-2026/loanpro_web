// app/sign-up/page.tsx
'use client';
import { SignUp, SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckIcon, SparklesIcon, LockClosedIcon } from "@heroicons/react/24/outline";

export default function SignUpPage() {
  const router = useRouter();
  const plans = [
    {
      name: "Basic",
      features: ["Single device", "Basic analytics", "Email support"]
    },
    {
      name: "Pro",
      features: ["Dual devices", "Advanced analytics", "Priority support", "Cloud backup"],
      highlighted: true
    },
    {
      name: "Enterprise",
      features: ["Multi-device", "Custom workflows", "Phone support", "Unlimited cloud"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      <SignedIn>
        {/* Redirect signed-in users to profile */}
        <RedirectToProfile />
      </SignedIn>
      <SignedOut>
      <div className="max-w-7xl mx-auto pt-24 pb-12 px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 font-display mb-4">
            Create your LoanPro account
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-2">
            Start with a 1-month Pro trial and set up your team in minutes.
          </p>
          <p className="text-slate-500 text-sm">No credit card required to start</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Sign-Up Form */}
          <div className="flex justify-center items-start">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SignUp 
                fallbackRedirectUrl="/profile"
                signInUrl="/sign-in"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none"
                  }
                }}
              />
            </div>
          </div>

          {/* Plans Overview */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 font-display mb-2">Pick a plan after sign-up</h2>
              <p className="text-slate-600">Choose the plan that matches your device and backup requirements.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-6 border ${
                    plan.highlighted ? "border-blue-600" : "border-slate-200"
                  } bg-white relative`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Most popular
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{plan.name}</h3>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-slate-600">
                        <CheckIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Why LoanPro */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Why teams choose LoanPro</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
                      <LockClosedIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Secure access controls</p>
                    <p className="text-slate-600 text-xs mt-1">Role-based access and audit-ready workflows.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
                      <SparklesIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Clear reporting</p>
                    <p className="text-slate-600 text-xs mt-1">Daily insights for collections and portfolio health.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
                      <LockClosedIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Local-first performance</p>
                    <p className="text-slate-600 text-xs mt-1">Fast day-to-day operations with optional backup.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
                      <CheckIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Android photo capture</p>
                    <p className="text-slate-600 text-xs mt-1">Capture and verify customer photos using your own mobile phone.</p>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <p className="text-slate-600 mb-4">
            Already have an account?
            <a href="/sign-in" className="text-blue-600 font-semibold hover:text-blue-700 ml-1">
              Sign in here
            </a>
          </p>
          <p className="text-sm text-slate-500">
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
