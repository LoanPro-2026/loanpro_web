'use client'
import React, { useState, useRef, useEffect, ReactNode, Suspense } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton, useUser, useClerk } from '@clerk/nextjs';
import { UserCircleIcon, CreditCardIcon, ReceiptRefundIcon } from '@heroicons/react/24/outline';
import Loader from './Loader';


const NavBar = () => {

  const { openUserProfile, signOut } = useClerk();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
  console.log(username);

  return (
    <nav className="w-full bg-white shadow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-bold text-blue-700">LoanPro</Link>
          <Link href="/#features" className="text-gray-700 hover:text-blue-700 font-medium">Features</Link>
          <Link href="/#pricing" className="text-gray-700 hover:text-blue-700 font-medium">Pricing</Link>
          <Link href="/#reviews" className="text-gray-700 hover:text-blue-700 font-medium">Reviews</Link>
          <Link href="/#faq" className="text-gray-700 hover:text-blue-700 font-medium">FAQs</Link>
          <Link href="/contact" className="text-gray-700 hover:text-blue-700 font-medium">Contact</Link>
        </div>
        <div className="flex gap-4 items-center">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-6 py-2 bg-white text-blue-700 border border-blue-600 rounded-lg shadow hover:bg-blue-50 transition font-semibold">Login</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold">Get Started</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Suspense fallback={<Loader message="Loading profile..." />}>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((open) => !open)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow hover:bg-blue-50 transition font-semibold focus:outline-none"
                >
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-8 h-8 text-blue-600" />
                  )}
                  <span className="hidden sm:block font-medium text-gray-800">{username}</span>
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                    <div className="flex flex-col py-2">
                      <button
                        onClick={() => openUserProfile()}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
                      >
                        {user?.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt="avatar"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="w-8 h-8 text-blue-600" />
                        )}
                        <span className="text-gray-800 font-medium">Profile</span>               </button>
                      <Link href="/subscribe" className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                        <CreditCardIcon className="w-5 h-5 text-blue-500" />
                        <span>Choose Plan</span>
                      </Link>
                      <Link href="/subscription" className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                        <ReceiptRefundIcon className="w-5 h-5 text-blue-500" />
                        <span>My Subscription</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </Suspense>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;