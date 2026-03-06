import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_40%)]"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
              Trusted by loan teams across India
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 font-display leading-tight">
              Professional loan management for modern teams
            </h1>

            <p className="mt-5 text-lg text-slate-600 max-w-xl">
              LoanPro is a Windows desktop platform for tracking loans, collections, and portfolios with optional cloud backup and Android photo capture for customer verification workflows.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                    Get started
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Go to dashboard
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </SignedIn>

              <Link
                href="/download"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 font-semibold px-6 py-3 rounded-lg hover:border-slate-300 hover:text-slate-900 transition-colors"
              >
                Download app
              </Link>
            </div>

            <div className="mt-6 text-sm text-slate-500">
              Windows desktop app plus Android companion photo capture support.
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                </div>
                <span className="text-sm font-semibold text-slate-600">LoanPro Dashboard</span>
              </div>
              <div className="p-4">
                <img
                  src="/screenshots/hero/hero-dashboard.png"
                  alt="LoanPro dashboard preview"
                  className="w-full h-auto rounded-xl border border-slate-200 object-cover"
                />
              </div>
            </div>
            <div className="absolute -z-10 -bottom-6 -right-6 h-24 w-24 rounded-full bg-blue-100"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 