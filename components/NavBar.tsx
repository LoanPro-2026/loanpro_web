'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SignedIn, SignedOut, useUser, useClerk, SignInButton, SignUpButton } from '@clerk/nextjs';
import { UserCircleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const NavBar = () => {
  const { signOut } = useClerk();
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
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/#faq', label: 'FAQs' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/loanpro-logo.png"
              alt="LoanPro logo"
              width={120}
              height={36}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-blue-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/download"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-blue-50"
            >
              Download
            </Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            <SignedOut>
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-blue-50"
                >
                  Login
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  Get started
                </Link>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center space-x-3">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block">{username}</span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      <div className="p-2">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
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
                          className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
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
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-slate-700 hover:text-slate-900 font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <Link
                href="/download"
                className="block text-slate-700 hover:text-slate-900 font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Download
              </Link>
              
              <SignedOut>
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <SignInButton mode="modal">
                    <button className="w-full text-left text-slate-700 hover:text-slate-900 font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                      Login
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                      Get started
                    </button>
                  </SignUpButton>
                </div>
              </SignedOut>

              <SignedIn>
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 text-slate-700 hover:text-slate-900 font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
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
                    className="flex items-center gap-3 text-red-600 font-medium py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
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