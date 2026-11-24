import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SalesBuzz AI",
  description: "Discover the right prospects, understand buyer intent, and turn sales intelligence into revenue.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
