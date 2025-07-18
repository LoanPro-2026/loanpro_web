'use client'
import React, { useState, useRef, useEffect, ReactNode, Suspense } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton, useUser, useClerk } from '@clerk/nextjs';
import { UserCircleIcon, CreditCardIcon, ReceiptRefundIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Loader from './Loader';

const NavBar = () => {
  const { openUserProfile, signOut } = useClerk();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const username =
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName) ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    'User';

  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/#reviews', label: 'Reviews' },
    { href: '/#faq', label: 'FAQs' },
    { href: '/download', label: 'Download' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/30 shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl px-4 py-2 rounded-xl shadow-2xl">
                LoanPro
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 group"
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            <SignedOut>
              <div className="hidden sm:flex items-center space-x-3">
                <SignInButton mode="modal">
                  <button className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2 rounded-xl transition-all duration-300 hover:bg-white/30 backdrop-blur-sm">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                    Get Started
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center space-x-3">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-gray-700 font-medium px-4 py-2 rounded-xl transition-all duration-300 border border-white/20"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block">{username}</span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/70 to-purple-50/70"></div>
                      <div className="relative p-2">
                        <Link
                          href="/profile"
                          className="flex items-center space-x-3 px-4 py-3 text-gray-800 hover:bg-white/30 rounded-xl transition-all duration-300 group"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <UserCircleIcon className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Profile & Settings</span>
                        </Link>
                        
                        <button
                          onClick={() => {
                            signOut();
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50/70 rounded-xl transition-all duration-300 group"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SignedIn>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600 hover:bg-white/20 rounded-xl transition-all duration-300"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/40 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/70 to-purple-50/70"></div>
            <div className="relative px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-gray-800 hover:text-blue-600 font-medium py-2 px-4 rounded-xl hover:bg-white/30 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              <SignedOut>
                <div className="pt-4 border-t border-white/30 space-y-3">
                  <SignInButton mode="modal">
                    <button className="w-full text-left text-gray-800 hover:text-blue-600 font-medium py-2 px-4 rounded-xl hover:bg-white/30 transition-all duration-300">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg">
                      Get Started
                    </button>
                  </SignUpButton>
                </div>
              </SignedOut>

              <SignedIn>
                <div className="pt-4 border-t border-white/30 space-y-3">
                  <Link
                    href="/profile"
                    className="flex items-center space-x-3 text-gray-800 hover:text-blue-600 font-medium py-2 px-4 rounded-xl hover:bg-white/30 transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 text-red-600 font-medium py-2 px-4 rounded-xl hover:bg-red-50/70 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </SignedIn>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;