import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "E-Ticket",
    template: "%s · E-Ticket",
  },
  description: "Browse events and book tickets in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
