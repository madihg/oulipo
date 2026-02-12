import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Becoming Borders",
  description: "A blueprint for digital pathfinders — an interactive narrative exploring digital borders through migrant consciousness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
