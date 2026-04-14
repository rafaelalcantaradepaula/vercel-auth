import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { TopMenuDropdown } from "@/components/top-menu-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNavigableRoutesForPermissions } from "@/lib/auth/routes";
import { getCurrentAuthSession } from "@/lib/auth/session-server";
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

export default async function RootLayout({ children }: RootLayoutProps) {
  const authSession = await getCurrentAuthSession();
  const menuItems = authSession
    ? getNavigableRoutesForPermissions(authSession.permissions).map((route) => ({
        href: route.path,
        label: route.label,
      }))
    : [];

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <div className="app-topbar">
          <div className="app-topbar__inner">
            <div className="app-topbar__item">
              <TopMenuDropdown items={menuItems} />
            </div>
            <div className="app-topbar__item app-topbar__item--cluster">
              {authSession ? (
                <>
                  <div className="toolbar-session">
                    <div className="toolbar-session__details">
                      <p className="toolbar-session__label">Sessao</p>
                      <p className="toolbar-session__value">{authSession.name}</p>
                    </div>
                    <span className="toolbar-session__meta">{authSession.roleName}</span>
                  </div>
                  <Link href="/logout" prefetch={false} className="toolbar-control">
                    Sair
                  </Link>
                </>
              ) : (
                <Link href="/login" prefetch={false} className="toolbar-control">
                  Entrar
                </Link>
              )}
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
