"use client"

import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200 p-8">
      <div className="flex flex-col items-center justify-center gap-4">
        
        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
          <a href="/about" className="hover:text-gray-900 hover:underline">
            About
          </a>
          <a href="/features" className="hover:text-gray-900 hover:underline">
            Features
          </a>
          <a href="/privacy" className="hover:text-gray-900 hover:underline">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-gray-900 hover:underline">
            Terms of Service
          </a>
        </nav>
        
        {/* Copyright Text */}
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Your App Name. All rights reserved.
        </p>

      </div>
    </footer>
  );
};

export default Footer;