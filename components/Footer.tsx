import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const Footer = () => (
  <footer className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white overflow-hidden">
    {/* Background Elements */}
    <div className="absolute inset-0 bg-black/20"></div>
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-full blur-3xl"></div>
    
    <div className="relative">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-30"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl px-4 py-2 rounded-xl">
                  LoanPro
                </div>
              </div>
              <span className="text-sm font-medium text-gray-300">Modern Loan Management</span>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
              Revolutionizing loan management with cutting-edge technology, bank-grade security, 
              and intuitive design. Trusted by thousands of loan professionals worldwide.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-300">
                <EnvelopeIcon className="w-5 h-5 text-blue-400" />
                <a href="mailto:support@loanpro.tech" className="hover:text-blue-400 transition-colors">
                  support@loanpro.tech
                </a>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <PhoneIcon className="w-5 h-5 text-blue-400" />
                <a href="tel:+911234567890" className="hover:text-blue-400 transition-colors">
                  +91 12345 67890
                </a>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MapPinIcon className="w-5 h-5 text-blue-400" />
                <span>Mumbai, Maharashtra, India</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6 relative">
              Quick Links
              <div className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/#features', label: 'Features' },
                { href: '/#pricing', label: 'Pricing' },
                { href: '/download', label: 'Download' },
                { href: '/#faq', label: 'FAQ' },
                { href: '/#reviews', label: 'Reviews' }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link 
                    href={link.href} 
                    className="text-gray-300 hover:text-blue-400 transition-colors flex items-center space-x-2 group"
                  >
                    <span>{link.label}</span>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6 relative">
              Legal & Support
              <div className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/terms', label: 'Terms of Service' },
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/payment-policy', label: 'Payment Policy' },
                { href: '/cancellation-policy', label: 'Cancellation Policy' },
                { href: '/support', label: 'Support Center' }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link 
                    href={link.href} 
                    className="text-gray-300 hover:text-blue-400 transition-colors flex items-center space-x-2 group"
                  >
                    <span>{link.label}</span>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 pt-12 border-t border-gray-700/50">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Transform Your Loan Management?
            </h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join thousands of satisfied users who have revolutionized their loan operations with LoanPro's advanced features and secure platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                    Start Free Trial
                  </button>
                </SignUpButton>
              </SignedOut>
              
              <SignedIn>
                <Link href="/profile">
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                    Go to Dashboard
                  </button>
                </Link>
              </SignedIn>
              
              <Link href="/download">
                <button className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-xl border border-white/20 transition-all duration-300">
                  Download App
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700/50 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} LoanPro. All rights reserved. Built with ❤️ in India.
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>All systems operational</span>
              </div>
              
              {/* Social Links */}
              <div className="flex items-center space-x-4">
                {/* Add social media icons here if needed */}
                <div className="text-gray-400 text-sm">
                  Follow us for updates
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer; 