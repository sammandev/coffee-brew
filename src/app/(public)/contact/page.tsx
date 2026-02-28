import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ContactPage() {
	const { locale, t } = await getServerI18n();

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{t("contact.title")}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">
					{locale === "id" ? "Mari Terhubung" : "Let’s Connect"}
				</h1>
				<p className="text-[var(--muted)]">
					{locale === "id"
						? "Untuk kemitraan, dukungan produk, atau pertanyaan komunitas, hubungi tim Coffee Brew."
						: "For partnerships, product support, or community questions, reach out to the Coffee Brew team."}
				</p>
			</header>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<h2 className="font-heading text-2xl text-[var(--espresso)]">Email</h2>
					<p className="mt-2 text-sm text-[var(--muted)]">hello@coffeebrew.app</p>
				</Card>
				<Card>
					<h2 className="font-heading text-2xl text-[var(--espresso)]">Forum</h2>
					<p className="mt-2 text-sm text-[var(--muted)]">
						{locale === "id" ? "Diskusi produk dan seduh harian" : "Product discussion and daily brewing threads"}
					</p>
				</Card>
				<Card>
					<h2 className="font-heading text-2xl text-[var(--espresso)]">Newsletter</h2>
					<p className="mt-2 text-sm text-[var(--muted)]">
						{locale === "id" ? "Update mingguan resep dan insight" : "Weekly updates on recipes and insights"}
					</p>
				</Card>
			</div>
		</div>
	);
}
