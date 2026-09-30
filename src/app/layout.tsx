import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ToastProvider } from "@/components/toaster";
import Navbar, { Footer } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Hometown Hub — Digital Community Platform",
  description:
    "Reconnect with your hometown. Join city & village communities, share announcements, organize events and preserve local culture.",
};

// ROOT LAYOUT — wraps EVERY page: fonts/theme via globals.css, then the
// Auth and Toast providers (React context), the Navbar and Footer.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="min-h-[70vh]">{children}</main>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
