// app/providers/ClientProviders.jsx
"use client";

import OidcAuthProvider from "../AuthContext/OidcAuthProvider";
import Navbar from "../components/Navbar"; // <- client navbar that uses useAuth

export default function ClientProviders({ children }) {
  return (
    <OidcAuthProvider>
      <Navbar />
      {children}
    </OidcAuthProvider>
  );
}
