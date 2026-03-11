import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const Footer = () => (
  <footer className="bg-slate-950 text-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/loanpro-logo-dark.png"
              alt="LoanPro logo"
              width={130}
              height={38}
            />
          </Link>
          <p className="mt-4 text-sm text-slate-400 max-w-md">
            LoanPro is a Windows desktop loan management platform built for clarity, control, and secure operations.
          </p>
          <div className="mt-6 space-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-4 h-4 text-slate-500" />
              <a href="mailto:support@loanpro.tech" className="hover:text-white transition-colors">
                j.akshat296@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-4 h-4 text-slate-500" />
              <a href="tel:+911234567890" className="hover:text-white transition-colors">
                +91 78988 85129
              </a>
            </div>
            <div className="flex items-center gap-3">
              <MapPinIcon className="w-4 h-4 text-slate-500" />
              <span>Indore, Madhya Pradesh, India</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Product</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
            <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            <li><Link href="/download" className="hover:text-white transition-colors">Download</Link></li>
            <li><Link href="/#faq" className="hover:text-white transition-colors">FAQs</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Company</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
            <li><Link href="/#pricing" className="hover:text-white transition-colors">Plans</Link></li>
            <li><Link href="/profile" className="hover:text-white transition-colors">Account</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Legal</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/payment-policy" className="hover:text-white transition-colors">Payment Policy</Link></li>
            <li><Link href="/cancellation-policy" className="hover:text-white transition-colors">Cancellation Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-6 text-sm text-slate-500">
        <div>© {new Date().getFullYear()} LoanPro. All rights reserved.</div>
        <div>Built in India.</div>
      </div>

      <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <h3 className="text-lg font-semibold text-white">Ready to streamline loan operations?</h3>
        <p className="mt-2 text-sm text-slate-400">
          Start with a 6-month Pro trial or download the desktop app today.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 transition-colors">
                Start free trial
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/profile"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 transition-colors"
            >
              Go to dashboard
            </Link>
          </SignedIn>
          <Link
            href="/download"
            className="rounded-lg border border-slate-700 bg-slate-900 text-white font-semibold px-5 py-2.5 hover:border-slate-500 transition-colors"
          >
            Download app
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer; 