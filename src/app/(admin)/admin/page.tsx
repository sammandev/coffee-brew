import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";

export default async function AdminPage() {
	const { t } = await getServerI18n();

	return (
		<div className="space-y-6">
			<header>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("admin.console")}</h1>
				<p className="text-[var(--muted)]">Manage landing content, FAQ, and moderation workflows.</p>
			</header>

			<div className="grid gap-4 md:grid-cols-3">
				<Link href="/admin/landing">
					<Card className="h-full">
						<h2 className="font-heading text-2xl text-[var(--espresso)]">{t("admin.landingCms")}</h2>
						<p className="mt-2 text-sm text-[var(--muted)]">Create, update, reorder, and hide section blocks.</p>
					</Card>
				</Link>
				<Link href="/admin/faq">
					<Card className="h-full">
						<h2 className="font-heading text-2xl text-[var(--espresso)]">{t("admin.faq")}</h2>
						<p className="mt-2 text-sm text-[var(--muted)]">Manage bilingual FAQ items and visibility.</p>
					</Card>
				</Link>
				<Link href="/admin/moderation">
					<Card className="h-full">
						<h2 className="font-heading text-2xl text-[var(--espresso)]">{t("admin.moderation")}</h2>
						<p className="mt-2 text-sm text-[var(--muted)]">Hide/unhide brews, threads, and comments post-publication.</p>
					</Card>
				</Link>
			</div>
		</div>
	);
}
