import React from 'react';
import Link from 'next/link';

const NavBar = () => (
  <nav className="w-full bg-white shadow sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-2xl font-bold text-blue-700">LoanPro</Link>
        <a href="#features" className="text-gray-700 hover:text-blue-700 font-medium">Features</a>
        <a href="#pricing" className="text-gray-700 hover:text-blue-700 font-medium">Pricing</a>
        <a href="#reviews" className="text-gray-700 hover:text-blue-700 font-medium">Reviews</a>
        <a href="#faq" className="text-gray-700 hover:text-blue-700 font-medium">FAQs</a>
      </div>
      <div className="flex gap-4">
        <Link href="/sign-in" className="px-6 py-2 bg-white text-blue-700 border border-blue-600 rounded-lg shadow hover:bg-blue-50 transition font-semibold">Login</Link>
        <Link href="/sign-up" className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold">Get Started</Link>
      </div>
    </div>
  </nav>
);

export default NavBar; 