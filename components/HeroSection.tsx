'use client';
import React from 'react';
import Link from 'next/link';

const HeroSection = () => {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[90vh] text-center bg-gradient-to-br from-blue-600 via-blue-400 to-blue-200 overflow-hidden">
      {/* Subtle background shape */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-white/10 rounded-full blur-3xl z-0" />
      <div className="relative z-10 flex flex-col items-center justify-center gap-10 py-28 px-4 w-full max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-white drop-shadow-lg leading-tight">Effortless Loan Management</h1>
        <p className="text-2xl md:text-3xl mb-10 text-blue-100 font-medium drop-shadow">Modern, Secure, and Fast for Every Lender</p>
        <div className="flex flex-col sm:flex-row gap-6 mb-10 justify-center">
          <Link href="/download">
            <button className="px-8 py-4 bg-blue-700 text-white rounded-xl shadow-lg hover:bg-blue-800 transition font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-300 animate-bounce-slow">
              Download Now
            </button>
          </Link>
          <Link href="/app/profile">
            <button className="px-8 py-4 bg-white text-blue-700 border border-blue-600 rounded-xl shadow-lg hover:bg-blue-700 hover:text-white transition font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
              Manage Profile
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 