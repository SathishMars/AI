import type { Metadata } from "next";
import "./globals.css";
import ThemeRegistry from './components/ThemeRegistry';
import TopNavigation from './components/TopNavigation';
import { UnifiedUserProvider } from './contexts/UnifiedUserContext';

export const metadata: Metadata = {
  title: "Groupize Workflows",
  description: "Workflow automation for event management",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1", // For embedded contexts
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
