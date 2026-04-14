import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { TopMenuDropdown } from "@/components/top-menu-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { appConfig } from "@/lib/app-config";

export const metadata: Metadata = {
  title: appConfig.appName,
  description: "Basic Next.js sample prepared for Vercel deployment.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

const themeInitScript = `
  (() => {
    try {
      const storageKey = "vercel-test-theme";
      const storedTheme = window.localStorage.getItem(storageKey);
      const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    }
  })();
`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <div className="app-topbar">
          <div className="app-topbar__inner">
            <div className="app-topbar__item">
              <TopMenuDropdown />
            </div>
            <div className="app-topbar__item">
              <ThemeToggle />
            </div>
          </div>
        </div>
        <div className="app-page-offset">{children}</div>
        <footer className="app-footer">
          <a className="app-footer__text" href={`mailto:${appConfig.authorEmail}`}>
            by {appConfig.appAuthor}
          </a>
        </footer>
      </body>
    </html>
  );
}
