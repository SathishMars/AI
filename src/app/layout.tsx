import type { Metadata, Viewport } from "next";
import "./globals.scss";
import ThemeRegistry from './components/ThemeRegistry';
import TopNavigation from './components/TopNavigation';
import { UnifiedUserProvider } from './contexts/UnifiedUserContext';
import { getCurrentUser } from './lib/currentUser';

export const metadata: Metadata = {
  title: "Groupize Workflows",
  description: "Workflow automation for event management",
  icons: {
    icon: [{ url: "/aime/aimeworkflows/favicon-16x16.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Root Layout - Server Component
 * 
 * Implements the Current User Pattern:
 * 1. Get current user from server-side headers (injected by middleware)
 * 2. Pass as initialCurrentUser to client provider
 * 3. Avoid hydration mismatches by never reading cookies on client
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get current user from server context (headers injected by middleware)
  const initialCurrentUser = await getCurrentUser();
  
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Two+Tone"
        />
      </head>
      <body>
        <ThemeRegistry>
          <UnifiedUserProvider initialCurrentUser={initialCurrentUser}>
            <TopNavigation />
            {children}
          </UnifiedUserProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
