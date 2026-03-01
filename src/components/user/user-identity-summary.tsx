import Image from "next/image";
import Link from "next/link";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { formatDate } from "@/lib/utils";

interface UserIdentitySummaryProps {
	avatarUrl: string | null;
	badges?: string[];
	displayName: string;
	hideJoined?: boolean;
	isVerified?: boolean;
	joinedAt: string;
	karma: number;
	locale: "en" | "id";
	mentionHandle?: string | null;
	profileHref?: string;
	showOnlineDot?: boolean;
	totalReviews: number;
	userId: string;
	variant?: "compact" | "full";
}

function resolveInitial(value: string) {
	const normalized = value.trim();
	if (!normalized) return "U";
	return normalized.charAt(0).toUpperCase();
}

function NameNode({ href, name }: { href?: string; name: string }) {
	if (!href) {
		return <span className="font-semibold text-(--espresso)">{name}</span>;
	}

	return (
		<Link href={href} className="font-semibold text-(--espresso) hover:underline">
			{name}
		</Link>
	);
}

export function UserIdentitySummary({
	avatarUrl,
	badges = [],
	displayName,
	hideJoined = false,
	isVerified = false,
	joinedAt,
	karma,
	locale,
	mentionHandle = null,
	profileHref,
	showOnlineDot = false,
	totalReviews,
	userId,
	variant = "full",
}: UserIdentitySummaryProps) {
	const initial = resolveInitial(displayName);
	const joinedLabel = locale === "id" ? "Bergabung" : "Joined";
	const reviewsLabel = locale === "id" ? "review" : "reviews";
	const topBadge = badges[0] ?? null;

	return (
		<div className="flex items-start gap-3">
			<div className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-visible">
				<div className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--sand)/25 text-sm font-semibold text-(--espresso)">
					{avatarUrl ? (
						<Image src={avatarUrl} alt={displayName} width={40} height={40} className="h-full w-full object-cover" />
					) : (
						initial
					)}
				</div>
				{showOnlineDot ? (
					<span className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full border border-(--surface-elevated) bg-emerald-500" />
				) : null}
			</div>

			<div className="min-w-0 space-y-1">
				<div className="flex flex-wrap items-center gap-1.5">
					<NameNode href={profileHref ?? `/users/${userId}`} name={displayName} />
					{isVerified ? <VerifiedBadge /> : null}
					{topBadge ? (
						<span className="rounded-full border border-(--border) bg-(--sand)/25 px-1.5 py-0.5 text-[10px] font-medium text-(--muted)">
							{topBadge}
						</span>
					) : null}
					{mentionHandle ? (
						<span className="rounded-full border border-(--border) bg-(--surface) px-1.5 py-0.5 text-[10px] text-(--muted)">
							@{mentionHandle}
						</span>
					) : null}
				</div>
				{variant === "compact" ? (
					<p className="text-xs text-(--muted)">
						{totalReviews} {reviewsLabel} · Karma {karma}
					</p>
				) : (
					<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--muted)">
						<span>
							{totalReviews} {reviewsLabel}
						</span>
						<span>Karma {karma}</span>
						{hideJoined ? null : (
							<span>
								{joinedLabel} {formatDate(joinedAt, locale)}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
