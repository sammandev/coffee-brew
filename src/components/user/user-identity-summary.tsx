import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface UserIdentitySummaryProps {
	avatarUrl: string | null;
	displayName: string;
	joinedAt: string;
	karma: number;
	locale: "en" | "id";
	profileHref?: string;
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
	displayName,
	joinedAt,
	karma,
	locale,
	profileHref,
	totalReviews,
	userId,
	variant = "full",
}: UserIdentitySummaryProps) {
	const initial = resolveInitial(displayName);
	const joinedLabel = locale === "id" ? "Bergabung" : "Joined";
	const reviewsLabel = locale === "id" ? "review" : "reviews";

	return (
		<div className="flex items-start gap-3">
			<div className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--sand)/25 text-sm font-semibold text-(--espresso)">
				{avatarUrl ? (
					<Image src={avatarUrl} alt={displayName} width={40} height={40} className="h-full w-full object-cover" />
				) : (
					initial
				)}
			</div>

			<div className="min-w-0 space-y-1">
				<NameNode href={profileHref ?? `/users/${userId}`} name={displayName} />
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
						<span>
							{joinedLabel} {formatDate(joinedAt, locale)}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
