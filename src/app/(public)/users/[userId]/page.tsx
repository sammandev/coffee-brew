import { CalendarDays, Lock, ShieldCheck, Star, UserRoundCheck, UserRoundX } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicProfileTabs } from "@/components/profile/public-profile-tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import { isOnlineByLastActive } from "@/lib/presence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

interface PublicProfilePageProps {
	params: Promise<{ userId: string }>;
}

function fallbackDisplayName(email: string | null, displayName: string | null) {
	return displayName?.trim() || email || "Unknown User";
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
	const [{ userId }, { locale }, session] = await Promise.all([params, getServerI18n(), getSessionContext()]);
	const supabaseAdmin = createSupabaseAdminClient();

	const [{ data: targetProfile }, viewerProfileResult] = await Promise.all([
		supabaseAdmin
			.from("profiles")
			.select(
				"id, email, display_name, avatar_url, created_at, is_profile_private, show_online_status, last_active_at, mention_handle, karma_points, is_verified",
			)
			.eq("id", userId)
			.maybeSingle(),
		session
			? supabaseAdmin.from("profiles").select("show_online_status").eq("id", session.userId).maybeSingle()
			: Promise.resolve({ data: null }),
	]);

	if (!targetProfile) {
		notFound();
	}

	const isSuperuserViewer = session?.role === "superuser";
	const isSelf = session?.userId === targetProfile.id;
	const canBypassPrivacy = isSuperuserViewer || isSelf;
	const viewerAllowsOnlineStatus =
		isSuperuserViewer || !session ? true : (viewerProfileResult.data?.show_online_status ?? true);
	const canSeeTargetOnlineStatus =
		canBypassPrivacy || (viewerAllowsOnlineStatus && Boolean(targetProfile.show_online_status));
	const isPrivateForViewer = Boolean(targetProfile.is_profile_private) && !canBypassPrivacy;

	const displayName = fallbackDisplayName(targetProfile.email, targetProfile.display_name);
	const initial = displayName.charAt(0).toUpperCase() || "U";
	const isOnline = isOnlineByLastActive(targetProfile.last_active_at ?? null);

	const [brewRowsResult, blogRowsResult, threadRowsResult, badgeRowsResult] = await Promise.all([
		(isPrivateForViewer
			? Promise.resolve({ data: [] as Array<Record<string, unknown>> })
			: (() => {
					const query = supabaseAdmin
						.from("brews")
						.select("id, name, brew_method, status, created_at")
						.eq("owner_id", targetProfile.id)
						.order("created_at", { ascending: false })
						.limit(120);
					if (!canBypassPrivacy) {
						query.eq("status", "published");
					}
					return query;
				})()) as PromiseLike<{ data: Array<Record<string, unknown>> | null }>,
		(isPrivateForViewer
			? Promise.resolve({ data: [] as Array<Record<string, unknown>> })
			: (() => {
					const query = supabaseAdmin
						.from("blog_posts")
						.select("id, slug, title_en, title_id, status, published_at, updated_at")
						.eq("author_id", targetProfile.id)
						.order("updated_at", { ascending: false })
						.limit(120);
					if (!canBypassPrivacy) {
						query.eq("status", "published");
					}
					return query;
				})()) as PromiseLike<{ data: Array<Record<string, unknown>> | null }>,
		(isPrivateForViewer
			? Promise.resolve({ data: [] as Array<Record<string, unknown>> })
			: (() => {
					const query = supabaseAdmin
						.from("forum_threads")
						.select("id, title, status, created_at, updated_at")
						.eq("author_id", targetProfile.id)
						.order("updated_at", { ascending: false })
						.limit(120);
					if (!canBypassPrivacy) {
						query.eq("status", "visible");
					}
					return query;
				})()) as PromiseLike<{ data: Array<Record<string, unknown>> | null }>,
		supabaseAdmin.from("user_badges").select("badge_definitions(label_en, label_id)").eq("user_id", targetProfile.id),
	]);

	const brewRows = brewRowsResult.data ?? [];
	const blogRows = blogRowsResult.data ?? [];
	const threadRows = threadRowsResult.data ?? [];
	const brewIds = brewRows.map((brewRow) => String(brewRow.id));
	const threadIds = threadRows.map((threadRow) => String(threadRow.id));

	const [{ data: reviewRows }, { data: threadReactionRows }] = await Promise.all([
		brewIds.length > 0
			? supabaseAdmin.from("brew_reviews").select("brew_id, overall").in("brew_id", brewIds)
			: Promise.resolve({ data: [] as Array<{ brew_id: string; overall: number }> }),
		threadIds.length > 0
			? supabaseAdmin
					.from("forum_reactions")
					.select("target_id, reaction")
					.eq("target_type", "thread")
					.in("target_id", threadIds)
			: Promise.resolve({ data: [] as Array<{ target_id: string; reaction: ForumReactionType }> }),
	]);

	const reviewAggregateByBrewId = new Map<string, { count: number; score: number }>();
	for (const reviewRow of reviewRows ?? []) {
		const current = reviewAggregateByBrewId.get(reviewRow.brew_id) ?? { count: 0, score: 0 };
		current.count += 1;
		current.score += Number(reviewRow.overall);
		reviewAggregateByBrewId.set(reviewRow.brew_id, current);
	}

	const reactionCountsByThreadId = new Map<string, Partial<Record<ForumReactionType, number>>>();
	for (const threadId of threadIds) {
		reactionCountsByThreadId.set(
			threadId,
			Object.fromEntries(FORUM_REACTION_TYPES.map((reactionType) => [reactionType, 0])) as Partial<
				Record<ForumReactionType, number>
			>,
		);
	}
	for (const reactionRow of threadReactionRows ?? []) {
		const map = reactionCountsByThreadId.get(reactionRow.target_id) ?? {};
		if (!FORUM_REACTION_TYPES.includes(reactionRow.reaction as ForumReactionType)) {
			continue;
		}
		const reactionType = reactionRow.reaction as ForumReactionType;
		map[reactionType] = (map[reactionType] ?? 0) + 1;
		reactionCountsByThreadId.set(reactionRow.target_id, map);
	}

	const brews = brewRows.map((brewRow) => {
		const aggregate = reviewAggregateByBrewId.get(String(brewRow.id)) ?? { count: 0, score: 0 };
		return {
			id: String(brewRow.id),
			name: String(brewRow.name ?? ""),
			brew_method: String(brewRow.brew_method ?? ""),
			status: String(brewRow.status ?? "published"),
			created_at: String(brewRow.created_at ?? new Date().toISOString()),
			rating_avg: aggregate.count > 0 ? aggregate.score / aggregate.count : 0,
			review_count: aggregate.count,
		};
	});

	const blogs = blogRows.map((blogRow) => ({
		id: String(blogRow.id),
		slug: String(blogRow.slug ?? ""),
		title_en: String(blogRow.title_en ?? ""),
		title_id: String(blogRow.title_id ?? ""),
		status: String(blogRow.status ?? "published"),
		published_at: typeof blogRow.published_at === "string" ? blogRow.published_at : null,
		updated_at: String(blogRow.updated_at ?? new Date().toISOString()),
	}));

	const threads = threadRows.map((threadRow) => ({
		id: String(threadRow.id),
		title: String(threadRow.title ?? ""),
		status: String(threadRow.status ?? "visible"),
		created_at: String(threadRow.created_at ?? new Date().toISOString()),
		updated_at: String(threadRow.updated_at ?? new Date().toISOString()),
		reaction_counts: reactionCountsByThreadId.get(String(threadRow.id)) ?? {},
	}));

	const totalReviewCount = brews.reduce((total, brew) => total + brew.review_count, 0);
	const totalReviewScore = brews.reduce((total, brew) => total + brew.rating_avg * brew.review_count, 0);
	const overallReviewStar = totalReviewCount > 0 ? totalReviewScore / totalReviewCount : 0;
	const badgeLabels = (badgeRowsResult.data ?? [])
		.map((row) => {
			const badgeDefinition = Array.isArray(row.badge_definitions) ? row.badge_definitions[0] : row.badge_definitions;
			if (!badgeDefinition) return null;
			return locale === "id" ? badgeDefinition.label_id : badgeDefinition.label_en;
		})
		.filter((value): value is string => Boolean(value));

	return (
		<div className="space-y-6">
			<header className="rounded-3xl border bg-(--surface-elevated) p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border bg-(--sand)/20 text-lg font-semibold text-(--espresso)">
							{targetProfile.avatar_url ? (
								// biome-ignore lint/performance/noImgElement: avatar source can be external Supabase or URL
								<img src={targetProfile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
							) : (
								initial
							)}
						</div>
						<div>
							<h1 className="font-heading text-3xl text-(--espresso)">{displayName}</h1>
							<div className="mt-1 flex flex-wrap items-center gap-2">
								{targetProfile.is_verified ? <Badge>Verified</Badge> : null}
								{targetProfile.mention_handle ? <Badge>@{targetProfile.mention_handle}</Badge> : null}
							</div>
							<p className="mt-1 text-xs text-(--muted)">
								<CalendarDays size={12} className="mr-1 inline-flex" />
								{locale === "id" ? "Bergabung" : "Joined"} {formatDate(targetProfile.created_at, locale)}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{isPrivateForViewer ? (
							<Badge className="inline-flex items-center gap-1">
								<Lock size={12} />
								{locale === "id" ? "Profil Privat" : "Private Profile"}
							</Badge>
						) : null}
						{canSeeTargetOnlineStatus ? (
							<Badge className="inline-flex items-center gap-1">
								{isOnline ? <UserRoundCheck size={12} /> : <UserRoundX size={12} />}
								{isOnline ? (locale === "id" ? "Online" : "Online") : locale === "id" ? "Offline" : "Offline"}
							</Badge>
						) : (
							<Badge className="inline-flex items-center gap-1">
								<ShieldCheck size={12} />
								{locale === "id" ? "Status disembunyikan" : "Status hidden"}
							</Badge>
						)}
					</div>
				</div>
			</header>

			{isPrivateForViewer ? (
				<Card>
					<p className="text-sm text-(--muted)">
						{locale === "id"
							? "Pengguna ini mengaktifkan profil privat. Detail publik tidak dapat ditampilkan."
							: "This user has enabled a private profile. Public details are not available."}
					</p>
				</Card>
			) : (
				<>
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
						<Card>
							<p className="text-xs text-(--muted)">{locale === "id" ? "Total Blog" : "Total Blogs"}</p>
							<p className="mt-1 text-2xl font-semibold text-(--espresso)">{blogs.length}</p>
						</Card>
						<Card>
							<p className="text-xs text-(--muted)">{locale === "id" ? "Total Thread" : "Total Threads"}</p>
							<p className="mt-1 text-2xl font-semibold text-(--espresso)">{threads.length}</p>
						</Card>
						<Card>
							<p className="text-xs text-(--muted)">{locale === "id" ? "Total Brew" : "Total Brews"}</p>
							<p className="mt-1 text-2xl font-semibold text-(--espresso)">{brews.length}</p>
						</Card>
						<Card>
							<p className="text-xs text-(--muted)">{locale === "id" ? "Rating Overall" : "Overall Rating"}</p>
							<p className="mt-1 inline-flex items-center gap-1 text-2xl font-semibold text-(--espresso)">
								<Star size={18} className="text-amber-500" />
								{overallReviewStar.toFixed(2)}
							</p>
						</Card>
						<Card>
							<p className="text-xs text-(--muted)">{locale === "id" ? "Total Review" : "Total Reviews"}</p>
							<p className="mt-1 text-2xl font-semibold text-(--espresso)">{totalReviewCount}</p>
						</Card>
						<Card>
							<p className="text-xs text-(--muted)">{locale === "id" ? "Karma" : "Karma"}</p>
							<p className="mt-1 text-2xl font-semibold text-(--espresso)">{Number(targetProfile.karma_points ?? 0)}</p>
						</Card>
					</div>
					{badgeLabels.length > 0 ? (
						<div className="flex flex-wrap items-center gap-2">
							{badgeLabels.map((badgeLabel) => (
								<Badge key={`${targetProfile.id}-${badgeLabel}`}>{badgeLabel}</Badge>
							))}
						</div>
					) : null}

					<PublicProfileTabs brews={brews} blogs={blogs} threads={threads} locale={locale} showStatuses={canBypassPrivacy} />
				</>
			)}

			<Link href="/forum" className="inline-flex rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/20">
				{locale === "id" ? "Kembali ke Forum" : "Back to Forum"}
			</Link>
		</div>
	);
}
