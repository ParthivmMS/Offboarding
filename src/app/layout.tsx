import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OffboardPro - Employee Offboarding Automation",
  description: "Automate employee offboarding with AI-powered workflows, security scanning, and compliance tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
        {/* Google Analytics */}
        <GoogleAnalytics gaId="G-CTG8F4FQR4" />
      </body>
    </html>
  );
}
