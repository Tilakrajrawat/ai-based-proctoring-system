import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROCTOR//AI",
  description: "AI proctoring command center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#080810] text-white font-sans antialiased">
        <div className="ambient-layer ambient-blue" />
        <div className="ambient-layer ambient-violet" />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
