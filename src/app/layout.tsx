import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { syncCurrentUser } from "@/lib/auth/syncUser";
import { isCurrentUserAdmin } from "@/lib/auth/isAdmin";
import { AdminProvider } from "@/lib/auth/AdminContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Used sparingly for headings to give the trainer a "study" feel rather
// than a generic app-UI look.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.chess-lines.com"),
  title: "Chess Opening Trainer",
  description: "Train openings as move-by-move memory drills.",
  openGraph: {
    title: "Chess Opening Trainer",
    description: "Train openings as move-by-move memory drills.",
    url: "https://www.chess-lines.com",
    siteName: "Chess Opening Trainer",
    images: [
      {
        url: "/visit_card.png",
        width: 1734,
        height: 907,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chess Opening Trainer",
    description: "Train openings as move-by-move memory drills.",
    images: ["/visit_card.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await syncCurrentUser();
  const isAdmin = await isCurrentUserAdmin();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <AdminProvider isAdmin={isAdmin}>{children}</AdminProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
