import { CalendarDays, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrivateProfileLockCard } from "@/components/profile/private-profile-lock-card";
import { PublicProfileTabs } from "@/components/profile/public-profile-tabs";
import { StartMessageButton } from "@/components/profile/start-message-button";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/ui/verified-badge";
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
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type TabId = "brews" | "blogs" | "threads" | "reviews";
type ReviewsTabId = "received" | "given";

const PROFILE_TAB_LIMIT = 40;
const PROFILE_REVIEW_LIMIT = 80;
const PROFILE_REVIEW_BREW_SCOPE_LIMIT = 200;

function firstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

function normalizeProfileTab(value: string): TabId {
	if (value === "blogs" || value === "threads" || value === "reviews") {
		return value;
	}
	return "brews";
}

function normalizeReviewsTab(value: string): ReviewsTabId {
	return value === "given" ? "given" : "received";
}

interface BrewReviewRow {
	brew_id: string;
	id: string;
	notes: string | null;
	overall: number;
	reviewer_id: string;
	updated_at: string;
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
	const [{ userId }, { locale }, session, query] = await Promise.all([
		params,
		getServerI18n(),
		getSessionContext(),
		searchParams,
	]);
	const activeTab = normalizeProfileTab(firstParam(query.tab).trim());
	const activeReviewsTab = normalizeReviewsTab(firstParam(query.reviews).trim());
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

	let brews: Array<{
		id: string;
		name: string;
		brew_method: string;
		status: string;
		created_at: string;
		rating_avg: number;
		review_count: number;
	}> = [];
	let blogs: Array<{
		id: string;
		slug: string;
		title_en: string;
		title_id: string;
		status: string;
		published_at: string | null;
		updated_at: string;
	}> = [];
	let threads: Array<{
		id: string;
		title: string;
		status: string;
		created_at: string;
		updated_at: string;
		reaction_counts: Partial<Record<ForumReactionType, number>>;
	}> = [];
	let reviewsReceived: Array<{
		brew_id: string;
		brew_name: string;
		id: string;
		identity_avatar_url: string | null;
		identity_badge: string | null;
		identity_display_name: string;
		identity_is_verified: boolean;
		identity_joined_at: string;
		identity_karma: number;
		identity_mention_handle: string | null;
		identity_total_reviews: number;
		identity_user_id: string;
		notes_preview: string;
		overall: number;
		updated_at: string;
	}> = [];
	let reviewsGiven: typeof reviewsReceived = [];

	let brewCount = 0;
	let blogCount = 0;
	let threadCount = 0;
	let reviewsGivenCount = 0;
	let reviewsReceivedCount = 0;

	if (!isPrivateForViewer) {
		const brewCountQuery = supabaseAdmin
			.from("brews")
			.select("id", { count: "exact", head: true })
			.eq("owner_id", targetProfile.id);
		const blogCountQuery = supabaseAdmin
			.from("blog_posts")
			.select("id", { count: "exact", head: true })
			.eq("author_id", targetProfile.id);
		const threadCountQuery = supabaseAdmin
			.from("forum_threads")
			.select("id", { count: "exact", head: true })
			.eq("author_id", targetProfile.id);
		const reviewsGivenCountQuery = supabaseAdmin
			.from("brew_reviews")
			.select("id", { count: "exact", head: true })
			.eq("reviewer_id", targetProfile.id);

		let reviewsReceivedCountQuery = supabaseAdmin
			.from("brew_reviews")
			.select("id, brews!inner(owner_id)", { count: "exact", head: true })
			.eq("brews.owner_id", targetProfile.id);

		if (!canBypassPrivacy) {
			brewCountQuery.eq("status", "published");
			blogCountQuery.eq("status", "published");
			threadCountQuery.eq("status", "visible");
			reviewsReceivedCountQuery = reviewsReceivedCountQuery.eq("brews.status", "published");
		}

		const [brewCountResult, blogCountResult, threadCountResult, reviewsGivenCountResult, reviewsReceivedCountResult] =
			await Promise.all([
				brewCountQuery,
				blogCountQuery,
				threadCountQuery,
				reviewsGivenCountQuery,
				reviewsReceivedCountQuery,
			]);

		brewCount = brewCountResult.count ?? 0;
		blogCount = blogCountResult.count ?? 0;
		threadCount = threadCountResult.count ?? 0;
		reviewsGivenCount = reviewsGivenCountResult.count ?? 0;
		reviewsReceivedCount = reviewsReceivedCountResult.count ?? 0;
	}

