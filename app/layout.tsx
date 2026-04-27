import { Toaster } from "sonner";
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "PrepWise",
  description: "An AI-powered platform for preparing for mock interviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased pattern">
        {children}

        <Toaster />
      </body>
    </html>
  );
}
