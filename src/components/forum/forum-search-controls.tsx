"use client";

import { Search, SlidersHorizontal, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface ForumSearchControlsProps {
	basePath?: string;
	initialAuthor: string;
	initialFrom?: string;
	initialMinReactions: string;
	initialQuery: string;
	initialSort: string;
	initialTag: string;
	initialTo?: string;
	locale: "en" | "id";
	popularTags: string[];
}

function toQueryString(entries: Record<string, string>) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(entries)) {
		const trimmed = value.trim();
		if (trimmed.length === 0) continue;
		params.set(key, trimmed);
	}
	const serialized = params.toString();
	return serialized.length > 0 ? `?${serialized}` : "";
}

export function ForumSearchControls({
	basePath = "/forum",
	initialAuthor,
	initialFrom = "",
	initialMinReactions,
	initialQuery,
	initialSort,
	initialTag,
	initialTo = "",
	locale,
	popularTags,
}: ForumSearchControlsProps) {
	const router = useRouter();
	const [query, setQuery] = useState(initialQuery);
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [tag, setTag] = useState(initialTag);
	const [author, setAuthor] = useState(initialAuthor);
	const [minReactions, setMinReactions] = useState(initialMinReactions);
	const [sort, setSort] = useState(initialSort);
	const [from, setFrom] = useState(initialFrom);
	const [to, setTo] = useState(initialTo);

	const labels = useMemo(
		() => ({
			searchPlaceholder: locale === "id" ? "Cari thread, konten, atau tag..." : "Search threads, content, or tags...",
			searchButton: locale === "id" ? "Cari" : "Search",
			advancedButton: locale === "id" ? "Pencarian Lanjutan" : "Advanced Search",
			filterTitle: locale === "id" ? "Filter Pencarian Thread" : "Thread Search Filters",
			filterDescription:
				locale === "id"
					? "Gunakan filter lanjutan untuk menemukan diskusi yang relevan."
					: "Use advanced filters to find relevant discussions.",
			tag: locale === "id" ? "Tag" : "Tag",
			author: locale === "id" ? "Nama Pembuat" : "Author Name",
			minReactions: locale === "id" ? "Minimal Reaksi" : "Minimum Reactions",
			sort: locale === "id" ? "Urutkan" : "Sort By",
			sortLatest: locale === "id" ? "Terbaru" : "Latest",
			sortMostReacted: locale === "id" ? "Reaksi Terbanyak" : "Most Reacted",
			sortMostDiscussed: locale === "id" ? "Komentar Terbanyak" : "Most Discussed",
			sortOldest: locale === "id" ? "Terlama" : "Oldest",
			from: locale === "id" ? "Dari tanggal" : "From date",
			to: locale === "id" ? "Sampai tanggal" : "To date",
			reset: locale === "id" ? "Reset" : "Reset",
			apply: locale === "id" ? "Terapkan" : "Apply",
			popularTags: locale === "id" ? "Tag Populer" : "Popular Tags",
		}),
		[locale],
	);

	function pushWithFilters(next: Record<string, string>) {
		router.push(`${basePath}${toQueryString(next)}`);
	}

	function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		pushWithFilters({
			q: query,
			tag,
			author,
			minReactions,
			sort,
			from,
			to,
		});
	}

	function applyAdvanced() {
		pushWithFilters({
			q: query,
			tag,
			author,
			minReactions,
			sort,
			from,
			to,
		});
		setAdvancedOpen(false);
	}

	function resetAdvanced() {
		setQuery("");
		setTag("");
		setAuthor("");
		setMinReactions("");
		setSort("latest");
		setFrom("");
		setTo("");
		router.push(basePath);
		setAdvancedOpen(false);
	}

	return (
		<div className="space-y-3">
			<form onSubmit={onSearchSubmit} className="flex flex-nowrap items-center gap-2 sm:flex-wrap">
				<div className="relative min-w-0 flex-1 sm:min-w-[16rem]">
					<Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--muted)" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.currentTarget.value)}
						placeholder={labels.searchPlaceholder}
						aria-label={labels.searchPlaceholder}
						className="rounded-xl pl-9"
					/>
				</div>
				<Button
					type="submit"
					variant="secondary"
					size="sm"
					className="shrink-0 rounded-xl px-2 sm:px-4"
					aria-label={labels.searchButton}
				>
					<Search size={14} />
					<span className="sr-only sm:not-sr-only sm:ml-2">{labels.searchButton}</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setAdvancedOpen(true)}
					className="inline-flex shrink-0 gap-0 rounded-xl px-2 sm:gap-2 sm:px-4"
					aria-label={labels.advancedButton}
				>
					<SlidersHorizontal size={14} />
					<span className="sr-only sm:not-sr-only sm:ml-0">{labels.advancedButton}</span>
				</Button>
			</form>

			{popularTags.length > 0 ? (
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--muted)">
						<Tag size={12} />
						{labels.popularTags}:
					</span>
					{popularTags.map((popularTag) => (
						<button
							key={popularTag}
							type="button"
							onClick={() => {
								setTag(popularTag);
								pushWithFilters({
									q: query,
									tag: popularTag,
									author,
									minReactions,
									sort,
									from,
									to,
								});
							}}
							className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
								tag === popularTag
									? "bg-(--accent)/15 text-(--accent)"
									: "bg-(--sand)/20 text-(--muted) hover:bg-(--sand)/35 hover:text-(--espresso)"
							}`}
						>
							#{popularTag}
						</button>
					))}
				</div>
			) : null}

			<FormModal
				open={advancedOpen}
				onClose={() => setAdvancedOpen(false)}
				title={labels.filterTitle}
				description={labels.filterDescription}
				footer={
					<div className="flex items-center justify-end gap-2">
						<Button type="button" variant="ghost" onClick={resetAdvanced}>
							{labels.reset}
						</Button>
						<Button type="button" onClick={applyAdvanced}>
							{labels.apply}
						</Button>
					</div>
				}
			>
				<div className="grid gap-3">
					<div>
						<Label htmlFor="forum-advanced-query">{labels.searchButton}</Label>
						<Input id="forum-advanced-query" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="forum-advanced-tag">{labels.tag}</Label>
						<Select id="forum-advanced-tag" value={tag} onChange={(event) => setTag(event.currentTarget.value)}>
							<option value="">{locale === "id" ? "Semua Tag" : "All Tags"}</option>
							{popularTags.map((popularTag) => (
								<option key={popularTag} value={popularTag}>
									#{popularTag}
								</option>
							))}
						</Select>
					</div>
					<div>
						<Label htmlFor="forum-advanced-author">{labels.author}</Label>
						<Input id="forum-advanced-author" value={author} onChange={(event) => setAuthor(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="forum-advanced-min-reactions">{labels.minReactions}</Label>
						<Input
							id="forum-advanced-min-reactions"
							type="number"
							min={0}
							value={minReactions}
							onChange={(event) => setMinReactions(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="forum-advanced-sort">{labels.sort}</Label>
						<Select id="forum-advanced-sort" value={sort} onChange={(event) => setSort(event.currentTarget.value)}>
							<option value="latest">{labels.sortLatest}</option>
							<option value="most_reacted">{labels.sortMostReacted}</option>
							<option value="most_discussed">{labels.sortMostDiscussed}</option>
							<option value="oldest">{labels.sortOldest}</option>
						</Select>
					</div>
					<div>
						<Label htmlFor="forum-advanced-from">{labels.from}</Label>
						<Input
							id="forum-advanced-from"
							type="date"
							value={from}
							onChange={(event) => setFrom(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="forum-advanced-to">{labels.to}</Label>
						<Input id="forum-advanced-to" type="date" value={to} onChange={(event) => setTo(event.currentTarget.value)} />
					</div>
				</div>
			</FormModal>
		</div>
	);
}
