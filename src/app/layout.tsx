import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pulsewatch-ph.vercel.app'), // Update with your actual domain
  title: {
    default: "PulseWatch PH - Philippine Political Sentiment Analysis",
    template: "%s | PulseWatch PH"
  },
  description: "Real-time AI-powered sentiment analysis of Philippine political discourse. Track public opinion on politics, government, and elections through social media monitoring.",
  keywords: [
    "Philippine politics",
    "sentiment analysis",
    "political discourse",
    "Philippines election",
    "public opinion",
    "social media monitoring",
    "AI analysis",
    "government tracking",
    "political sentiment",
    "Reddit Philippines",
    "Philippine news"
  ],
  authors: [{ name: "PulseWatch PH" }],
  creator: "PulseWatch PH",
  publisher: "PulseWatch PH",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://pulsewatch-ph.vercel.app",
    title: "PulseWatch PH - Philippine Political Sentiment Analysis",
    description: "Real-time AI-powered sentiment analysis of Philippine political discourse. Track public opinion on politics, government, and elections.",
    siteName: "PulseWatch PH",
    images: [
      {
        url: "/android-chrome-512x512.png", // Using app icon as OG image until custom OG image is created
        width: 512,
        height: 512,
        alt: "PulseWatch PH - Philippine Political Sentiment Analysis Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseWatch PH - Philippine Political Sentiment Analysis",
    description: "Real-time AI-powered sentiment analysis of Philippine political discourse",
    images: ["/android-chrome-512x512.png"],
    creator: "@mond_valdepenas", 
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  category: 'politics',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
