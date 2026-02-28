import { requireRole } from "@/components/auth-guard";
import { UserStatusControls } from "@/components/forms/user-status-controls";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function DashboardUsersPage() {
	await requireRole({ minRole: "superuser", onUnauthorized: "forbidden" });
	const [{ locale }, supabase] = await Promise.all([getServerI18n(), createSupabaseServerClient()]);

	const { data: users } = await supabase
		.from("profiles")
		.select("id, email, display_name, status, created_at")
		.order("created_at", { ascending: false })
		.limit(100);

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">
				{locale === "id" ? "Manajemen Pengguna" : "User Management"}
			</h1>
			<div className="space-y-3">
				{users?.map((user) => (
					<Card key={user.id} className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<p className="font-semibold text-[var(--espresso)]">{user.display_name ?? user.email}</p>
							<p className="text-xs text-[var(--muted)]">{user.email}</p>
							<p className="text-xs text-[var(--muted)]">
								{locale === "id" ? "Bergabung" : "Joined"} {formatDate(user.created_at, locale)}
							</p>
						</div>
						<UserStatusControls userId={user.id} status={user.status} />
					</Card>
				))}
			</div>
		</div>
	);
}
