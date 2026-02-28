import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";

export default async function SuperuserPage() {
	const { t } = await getServerI18n();

	return (
		<div className="space-y-6">
			<header>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("superuser.panel")}</h1>
				<p className="text-[var(--muted)]">Manage RBAC matrix and user lifecycle operations.</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				<Link href="/superuser/rbac">
					<Card>
						<h2 className="font-heading text-2xl text-[var(--espresso)]">{t("superuser.rbac")}</h2>
						<p className="mt-2 text-sm text-[var(--muted)]">Configure access per role/page/action (CRUD + management).</p>
					</Card>
				</Link>
				<Link href="/superuser/users">
					<Card>
						<h2 className="font-heading text-2xl text-[var(--espresso)]">{t("superuser.users")}</h2>
						<p className="mt-2 text-sm text-[var(--muted)]">Block, disable, or delete users with full audit trail.</p>
					</Card>
				</Link>
			</div>
		</div>
	);
}
