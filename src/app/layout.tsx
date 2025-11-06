import type { Metadata, Viewport } from "next";
import "./globals.scss";
import ThemeRegistry from './components/ThemeRegistry';
import TopNavigation from './components/TopNavigation';
import { UnifiedUserProvider } from './contexts/UnifiedUserContext';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <UnifiedUserProvider>
            <TopNavigation />
            {children}
          </UnifiedUserProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
