
"use client";

import { AuthProvider } from "react-oidc-context";


const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_CKyeuZ4si",
  client_id: "4iaujh873dh16p1ne921g4ungr",
  redirect_uri: "https://sipselector.com/profile",
  response_type: "code",
  scope: "email openid phone",
};


export default function OidcAuthProvider({ children }) {
  return <AuthProvider {...cognitoAuthConfig}>{children}</AuthProvider>;
}