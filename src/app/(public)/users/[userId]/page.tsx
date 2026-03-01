import { CalendarDays, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicProfileTabs } from "@/components/profile/public-profile-tabs";
import { StartMessageButton } from "@/components/profile/start-message-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import { isOnlineByLastActive } from "@/lib/presence";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildHighestBadgeMap, resolveUserDisplayName } from "@/lib/user-identity";
import { formatDate } from "@/lib/utils";

interface PublicProfilePageProps {
	params: Promise<{ userId: string }>;
}

interface BrewReviewRow {
	brew_id: string;
	id: string;
	notes: string | null;
	overall: number;
	reviewer_id: string;
	updated_at: string;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
	const [{ userId }, { locale }, session] = await Promise.all([params, getServerI18n(), getSessionContext()]);
	const supabaseAdmin = createSupabaseAdminClient();

	const [{ data: targetProfile }, viewerProfileResult] = await Promise.all([
		supabaseAdmin
			.from("profiles")
			.select(
				"id, email, display_name, avatar_url, created_at, status, dm_privacy, is_profile_private, show_online_status, last_active_at, mention_handle, karma_points, is_verified",
			)
			.eq("id", userId)
			.maybeSingle(),
		session
			? supabaseAdmin.from("profiles").select("show_online_status, is_verified").eq("id", session.userId).maybeSingle()
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
	const viewerVerified = Boolean(viewerProfileResult.data?.is_verified);

	const { data: blockRows } =
		session && !isSelf
			? await supabaseAdmin
					.from("user_blocks")
					.select("blocker_id, blocked_id")
					.or(
						`and(blocker_id.eq.${session.userId},blocked_id.eq.${targetProfile.id}),and(blocker_id.eq.${targetProfile.id},blocked_id.eq.${session.userId})`,
					)
			: { data: [] as Array<{ blocker_id: string; blocked_id: string }> };

	const blockedEitherDirection = (blockRows ?? []).length > 0;
	const dmBlockedByPrivacy =
		targetProfile.dm_privacy === "nobody" || (targetProfile.dm_privacy === "verified_only" && !viewerVerified);
	const canStartMessage =
		Boolean(session) && !isSelf && targetProfile.status === "active" && !blockedEitherDirection && !dmBlockedByPrivacy;
	const messageDisabledReason = !session
		? locale === "id"
			? "Masuk untuk mengirim pesan."
			: "Sign in to send a message."
		: isSelf
			? locale === "id"
				? "Ini adalah profil Anda."
				: "This is your profile."
			: blockedEitherDirection
				? locale === "id"
					? "Pesan dinonaktifkan karena salah satu akun memblokir akun lain."
					: "Messaging is unavailable because one account has blocked the other."
				: targetProfile.status !== "active"
					? locale === "id"
						? "Akun ini tidak tersedia untuk pesan langsung."
						: "This account is not available for direct messages."
					: targetProfile.dm_privacy === "nobody"
						? locale === "id"
							? "Pengguna ini menonaktifkan direct message."
							: "This user has disabled direct messages."
						: targetProfile.dm_privacy === "verified_only" && !viewerVerified
							? locale === "id"
								? "Hanya akun terverifikasi yang dapat mengirim pesan."
								: "Only verified accounts can send messages."
							: undefined;

	const displayName = resolveUserDisplayName(targetProfile);
	const initial = displayName.charAt(0).toUpperCase() || "U";
	const isOnline = isOnlineByLastActive(targetProfile.last_active_at ?? null);
	const showOnlineDot = canSeeTargetOnlineStatus && isOnline;

	const [brewRowsResult, blogRowsResult, threadRowsResult] = await Promise.all([
		(isPrivateForViewer
			? Promise.resolve({ data: [] as Array<Record<string, unknown>> })
			: (() => {
					const query = supabaseAdmin
						.from("brews")
						.select("id, name, brew_method, owner_id, status, created_at")
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
	]);

	const brewRows = brewRowsResult.data ?? [];
	const blogRows = blogRowsResult.data ?? [];
	const threadRows = threadRowsResult.data ?? [];
	const brewIds = brewRows.map((brewRow) => String(brewRow.id));
	const threadIds = threadRows.map((threadRow) => String(threadRow.id));

	const [reviewsReceivedResult, reviewsGivenResult, threadReactionRowsResult] = await Promise.all([
		isPrivateForViewer || brewIds.length === 0
			? Promise.resolve({ data: [] as BrewReviewRow[] })
			: supabaseAdmin
					.from("brew_reviews")
					.select("id, brew_id, reviewer_id, overall, notes, updated_at")
					.in("brew_id", brewIds)
					.order("updated_at", { ascending: false })
					.limit(300),
		isPrivateForViewer
			? Promise.resolve({ data: [] as BrewReviewRow[] })
			: supabaseAdmin
					.from("brew_reviews")
					.select("id, brew_id, reviewer_id, overall, notes, updated_at")
					.eq("reviewer_id", targetProfile.id)
					.order("updated_at", { ascending: false })
					.limit(300),
		threadIds.length > 0
			? supabaseAdmin
					.from("forum_reactions")
					.select("target_id, reaction")
					.eq("target_type", "thread")
					.in("target_id", threadIds)
			: Promise.resolve({ data: [] as Array<{ target_id: string; reaction: ForumReactionType }> }),
	]);

	const reviewsReceivedRows = (reviewsReceivedResult.data ?? []) as BrewReviewRow[];
	const reviewsGivenRowsRaw = (reviewsGivenResult.data ?? []) as BrewReviewRow[];
	const threadReactionRows = threadReactionRowsResult.data ?? [];

	const reviewAggregateByBrewId = new Map<string, { count: number; score: number }>();
	for (const reviewRow of reviewsReceivedRows) {
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
	for (const reactionRow of threadReactionRows) {
		const map = reactionCountsByThreadId.get(reactionRow.target_id) ?? {};
		if (!FORUM_REACTION_TYPES.includes(reactionRow.reaction as ForumReactionType)) {
			continue;
		}
		const reactionType = reactionRow.reaction as ForumReactionType;
		map[reactionType] = (map[reactionType] ?? 0) + 1;
		reactionCountsByThreadId.set(reactionRow.target_id, map);
	}

	const brewById = new Map(
		brewRows.map((brewRow) => [
			String(brewRow.id),
			{
				id: String(brewRow.id),
				name: String(brewRow.name ?? ""),
				brew_method: String(brewRow.brew_method ?? ""),
				owner_id: String(brewRow.owner_id ?? targetProfile.id),
				status: String(brewRow.status ?? "published"),
				created_at: String(brewRow.created_at ?? new Date().toISOString()),
			},
		]),
	);
	const givenBrewIds = Array.from(new Set(reviewsGivenRowsRaw.map((review) => review.brew_id)));
	const missingGivenBrewIds = givenBrewIds.filter((brewId) => !brewById.has(brewId));
	if (missingGivenBrewIds.length > 0) {
		let missingBrewsQuery = supabaseAdmin
			.from("brews")
			.select("id, name, owner_id, status, brew_method, created_at")
			.in("id", missingGivenBrewIds)
			.limit(200);
		if (!canBypassPrivacy) {
			missingBrewsQuery = missingBrewsQuery.eq("status", "published");
		}
		const { data: missingBrews } = await missingBrewsQuery;
		for (const brewRow of missingBrews ?? []) {
			brewById.set(String(brewRow.id), {
				id: String(brewRow.id),
				name: String(brewRow.name ?? ""),
				brew_method: String(brewRow.brew_method ?? ""),
				owner_id: String(brewRow.owner_id ?? targetProfile.id),
				status: String(brewRow.status ?? "published"),
				created_at: String(brewRow.created_at ?? new Date().toISOString()),
			});
		}
	}

	const reviewsGivenRows = reviewsGivenRowsRaw.filter((review) => brewById.has(review.brew_id));
	const identityUserIds = new Set<string>([targetProfile.id]);
	for (const reviewRow of reviewsReceivedRows) {
		identityUserIds.add(reviewRow.reviewer_id);
	}
	for (const reviewRow of reviewsGivenRows) {
		const brew = brewById.get(reviewRow.brew_id);
		if (brew) identityUserIds.add(brew.owner_id);
	}
	const identityIdList = Array.from(identityUserIds);

	const [identityProfilesResult, identityReviewRowsResult, identityBadgesResult] = await Promise.all([
		identityIdList.length > 0
			? supabaseAdmin
					.from("profiles")
					.select("id, display_name, email, avatar_url, created_at, karma_points, is_verified, mention_handle")
					.in("id", identityIdList)
			: Promise.resolve({
					data: [] as Array<{
						id: string;
						display_name: string | null;
						email: string | null;
						avatar_url: string | null;
						created_at: string;
						karma_points: number | null;
						is_verified: boolean;
						mention_handle: string | null;
					}>,
				}),
		identityIdList.length > 0
			? supabaseAdmin.from("brew_reviews").select("reviewer_id").in("reviewer_id", identityIdList).limit(5000)
			: Promise.resolve({ data: [] as Array<{ reviewer_id: string }> }),
		identityIdList.length > 0
			? supabaseAdmin
					.from("user_badges")
					.select("user_id, badge_definitions(label_en, label_id, min_points)")
					.in("user_id", identityIdList)
			: Promise.resolve({
					data: [] as Array<{
						user_id: string;
						badge_definitions: { label_en: string; label_id: string; min_points: number } | null;
					}>,
				}),
	]);

	const identityReviewCountMap = new Map<string, number>();
	for (const row of identityReviewRowsResult.data ?? []) {
		identityReviewCountMap.set(row.reviewer_id, (identityReviewCountMap.get(row.reviewer_id) ?? 0) + 1);
	}
	const topBadgeByUserId = buildHighestBadgeMap(identityBadgesResult.data ?? [], locale);
	const identityMetaById = new Map(
		(identityProfilesResult.data ?? []).map((profile) => [
			profile.id,
			{
				avatar_url: profile.avatar_url,
				display_name: resolveUserDisplayName(profile),
				is_verified: Boolean(profile.is_verified),
				joined_at: profile.created_at,
				karma: Number(profile.karma_points ?? 0),
				mention_handle: profile.mention_handle,
				total_reviews: identityReviewCountMap.get(profile.id) ?? 0,
				top_badge: topBadgeByUserId.get(profile.id) ?? null,
				user_id: profile.id,
			},
		]),
	);

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

	const reviewsReceived = reviewsReceivedRows.map((review) => {
		const reviewer = identityMetaById.get(review.reviewer_id);
		const brew = brewById.get(review.brew_id);
		return {
			brew_id: review.brew_id,
			brew_name: brew?.name ?? (locale === "id" ? "Brew tidak ditemukan" : "Unknown brew"),
			id: review.id,
			identity_avatar_url: reviewer?.avatar_url ?? null,
			identity_badge: reviewer?.top_badge ?? null,
			identity_display_name: reviewer?.display_name ?? "Unknown user",
			identity_is_verified: reviewer?.is_verified ?? false,
			identity_joined_at: reviewer?.joined_at ?? review.updated_at,
			identity_karma: reviewer?.karma ?? 0,
			identity_mention_handle: reviewer?.mention_handle ?? null,
			identity_total_reviews: reviewer?.total_reviews ?? 0,
			identity_user_id: reviewer?.user_id ?? review.reviewer_id,
			notes_preview: clampPlainText(review.notes, 180),
			overall: Number(review.overall ?? 0),
			updated_at: review.updated_at,
		};
	});

	const reviewsGiven = reviewsGivenRows.map((review) => {
		const brew = brewById.get(review.brew_id);
		const ownerId = brew?.owner_id ?? targetProfile.id;
		const owner = identityMetaById.get(ownerId);
		return {
			brew_id: review.brew_id,
			brew_name: brew?.name ?? (locale === "id" ? "Brew tidak ditemukan" : "Unknown brew"),
			id: review.id,
			identity_avatar_url: owner?.avatar_url ?? null,
			identity_badge: owner?.top_badge ?? null,
			identity_display_name: owner?.display_name ?? "Unknown user",
			identity_is_verified: owner?.is_verified ?? false,
			identity_joined_at: owner?.joined_at ?? review.updated_at,
			identity_karma: owner?.karma ?? 0,
			identity_mention_handle: owner?.mention_handle ?? null,
			identity_total_reviews: owner?.total_reviews ?? 0,
			identity_user_id: owner?.user_id ?? ownerId,
			notes_preview: clampPlainText(review.notes, 180),
			overall: Number(review.overall ?? 0),
			updated_at: review.updated_at,
		};
	});

	const ratingReceivedCount = reviewsReceived.length;
	const ratingReceivedAverage =
		ratingReceivedCount > 0
			? reviewsReceived.reduce((sum, review) => sum + Number(review.overall ?? 0), 0) / ratingReceivedCount
			: 0;
	const reviewsGivenCount = reviewsGiven.length;
	const metricItems = [
		{
			label: locale === "id" ? "Blog" : "Blogs",
			value: String(blogs.length),
		},
		{
			label: locale === "id" ? "Thread" : "Threads",
			value: String(threads.length),
		},
		{
			label: locale === "id" ? "Brew" : "Brews",
			value: String(brews.length),
		},
		{
			label: locale === "id" ? "Rating Diterima" : "Rating Received",
			value: `${ratingReceivedAverage.toFixed(2)} (${ratingReceivedCount})`,
		},
		{
			label: locale === "id" ? "Review Diberikan" : "Reviews Given",
			value: String(reviewsGivenCount),
		},
		{
			label: locale === "id" ? "Karma" : "Karma",
			value: String(Number(targetProfile.karma_points ?? 0)),
		},
	];
	const targetTopBadge = topBadgeByUserId.get(targetProfile.id) ?? null;

	return (
		<div className="space-y-6">
			<header className="rounded-3xl border bg-(--surface-elevated) p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex min-w-0 items-start gap-3">
						<div className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-visible">
							<div className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border bg-(--sand)/20 text-lg font-semibold text-(--espresso)">
								{targetProfile.avatar_url ? (
									// biome-ignore lint/performance/noImgElement: avatar source can be external Supabase or URL
									<img src={targetProfile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
								) : (
									initial
								)}
							</div>
							{showOnlineDot ? (
								<span className="absolute right-0.5 bottom-0.5 h-3 w-3 rounded-full border-2 border-(--surface-elevated) bg-emerald-500" />
							) : null}
						</div>
						<div className="min-w-0 space-y-2">
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="font-heading text-3xl text-(--espresso)">{displayName}</h1>
								{targetProfile.is_verified ? <Badge>Verified</Badge> : null}
								{targetTopBadge ? <Badge>{targetTopBadge}</Badge> : null}
								{targetProfile.mention_handle ? <Badge>@{targetProfile.mention_handle}</Badge> : null}
							</div>
							<p className="text-xs text-(--muted)">
								<CalendarDays size={12} className="mr-1 inline-flex" />
								{locale === "id" ? "Bergabung" : "Joined"} {formatDate(targetProfile.created_at, locale)}
							</p>
							<div className="flex flex-wrap gap-2">
								{metricItems.map((metric) => (
									<span
										key={`${targetProfile.id}-${metric.label}`}
										className="inline-flex items-center gap-1 rounded-full border border-(--border) bg-(--surface) px-2.5 py-1 text-xs text-(--muted)"
									>
										<span className="font-medium text-(--espresso)">{metric.value}</span>
										<span>{metric.label}</span>
									</span>
								))}
							</div>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{session && !isSelf ? (
							<StartMessageButton
								recipientId={targetProfile.id}
								disabled={!canStartMessage}
								disabledReason={messageDisabledReason}
							/>
						) : null}
						{isPrivateForViewer ? (
							<Badge className="inline-flex items-center gap-1">
								<Lock size={12} />
								{locale === "id" ? "Profil Privat" : "Private Profile"}
							</Badge>
						) : null}
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
				<PublicProfileTabs
					brews={brews}
					blogs={blogs}
					threads={threads}
					reviewsReceived={reviewsReceived}
					reviewsGiven={reviewsGiven}
					locale={locale}
					showStatuses={canBypassPrivacy}
				/>
			)}

			<Link href="/forum" className="inline-flex rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/20">
				{locale === "id" ? "Kembali ke Forum" : "Back to Forum"}
			</Link>
		</div>
	);
}
