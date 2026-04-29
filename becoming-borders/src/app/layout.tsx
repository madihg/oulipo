import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "becoming crossings",
  description:
    "an interactive narrative on digital borders, migrant consciousness, and the lines we draw to cross them.",
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
