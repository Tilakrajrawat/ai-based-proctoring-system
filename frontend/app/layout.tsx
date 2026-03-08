import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROCTOR//AI",
  description: "AI Proctoring Command Center",
  applicationName: "PROCTOR AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">

        {/* Ambient background effects */}
        <div className="ambient-layer ambient-blue" />
        <div className="ambient-layer ambient-violet" />

        {/* App Content */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>

      </body>
    </html>
  );
}