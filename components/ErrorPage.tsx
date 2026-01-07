'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorPageProps {
  code: 404 | 500;
  title?: string;
  description?: string;
  showHome?: boolean;
}

export default function ErrorPage({ 
  code, 
  title = '',
  description = '',
  showHome = true 
}: ErrorPageProps) {
  const defaults = {
    404: {
      title: 'Page Not Found',
      description: 'The page you are looking for doesn\'t exist or has been moved.',
      emoji: '🔍'
    },
    500: {
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again later.',
      emoji: '⚠️'
    }
  };

  const config = defaults[code];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-blue-50 flex items-center justify-center px-4 py-12">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 text-center max-w-md">
        {/* Error Icon */}
        <div className="text-8xl mb-6">{config.emoji}</div>

        {/* Error Code */}
        <div className="text-6xl font-bold text-transparent bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text mb-4">
          {code}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {title || config.title}
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">
          {description || config.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {showHome && (
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Go to Home
            </Link>
          )}
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 bg-white/40 hover:bg-white/60 text-gray-700 font-bold py-3 px-8 rounded-xl border border-gray-200 transition-all duration-300 backdrop-blur-sm"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600 text-sm mb-3">Need help?</p>
          <div className="flex flex-col gap-2">
            <a
              href="/support"
              className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
            >
              Contact Support
            </a>
            <a
              href="mailto:support@loanpro.tech"
              className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
