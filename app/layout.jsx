

import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import ClientProviders from "./providers/ClientProviders"; // client wrapper (adds provider + navbar)
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SipSelector",
  description: "Select Your Drink and Pair",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ClientProviders renders the OIDC provider + Navbar + children */}
        <ClientProviders>{children}</ClientProviders>
        {/* <Footer /> */}
        {/* The Analytics component is added here to track page views */}
        <Analytics />
      </body>
    </html>
  );
}