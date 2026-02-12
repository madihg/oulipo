import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Singulars — Human vs Machine Poetry",
  description: "A series of human-vs-machine poetry performances by Halim Madi",
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
