import type { Metadata } from "next";
import "./globals.css";
import ThemeRegistry from './components/ThemeRegistry';

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
        <ThemeRegistry>{children}</ThemeRegistry>
       </body>
    </html>
  );
}
