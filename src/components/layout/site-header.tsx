import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "@/components/layout/nav-links";
import { PreferenceControls } from "@/components/layout/preference-controls";
import { UserProfileMenu } from "@/components/layout/user-profile-menu";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
	const supabase = await createSupabaseServerClient();
	const [{ t }, settings] = await Promise.all([getServerI18n(), getSiteSettings()]);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const [{ data: profile }, roleLookup] = await Promise.all([
		user
			? supabase
					.from("profiles")
					.select("display_name, avatar_url")
					.eq("id", user.id)
					.maybeSingle<{ avatar_url: string | null; display_name: string | null }>()
			: Promise.resolve({ data: null }),
		user
			? supabase.rpc("user_role", {
					user_id: user.id,
				})
			: Promise.resolve({ data: "user" as const }),
	]);

	const role = roleLookup.data ?? "user";
	const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "User";

	return (
		<header className="sticky top-0 z-40 border-b border-(--border) bg-(--surface)/95 shadow-[0_6px_30px_-24px_var(--overlay)] backdrop-blur">
			<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex items-center gap-3">
					<Link href="/" className="flex items-center gap-2 rounded-full px-1 py-1 transition hover:bg-[var(--sand)]/15">
						<Image src="/coffee-brew-mark.svg" alt={settings.app_name} width={34} height={34} />
						<span className="font-heading text-2xl text-(--espresso)">{settings.app_name}</span>
					</Link>

					<nav className="hidden items-center gap-2 text-sm font-medium text-foreground lg:flex">
						<NavLinks baseLinks={settings.navbar_links} />
					</nav>
				</div>

				<div className="hidden items-center gap-2 lg:flex">
					<PreferenceControls />

					{!user ? (
						<>
							<Link
								href="/login"
								className="rounded-full px-4 py-2 text-sm font-semibold text-(--espresso) transition hover:bg-(--sand)/30"
							>
								{t("nav.login")}
							</Link>
							{settings.enable_signup && (
								<Link
									href="/signup"
									className="rounded-full bg-(--espresso) px-4 py-2 text-sm font-semibold text-(--surface-elevated) transition hover:opacity-90"
								>
									{t("nav.signup")}
								</Link>
							)}
						</>
					) : (
						<UserProfileMenu
							role={role}
							displayName={displayName}
							email={user.email ?? ""}
							avatarUrl={profile?.avatar_url ?? null}
							labels={{
								dashboard: t("nav.dashboard"),
								profileSettings: t("nav.profileSettings"),
								signOut: t("nav.signout"),
							}}
						/>
					)}
				</div>

				<div className="flex items-center gap-2 lg:hidden">
					{user ? (
						<UserProfileMenu
							role={role}
							displayName={displayName}
							email={user.email ?? ""}
							avatarUrl={profile?.avatar_url ?? null}
							labels={{
								dashboard: t("nav.dashboard"),
								profileSettings: t("nav.profileSettings"),
								signOut: t("nav.signout"),
							}}
						/>
					) : null}

					<details className="relative">
						<summary className="cursor-pointer list-none rounded-lg border px-3 py-1.5 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
							{t("nav.menu")}
						</summary>
						<div className="absolute right-0 top-11 z-50 w-72 rounded-xl border bg-(--surface-elevated) p-4">
							<div className="mb-3">
								<PreferenceControls />
							</div>
							<nav className="grid gap-2 text-sm">
								<NavLinks baseLinks={settings.navbar_links} mobile />
							</nav>

							{!user ? (
								<div className="mt-3 border-t border-(--border) pt-3">
									<div className="grid gap-2" style={{ gridTemplateColumns: settings.enable_signup ? "1fr 1fr" : "1fr" }}>
										<Link href="/login" className="rounded-lg border px-3 py-2 text-center text-sm font-semibold">
											{t("nav.login")}
										</Link>
										{settings.enable_signup && (
											<Link
												href="/signup"
												className="rounded-lg bg-(--espresso) px-3 py-2 text-center text-sm font-semibold text-(--surface-elevated)"
											>
												{t("nav.signup")}
											</Link>
										)}
									</div>
								</div>
							) : null}
						</div>
					</details>
				</div>
			</div>
		</header>
	);
}
