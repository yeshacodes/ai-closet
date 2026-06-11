import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { cn } from "@/lib/utils";
import Footer from "@/components/ui/footer";
import { SessionModeProvider } from "@/lib/sessionMode";
import { DemoModeBanner } from "@/components/DemoModeBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Closet",
  description: "Your digital wardrobe and outfit generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
     <html lang="en" className="dark">
      <body className={cn(inter.className, "min-h-screen max-w-full overflow-x-hidden bg-black text-white")}>
        <SessionModeProvider>
          <Navbar />
          <DemoModeBanner />
          <main className="max-w-full overflow-x-hidden">
            {children}
          </main>
          <Footer />
        </SessionModeProvider>
      </body>
    </html>
  );
}
