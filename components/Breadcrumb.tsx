import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: 'slash' | 'chevron' | 'dot';
}

export default function Breadcrumb({ 
  items, 
  separator = 'chevron' 
}: BreadcrumbProps) {
  const separators = {
    slash: '/',
    chevron: null,
    dot: '•'
  };

  return (
    <nav className="mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-2">
        {/* Home Link */}
        <li>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </li>

        {/* Breadcrumb Items */}
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {/* Separator */}
            <li className="text-gray-400">
              {separator === 'chevron' ? (
                <ChevronRightIcon className="w-4 h-4" />
              ) : (
                separators[separator]
              )}
            </li>

            {/* Item */}
            <li>
              {item.href && !item.active ? (
                <Link
                  href={item.href}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`font-medium ${item.active ? 'text-gray-900' : 'text-gray-600'}`}>
                  {item.label}
                </span>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}
