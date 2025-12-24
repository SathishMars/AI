import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConditionalLayout } from './components/ConditionalLayout';
import { UserSessionProvider } from './components/UserSessionProvider';
import { Open_Sans, Roboto, Lato } from 'next/font/google';
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "Groupize Workflows",
  description: "Workflow automation for event management",
  icons: {
    icon: [{ url: "/aime/favicon-16x16.png", type: "image/png" }],
  },
};
//👇 Import our second font

const openSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap',
  //👇 Add variable to our object
  variable: '--font-open-sans',
})

//👇 Configure the object for our second font
const roboto = Roboto({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
})

const lato = Lato({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lato',
  weight: "400"
})




export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${openSans.variable} ${roboto.variable} ${lato.variable} font-sans h-full`}>
      <body className="w-full h-full min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="groupize-theme"
        >
          <UserSessionProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </UserSessionProvider>
        </ThemeProvider>
        {/* Hidden SVG filter that creates a subtle liquid distortion */}
        <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
          <defs>
            <filter id="liquid-glass-refraction" colorInterpolationFilters="sRGB">
              {/* 
                feTurbulence generates a noise pattern, which is crucial for a "liquid" or dynamic look.
                baseFrequency controls the size and detail of the noise.
              */}
              <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="turbulence" />

              {/* 
                feDisplacementMap uses the turbulence to shift pixels of the background content (SourceGraphic).
                The 'scale' value determines the intensity of the refraction/distortion.
                R channel of the turbulence map moves pixels horizontally (xChannelSelector="R").
                G channel moves pixels vertically (yChannelSelector="G").
              */}
              <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="10" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            </filter>
          </defs>
        </svg>

      </body>
    </html>
  );
}
