import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import Script from "next/script";
import { AppPreferencesProvider } from "@/components/providers/app-preferences-provider";
import { getServerPreferences } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";

const fraunces = Fraunces({
	variable: "--font-heading",
	subsets: ["latin"],
});

const manrope = Manrope({
	variable: "--font-body",
	subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
	const settings = await getSiteSettings();
	const baseTitle = settings.tab_title.trim().length > 0 ? settings.tab_title : settings.app_name;

	return {
		title: {
			default: baseTitle,
			template: `%s | ${baseTitle}`,
		},
		description: "Coffee brew recipes, catalog, community, and reviews.",
		icons: {
			icon: "/coffee-brew-mark.svg",
			shortcut: "/coffee-brew-mark.svg",
			apple: "/coffee-brew-mark.svg",
		},
	};
}

function getThemeBootstrapScript() {
	return `
(function () {
  function readCookie(name) {
    const item = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(name + '='));
    return item ? decodeURIComponent(item.split('=')[1]) : null;
  }

  const savedTheme = readCookie('cb_theme');
  const resolved = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? 'dark'
    : 'light';

  document.documentElement.dataset.theme = resolved;
})();`;
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { locale, themePreference } = await getServerPreferences();

	return (
		<html lang={locale} suppressHydrationWarning>
			<body className={`${fraunces.variable} ${manrope.variable} bg-background text-foreground antialiased`}>
				<Script id="theme-bootstrap" strategy="beforeInteractive">
					{getThemeBootstrapScript()}
				</Script>
				<AppPreferencesProvider initialLocale={locale} initialThemePreference={themePreference}>
					{children}
				</AppPreferencesProvider>
			</body>
		</html>
	);
}
