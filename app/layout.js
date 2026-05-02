import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "TimeCapsule — Leave a message for the moments that matter",
  description: "Send a time capsule message to your loved ones. Delivered automatically on their 18th birthday, graduation, or any milestone you choose.",
  keywords: "time capsule, message, future, birthday, graduation, family, memories, legacy",
  authors: [{ name: "TimeCapsule" }],
  metadataBase: new URL("https://www.mytimecapsule.app"),
  openGraph: {
    title: "TimeCapsule — Leave a message for the moments that matter",
    description: "Send a time capsule message to your loved ones. Delivered automatically on their birthday, graduation, or any milestone you choose.",
    url: "https://www.mytimecapsule.app",
    siteName: "TimeCapsule",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TimeCapsule — Leave a message for the moments that matter",
    description: "Send a time capsule message to your loved ones. Delivered automatically on their birthday, graduation, or any milestone you choose.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}