import React from 'react';
import Link from 'next/link';

const Footer = () => (
  <footer className="bg-gray-900 text-gray-200 py-12 mt-16">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-10">
      {/* Branding */}
      <div>
        <div className="text-2xl font-bold text-blue-400 mb-2">LoanPro</div>
        <p className="text-gray-400 text-sm">Effortless, modern, and secure loan management for every lender. Built for speed, trust, and growth.</p>
      </div>
      {/* Contact Us */}
      <div>
        <div className="font-semibold text-lg mb-2 text-blue-300">Contact Us</div>
        <div className="text-gray-400 text-sm">Email: <a href="mailto:support@loanpro.tech" className="underline">support@loanpro.tech</a></div>
        <div className="text-gray-400 text-sm">Phone: <a href="tel:+911234567890" className="underline">+91 12345 67890</a></div>
      </div>
      {/* Important Links */}
      <div>
        <div className="font-semibold text-lg mb-2 text-blue-300">Important Links</div>
        <ul className="space-y-1">
          <li><Link href="/terms" className="hover:underline">Terms and Conditions</Link></li>
          <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
          <li><Link href="/payment-policy" className="hover:underline">Payment Policy</Link></li>
          <li><Link href="/cancellation-policy" className="hover:underline">Cancellation Policy</Link></li>
        </ul>
      </div>
      {/* Get Started Now */}
      <div>
        <div className="font-semibold text-lg mb-2 text-blue-300">Get Started Now</div>
        <ul className="space-y-1">
          <li><Link href="/get-started" className="hover:underline">Sign Up</Link></li>
          <li><Link href="/login" className="hover:underline">Login</Link></li>
        </ul>
      </div>
    </div>
    <div className="text-center text-xs text-gray-500 mt-10">&copy; {new Date().getFullYear()} LoanPro. All rights reserved.</div>
  </footer>
);

export default Footer; 