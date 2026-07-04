import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ['400', '500', '600'],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Frankie EduTech",
  description: "School Management System by Frankie EduTech",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Frankie Edu",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7A1F3D", // swap for your maroon/blush brand color
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`} style={{ background: '#0f172a' }}>
      <body
        className="min-h-full flex flex-col w-full overflow-x-hidden"
        style={{ fontFamily: "var(--font-poppins), sans-serif", background: '#0f172a' }}
      >
        {children}
      </body>
    </html>
  );
}