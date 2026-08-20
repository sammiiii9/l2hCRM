import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "L2H Solution — Call Floor & Portfolio Operating System",
  description: "Internal Real Estate Advisory CRM, Call Floor Intelligence, and Portfolio Operating System for L2H Solution.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fcfcfc] text-zinc-950 antialiased selection:bg-black selection:text-white font-sans">
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-120px)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
