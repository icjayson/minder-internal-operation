import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Celesnity ships entirely in Inter — one family, from calm body to display.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Minder Ops Platform",
  description: "Internal operations platform for Minder AI",
};

// Runs before first paint so the correct sky is set with no flash.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('minder-theme');if(t!=='light'&&t!=='dark'){t='light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={inter.variable}
      data-theme="light"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
