import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarLayoutShell } from "@/components/layout/sidebar-shell";

export const metadata: Metadata = {
  title: "Reflexio",
  description: "Self Improving AI Agent Platform",
  icons: {
    icon: "/reflexio_fav.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full flex flex-col antialiased font-sans">
        <Providers>
          <TopBar />
          <SidebarLayoutShell>
            {children}
          </SidebarLayoutShell>
        </Providers>
      </body>
    </html>
  );
}
