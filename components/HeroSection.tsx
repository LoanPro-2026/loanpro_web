'use client';
import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';
import { ArrowDownIcon, PlayIcon, ChartBarIcon, ShieldCheckIcon, CpuChipIcon } from '@heroicons/react/24/outline';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-purple-600/10"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-purple-400/20 to-blue-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      
      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-32">
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-6 py-3 mb-8">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-700 font-medium">Trusted by 10,000+ loan professionals</span>
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Modern Loan
          </span>
          <br />
          <span className="text-gray-800">Management</span>
        </h1>
        
        <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          Streamline your lending operations with our powerful desktop application featuring 
          <span className="text-blue-600 font-semibold"> advanced analytics</span>, 
          <span className="text-purple-600 font-semibold"> secure data management</span>, and 
          <span className="text-blue-600 font-semibold"> seamless cloud integration</span>.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center space-x-2">
                  <span>Start Free Trial</span>
                  <ArrowDownIcon className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <Link href="/profile">
              <button className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center space-x-2">
                  <span>Go to Dashboard</span>
                  <ArrowDownIcon className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </Link>
          </SignedIn>

          <Link href="/download">
            <button className="group bg-white/20 backdrop-blur-sm border border-white/30 text-gray-700 font-semibold px-8 py-4 rounded-2xl hover:bg-white/30 transition-all duration-300 shadow-xl">
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download App</span>
              </span>
            </button>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Advanced Analytics</h3>
            <p className="text-gray-600">Real-time insights and comprehensive reporting for better decision making</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Bank-Level Security</h3>
            <p className="text-gray-600">Military-grade encryption and biometric authentication for your data</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <CpuChipIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">AI-Powered</h3>
            <p className="text-gray-600">Smart automation and predictive analytics to streamline workflows</p>
          </div>
        </div>

        {/* Demo Screenshot Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded w-3/4"></div>
                <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                <div className="h-4 bg-gray-600 rounded w-2/3"></div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg"></div>
                  <div className="h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg"></div>
                  <div className="h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg"></div>
                </div>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-6 font-medium">
              Experience the future of loan management with our intuitive interface
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-16 flex justify-center">
          <button className="animate-bounce bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-3 hover:bg-white/30 transition-all duration-300">
            <ArrowDownIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 