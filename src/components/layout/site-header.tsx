import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavLinks } from "@/components/layout/nav-links";
import { PreferenceControls } from "@/components/layout/preference-controls";
import { APP_NAME } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
	const supabase = await createSupabaseServerClient();
	const { t } = await getServerI18n();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const [{ data: profile }, roleLookup] = await Promise.all([
		user
			? supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle<{ display_name: string | null }>()
			: Promise.resolve({ data: null }),
		user
			? supabase.rpc("user_role", {
					user_id: user.id,
				})
			: Promise.resolve({ data: "user" as const }),
	]);

	const role = roleLookup.data ?? "user";
	const includeDashboard = Boolean(user);
	const includeAdmin = role === "admin" || role === "superuser";
	const includeSuperuser = role === "superuser";

	async function signOut() {
		"use server";

		const serverSupabase = await createSupabaseServerClient();
		await serverSupabase.auth.signOut();
		redirect("/");
	}

	return (
		<header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 shadow-[0_6px_30px_-24px_var(--overlay)] backdrop-blur">
			<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex items-center gap-3">
					<Link href="/" className="flex items-center gap-2 rounded-full px-1 py-1 transition hover:bg-[var(--sand)]/15">
						<Image src="/coffee-brew-mark.svg" alt={APP_NAME} width={34} height={34} />
						<span className="font-heading text-2xl text-[var(--espresso)]">{APP_NAME}</span>
					</Link>

					<nav className="hidden items-center gap-2 text-sm font-medium text-[var(--foreground)] lg:flex">
						<NavLinks includeDashboard={includeDashboard} includeAdmin={includeAdmin} includeSuperuser={includeSuperuser} />
					</nav>
				</div>

				<div className="hidden items-center gap-2 lg:flex">
					<PreferenceControls />

					{!user ? (
						<>
							<Link
								href="/login"
								className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--espresso)] transition hover:bg-[var(--sand)]/30"
							>
								{t("nav.login")}
							</Link>
							<Link
								href="/signup"
								className="rounded-full bg-[var(--espresso)] px-4 py-2 text-sm font-semibold text-[var(--surface-elevated)] transition hover:opacity-90"
							>
								{t("nav.signup")}
							</Link>
						</>
					) : (
						<form action={signOut} className="flex items-center gap-2">
							<span className="hidden text-xs text-[var(--muted)] xl:inline">{profile?.display_name ?? user.email}</span>
							<button
								type="submit"
								className="rounded-full border px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--sand)]/30"
							>
								{t("nav.signout")}
							</button>
						</form>
					)}
				</div>

				<details className="relative lg:hidden">
					<summary className="cursor-pointer list-none rounded-full border px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
						{t("nav.menu")}
					</summary>
					<div className="absolute right-0 top-12 z-50 w-72 rounded-3xl border bg-[var(--surface-elevated)] p-4 shadow-[0_20px_50px_-20px_var(--overlay)]">
						<div className="mb-3">
							<PreferenceControls />
						</div>
						<nav className="grid gap-2 text-sm">
							<NavLinks
								includeDashboard={includeDashboard}
								includeAdmin={includeAdmin}
								includeSuperuser={includeSuperuser}
								mobile
							/>
						</nav>

						<div className="mt-3 border-t border-[var(--border)] pt-3">
							{!user ? (
								<div className="grid grid-cols-2 gap-2">
									<Link href="/login" className="rounded-full border px-3 py-2 text-center text-sm font-semibold">
										{t("nav.login")}
									</Link>
									<Link
										href="/signup"
										className="rounded-full bg-[var(--espresso)] px-3 py-2 text-center text-sm font-semibold text-[var(--surface-elevated)]"
									>
										{t("nav.signup")}
									</Link>
								</div>
							) : (
								<form action={signOut}>
									<button type="submit" className="w-full rounded-full border px-3 py-2 text-sm font-semibold">
										{t("nav.signout")}
									</button>
								</form>
							)}
						</div>
					</div>
				</details>
			</div>
		</header>
	);
}
