import React from 'react';

const HeroSection = () => (
  <section className="relative flex flex-col items-center justify-center min-h-[70vh] text-center bg-gradient-to-br from-blue-600 via-blue-400 to-blue-200 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-200/60 via-white/0 to-transparent pointer-events-none" />
    <div className="relative z-10 py-24 px-4">
      <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-white drop-shadow-lg">Effortless Loan Management</h1>
      <p className="text-2xl md:text-3xl mb-10 text-blue-100 font-medium drop-shadow">Modern, Secure, and Fast for Every Lender</p>
      <a href="/get-started" className="px-10 py-4 bg-white text-blue-700 rounded-lg shadow-lg hover:bg-blue-700 hover:text-white transition font-bold text-xl">Get Started Now</a>
    </div>
  </section>
);

export default HeroSection; 