import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeRegistry from './components/ThemeRegistry';
import TopNavigation from './components/TopNavigation';
import { UnifiedUserProvider } from './contexts/UnifiedUserContext';

export const metadata: Metadata = {
  title: "Groupize Workflows",
  description: "Workflow automation for event management",
  icons: {
    icon: [{ url: "/favicon-16x16.png", type: "image/png" }],
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
