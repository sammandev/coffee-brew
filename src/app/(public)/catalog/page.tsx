import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { getPublishedBrews } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function CatalogPage() {
	const [{ locale, t }, brews] = await Promise.all([getServerI18n(), getPublishedBrews(60)]);

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{t("nav.catalog")}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("catalog.title")}</h1>
				<p className="text-[var(--muted)]">{t("catalog.subtitle")}</p>
			</header>

			{brews.length === 0 ? (
				<Card>
					<CardTitle>{locale === "id" ? "Belum ada racikan publik" : "No published brews yet"}</CardTitle>
					<CardDescription>
						{locale === "id"
							? "Jadilah yang pertama mempublikasikan racikan dari dashboard."
							: "Be the first to publish one from your dashboard."}
					</CardDescription>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{brews.map((brew) => (
						<Link href={`/brew/${brew.id}`} key={brew.id}>
							<Card className="h-full transition hover:-translate-y-1 hover:shadow-[0_16px_50px_-25px_var(--overlay)]">
								<CardTitle>{brew.name}</CardTitle>
								<CardDescription className="mt-2">{brew.brew_method}</CardDescription>
								<p className="mt-4 text-sm text-[var(--muted)]">Beans: {brew.coffee_beans}</p>
								<p className="text-sm text-[var(--muted)]">Roastery: {brew.brand_roastery}</p>
								<p className="mt-4 text-xs text-[var(--muted)]">
									{locale === "id" ? "Oleh" : "By"} {brew.brewer_name} {locale === "id" ? "pada" : "on"}{" "}
									{formatDate(brew.created_at, locale)}
								</p>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
