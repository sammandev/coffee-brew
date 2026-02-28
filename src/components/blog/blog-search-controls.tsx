"use client";

import { Search, SlidersHorizontal, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getMessage } from "@/lib/i18n/messages";

interface BlogSearchControlsProps {
	initialAuthor: string;
	initialMinRead: string;
	initialQuery: string;
	initialSort: string;
	initialTag: string;
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

export function BlogSearchControls({
	initialAuthor,
	initialMinRead,
	initialQuery,
	initialSort,
	initialTag,
	locale,
	popularTags,
}: BlogSearchControlsProps) {
	const router = useRouter();
	const [query, setQuery] = useState(initialQuery);
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [tag, setTag] = useState(initialTag);
	const [author, setAuthor] = useState(initialAuthor);
	const [minRead, setMinRead] = useState(initialMinRead);
	const [sort, setSort] = useState(initialSort);

	const labels = useMemo(
		() => ({
			searchPlaceholder: getMessage(locale, "blog.searchPlaceholder"),
			searchButton: getMessage(locale, "blog.searchButton"),
			advancedButton: getMessage(locale, "blog.advancedButton"),
			filterTitle: getMessage(locale, "blog.filterTitle"),
			filterDescription: getMessage(locale, "blog.filterDescription"),
			popularTags: getMessage(locale, "blog.popularTags"),
			tag: getMessage(locale, "blog.filter.tag"),
			author: getMessage(locale, "blog.filter.author"),
			minRead: getMessage(locale, "blog.filter.minRead"),
			sort: getMessage(locale, "blog.filter.sort"),
			sortLatest: getMessage(locale, "blog.filter.sort.latest"),
			sortOldest: getMessage(locale, "blog.filter.sort.oldest"),
			sortLongestRead: getMessage(locale, "blog.filter.sort.longestRead"),
			sortShortestRead: getMessage(locale, "blog.filter.sort.shortestRead"),
			allTags: getMessage(locale, "blog.filter.allTags"),
			reset: getMessage(locale, "blog.filter.reset"),
			apply: getMessage(locale, "blog.filter.apply"),
		}),
		[locale],
	);

	function pushWithFilters(next: Record<string, string>) {
		router.push(`/blog${toQueryString(next)}`);
	}

	function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		pushWithFilters({
			q: query,
			tag,
			author,
			minRead,
			sort,
		});
	}

	function applyAdvanced() {
		pushWithFilters({
			q: query,
			tag,
			author,
			minRead,
			sort,
		});
		setAdvancedOpen(false);
	}

	function resetAdvanced() {
		setQuery("");
		setTag("");
		setAuthor("");
		setMinRead("");
		setSort("latest");
		router.push("/blog");
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
						className="pl-9"
					/>
				</div>
				<Button
					type="submit"
					variant="secondary"
					size="sm"
					className="shrink-0 px-2 sm:px-4"
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
					className="inline-flex shrink-0 gap-0 px-2 sm:gap-2 sm:px-4"
					aria-label={labels.advancedButton}
				>
					<SlidersHorizontal size={14} />
					<span className="sr-only sm:not-sr-only sm:ml-0">{labels.advancedButton}</span>
				</Button>
			</form>

			<div className="flex flex-wrap items-center gap-2">
				<span className="inline-flex items-center gap-2 text-xs font-semibold text-(--muted)">
					<Tag size={13} />
					{labels.popularTags}
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
								minRead,
								sort,
							});
						}}
						className="rounded-full border px-2.5 py-1 text-xs font-semibold text-(--muted) transition hover:bg-(--sand)/20"
					>
						#{popularTag}
					</button>
				))}
			</div>

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
						<Label htmlFor="blog-advanced-query">{labels.searchButton}</Label>
						<Input id="blog-advanced-query" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="blog-advanced-tag">{labels.tag}</Label>
						<Select id="blog-advanced-tag" value={tag} onChange={(event) => setTag(event.currentTarget.value)}>
							<option value="">{labels.allTags}</option>
							{popularTags.map((popularTag) => (
								<option key={popularTag} value={popularTag}>
									#{popularTag}
								</option>
							))}
						</Select>
					</div>
					<div>
						<Label htmlFor="blog-advanced-author">{labels.author}</Label>
						<Input id="blog-advanced-author" value={author} onChange={(event) => setAuthor(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="blog-advanced-min-read">{labels.minRead}</Label>
						<Input
							id="blog-advanced-min-read"
							type="number"
							min={0}
							value={minRead}
							onChange={(event) => setMinRead(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="blog-advanced-sort">{labels.sort}</Label>
						<Select id="blog-advanced-sort" value={sort} onChange={(event) => setSort(event.currentTarget.value)}>
							<option value="latest">{labels.sortLatest}</option>
							<option value="oldest">{labels.sortOldest}</option>
							<option value="longest_read">{labels.sortLongestRead}</option>
							<option value="shortest_read">{labels.sortShortestRead}</option>
						</Select>
					</div>
				</div>
			</FormModal>
		</div>
	);
}
