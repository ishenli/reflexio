"use client";

import { ThemeProvider } from "next-themes";
import { SettingsProvider } from "@/hooks/use-settings";
import { LocaleProvider } from "@/lib/i18n/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SettingsProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