	if (!isPrivateForViewer && activeTab === "brews") {
		let brewQuery = supabaseAdmin
			.from("brews")
			.select("id, name, brew_method, status, created_at")
			.eq("owner_id", targetProfile.id)
			.order("created_at", { ascending: false })
			.limit(PROFILE_TAB_LIMIT);
		if (!canBypassPrivacy) {
			brewQuery = brewQuery.eq("status", "published");
		}
		const { data: brewRows } = await brewQuery;
		const brewIds = (brewRows ?? []).map((brewRow) => String(brewRow.id));
		const { data: brewReviewRows } =
			brewIds.length > 0
				? await supabaseAdmin.from("brew_reviews").select("brew_id, overall").in("brew_id", brewIds).limit(600)
				: { data: [] as Array<{ brew_id: string; overall: number }> };

		const aggregateByBrewId = new Map<string, { count: number; score: number }>();
		for (const reviewRow of brewReviewRows ?? []) {
			const current = aggregateByBrewId.get(reviewRow.brew_id) ?? { count: 0, score: 0 };
			current.count += 1;
			current.score += Number(reviewRow.overall);
			aggregateByBrewId.set(reviewRow.brew_id, current);
		}

		brews = (brewRows ?? []).map((brewRow) => {
			const aggregate = aggregateByBrewId.get(String(brewRow.id)) ?? { count: 0, score: 0 };
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
	}

	if (!isPrivateForViewer && activeTab === "blogs") {
		let blogQuery = supabaseAdmin
			.from("blog_posts")
			.select("id, slug, title_en, title_id, status, published_at, updated_at")
			.eq("author_id", targetProfile.id)
			.order("updated_at", { ascending: false })
			.limit(PROFILE_TAB_LIMIT);
		if (!canBypassPrivacy) {
			blogQuery = blogQuery.eq("status", "published");
		}
		const { data: blogRows } = await blogQuery;
		blogs = (blogRows ?? []).map((blogRow) => ({
			id: String(blogRow.id),
			slug: String(blogRow.slug ?? ""),
			title_en: String(blogRow.title_en ?? ""),
			title_id: String(blogRow.title_id ?? ""),
			status: String(blogRow.status ?? "published"),
			published_at: typeof blogRow.published_at === "string" ? blogRow.published_at : null,
			updated_at: String(blogRow.updated_at ?? new Date().toISOString()),
		}));
	}

	if (!isPrivateForViewer && activeTab === "threads") {
		let threadQuery = supabaseAdmin
			.from("forum_threads")
			.select("id, title, status, created_at, updated_at")
			.eq("author_id", targetProfile.id)
			.order("updated_at", { ascending: false })
			.limit(PROFILE_TAB_LIMIT);
		if (!canBypassPrivacy) {
			threadQuery = threadQuery.eq("status", "visible");
		}
		const { data: threadRows } = await threadQuery;
		const threadIds = (threadRows ?? []).map((threadRow) => String(threadRow.id));
		const { data: threadReactionRows } =
			threadIds.length > 0
				? await supabaseAdmin
						.from("forum_reactions")
						.select("target_id, reaction")
						.eq("target_type", "thread")
						.in("target_id", threadIds)
				: { data: [] as Array<{ target_id: string; reaction: ForumReactionType }> };

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
			if (!FORUM_REACTION_TYPES.includes(reactionRow.reaction as ForumReactionType)) continue;
			const reactionType = reactionRow.reaction as ForumReactionType;
			const current = reactionCountsByThreadId.get(reactionRow.target_id) ?? {};
			current[reactionType] = (current[reactionType] ?? 0) + 1;
			reactionCountsByThreadId.set(reactionRow.target_id, current);
		}

		threads = (threadRows ?? []).map((threadRow) => ({
			id: String(threadRow.id),
			title: String(threadRow.title ?? ""),
			status: String(threadRow.status ?? "visible"),
			created_at: String(threadRow.created_at ?? new Date().toISOString()),
			updated_at: String(threadRow.updated_at ?? new Date().toISOString()),
			reaction_counts: reactionCountsByThreadId.get(String(threadRow.id)) ?? {},
		}));
	}

	if (!isPrivateForViewer && activeTab === "reviews") {
		let ownedBrewQuery = supabaseAdmin
			.from("brews")
			.select("id, name, owner_id, status, brew_method, created_at")
			.eq("owner_id", targetProfile.id)
			.order("created_at", { ascending: false })
			.limit(PROFILE_REVIEW_BREW_SCOPE_LIMIT);
		if (!canBypassPrivacy) {
			ownedBrewQuery = ownedBrewQuery.eq("status", "published");
		}
		const { data: ownedBrews } = await ownedBrewQuery;
		const ownedBrewIds = (ownedBrews ?? []).map((brewRow) => String(brewRow.id));

		const [{ data: reviewsReceivedRowsRaw }, { data: reviewsGivenRowsRaw }] = await Promise.all([
			activeReviewsTab === "received" && ownedBrewIds.length > 0
				? supabaseAdmin
						.from("brew_reviews")
						.select("id, brew_id, reviewer_id, overall, notes, updated_at")
						.in("brew_id", ownedBrewIds)
						.order("updated_at", { ascending: false })
						.limit(PROFILE_REVIEW_LIMIT)
				: Promise.resolve({ data: [] as BrewReviewRow[] }),
			activeReviewsTab === "given"
				? supabaseAdmin
						.from("brew_reviews")
						.select("id, brew_id, reviewer_id, overall, notes, updated_at")
						.eq("reviewer_id", targetProfile.id)
						.order("updated_at", { ascending: false })
						.limit(PROFILE_REVIEW_LIMIT)
				: Promise.resolve({ data: [] as BrewReviewRow[] }),
		]);

		const reviewsReceivedRows = (reviewsReceivedRowsRaw ?? []) as BrewReviewRow[];
		const reviewsGivenRows = (reviewsGivenRowsRaw ?? []) as BrewReviewRow[];
		const reviewBrewIds = Array.from(new Set([...reviewsReceivedRows, ...reviewsGivenRows].map((row) => row.brew_id)));
		let reviewBrewsQuery =
			reviewBrewIds.length > 0
				? supabaseAdmin.from("brews").select("id, name, owner_id, status, brew_method, created_at").in("id", reviewBrewIds)
				: Promise.resolve({ data: [] as Array<Record<string, unknown>> });
		if (!canBypassPrivacy && reviewBrewIds.length > 0) {
			reviewBrewsQuery = supabaseAdmin
				.from("brews")
				.select("id, name, owner_id, status, brew_method, created_at")
				.in("id", reviewBrewIds)
				.eq("status", "published");
		}
		const { data: reviewBrews } = await reviewBrewsQuery;

		const brewById = new Map(
			(reviewBrews ?? []).map((brewRow) => [
				String(brewRow.id),
				{
					id: String(brewRow.id),
					name: String(brewRow.name ?? ""),
					owner_id: String(brewRow.owner_id ?? targetProfile.id),
				},
			]),
		);

		const identityUserIds = new Set<string>();
		for (const reviewRow of reviewsReceivedRows) {
			identityUserIds.add(reviewRow.reviewer_id);
		}
		for (const reviewRow of reviewsGivenRows) {
			const brew = brewById.get(reviewRow.brew_id);
			if (brew) identityUserIds.add(brew.owner_id);
		}
		const identityIdList = Array.from(identityUserIds);
		const { data: identityProfiles } =
			identityIdList.length > 0
				? await supabaseAdmin
						.from("profiles")
						.select("id, display_name, email, avatar_url, created_at, karma_points, is_verified, mention_handle")
						.in("id", identityIdList)
				: {
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
					};

		const identityMetaById = new Map(
			(identityProfiles ?? []).map((profile) => [
				profile.id,
				{
					avatar_url: profile.avatar_url,
					display_name: resolveUserDisplayName(profile),
					is_verified: Boolean(profile.is_verified),
					joined_at: profile.created_at,
					karma: Number(profile.karma_points ?? 0),
					mention_handle: profile.mention_handle,
					user_id: profile.id,
				},
			]),
		);

		reviewsReceived = reviewsReceivedRows
			.filter((review) => brewById.has(review.brew_id))
			.map((review) => {
				const reviewer = identityMetaById.get(review.reviewer_id);
				const brew = brewById.get(review.brew_id);
				return {
					brew_id: review.brew_id,
					brew_name: brew?.name ?? (locale === "id" ? "Brew tidak ditemukan" : "Unknown brew"),
					id: review.id,
					identity_avatar_url: reviewer?.avatar_url ?? null,
					identity_badge: null,
					identity_display_name: reviewer?.display_name ?? "Unknown user",
					identity_is_verified: reviewer?.is_verified ?? false,
					identity_joined_at: reviewer?.joined_at ?? review.updated_at,
					identity_karma: reviewer?.karma ?? 0,
					identity_mention_handle: reviewer?.mention_handle ?? null,
					identity_total_reviews: 0,
					identity_user_id: reviewer?.user_id ?? review.reviewer_id,
					notes_preview: clampPlainText(review.notes, 180),
					overall: Number(review.overall ?? 0),
					updated_at: review.updated_at,
				};
			});

		reviewsGiven = reviewsGivenRows
			.filter((review) => brewById.has(review.brew_id))
			.map((review) => {
				const brew = brewById.get(review.brew_id);
				const ownerId = brew?.owner_id ?? targetProfile.id;
				const owner = identityMetaById.get(ownerId);
				return {
					brew_id: review.brew_id,
					brew_name: brew?.name ?? (locale === "id" ? "Brew tidak ditemukan" : "Unknown brew"),
					id: review.id,
					identity_avatar_url: owner?.avatar_url ?? null,
					identity_badge: null,
					identity_display_name: owner?.display_name ?? "Unknown user",
					identity_is_verified: owner?.is_verified ?? false,
					identity_joined_at: owner?.joined_at ?? review.updated_at,
					identity_karma: owner?.karma ?? 0,
					identity_mention_handle: owner?.mention_handle ?? null,
					identity_total_reviews: 0,
					identity_user_id: owner?.user_id ?? ownerId,
					notes_preview: clampPlainText(review.notes, 180),
					overall: Number(review.overall ?? 0),
					updated_at: review.updated_at,
				};
			});
	}

	const ratingReceivedCount = reviewsReceivedCount;
	const ratingReceivedAverage = 0;
	const { data: targetBadgeRows } = await supabaseAdmin
		.from("user_badges")
		.select("user_id, badge_definitions(label_en, label_id, min_points)")
		.eq("user_id", targetProfile.id);
	const targetTopBadge = buildHighestBadgeMap(targetBadgeRows ?? [], locale).get(targetProfile.id) ?? null;
	const metricItems = [
		{
			label: locale === "id" ? "Blog" : "Blogs",
			value: String(blogCount),
		},
		{
			label: locale === "id" ? "Thread" : "Threads",
			value: String(threadCount),
		},
		{
			label: locale === "id" ? "Brew" : "Brews",
			value: String(brewCount),
		},
		{
			label: locale === "id" ? "Review Diterima" : "Reviews Received",
			value: String(ratingReceivedCount),
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
	void ratingReceivedAverage;

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
								{targetProfile.is_verified ? (
									<VerifiedBadge
										showLabel
										label={locale === "id" ? "Terverifikasi" : "Verified"}
										title={locale === "id" ? "Pengguna terverifikasi" : "Verified user"}
									/>
								) : null}
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
				<PrivateProfileLockCard locale={locale} />
			) : (
				<PublicProfileTabs
					activeReviewsTab={activeReviewsTab}
					activeTab={activeTab}
					brews={brews}
					blogs={blogs}
					threads={threads}
					reviewsReceived={reviewsReceived}
					reviewsGiven={reviewsGiven}
					locale={locale}
					basePath={`/users/${targetProfile.id}`}
					showStatuses={canBypassPrivacy}
				/>
			)}

			<Link href="/forum" className="inline-flex rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/20">
				{locale === "id" ? "Kembali ke Forum" : "Back to Forum"}
			</Link>
		</div>
	);
}
