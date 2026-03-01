"use client";

import { Search, SlidersHorizontal, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { type CatalogSortValue, normalizeCatalogSort } from "@/lib/brew-catalog";
import { getMessage } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

interface CatalogSearchControlsProps {
	initialBrewer: string;
	initialMethod: string;
	initialMinRating: string;
	initialQuery: string;
	initialRoastery: string;
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

const SORT_OPTIONS: Array<{ labelKey: "sortLatest" | "sortSmart" | "sortHighestRated" | "sortMostReviewed" | "sortOldest"; value: CatalogSortValue }> = [
	{ value: "newest", labelKey: "sortLatest" },
	{ value: "smart", labelKey: "sortSmart" },
	{ value: "highest_stars", labelKey: "sortHighestRated" },
	{ value: "most_reviews", labelKey: "sortMostReviewed" },
	{ value: "oldest", labelKey: "sortOldest" },
];

export function CatalogSearchControls({
	initialBrewer,
	initialMethod,
	initialMinRating,
	initialQuery,
	initialRoastery,
	initialSort,
	initialTag,
	locale,
	popularTags,
}: CatalogSearchControlsProps) {
	const router = useRouter();
	const [query, setQuery] = useState(initialQuery);
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [tag, setTag] = useState(initialTag);
	const [method, setMethod] = useState(initialMethod);
	const [roastery, setRoastery] = useState(initialRoastery);
	const [brewer, setBrewer] = useState(initialBrewer);
	const [minRating, setMinRating] = useState(initialMinRating);
	const [sort, setSort] = useState(normalizeCatalogSort(initialSort));

	const labels = useMemo(
		() => ({
			searchPlaceholder: getMessage(locale, "catalog.searchPlaceholder"),
			searchButton: getMessage(locale, "catalog.searchButton"),
			advancedButton: getMessage(locale, "catalog.advancedButton"),
			filterTitle: getMessage(locale, "catalog.filterTitle"),
			filterDescription: getMessage(locale, "catalog.filterDescription"),
			popularTags: getMessage(locale, "catalog.popularTags"),
			tag: getMessage(locale, "catalog.filter.tag"),
			method: getMessage(locale, "catalog.filter.method"),
			roastery: getMessage(locale, "catalog.filter.roastery"),
			brewer: getMessage(locale, "catalog.filter.brewer"),
			minRating: getMessage(locale, "catalog.filter.minRating"),
			sort: getMessage(locale, "catalog.filter.sort"),
			sortLatest: getMessage(locale, "catalog.filter.sort.latest"),
			sortSmart: getMessage(locale, "catalog.filter.sort.smart"),
			sortHighestRated: getMessage(locale, "catalog.filter.sort.highestRated"),
			sortMostReviewed: getMessage(locale, "catalog.filter.sort.mostReviewed"),
			sortOldest: getMessage(locale, "catalog.filter.sort.oldest"),
			allTags: getMessage(locale, "catalog.filter.allTags"),
			reset: getMessage(locale, "catalog.filter.reset"),
			apply: getMessage(locale, "catalog.filter.apply"),
		}),
		[locale],
	);

	function pushWithFilters(next: Record<string, string>) {
		router.push(`/catalog${toQueryString(next)}`);
	}

	function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		pushWithFilters({
			q: query,
			tag,
			method,
			roastery,
			brewer,
			minRating,
			sort,
		});
	}

	function applyAdvanced() {
		pushWithFilters({
			q: query,
			tag,
			method,
			roastery,
			brewer,
			minRating,
			sort,
		});
		setAdvancedOpen(false);
	}

	function resetAdvanced() {
		setQuery("");
		setTag("");
		setMethod("");
		setRoastery("");
		setBrewer("");
		setMinRating("");
		setSort("newest");
		router.push("/catalog");
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

			<div className="flex flex-wrap items-center gap-1.5">
				<span className="mr-1 text-xs font-semibold text-(--muted)">{labels.sort}:</span>
				{SORT_OPTIONS.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() => {
							setSort(option.value);
							pushWithFilters({ q: query, tag, method, roastery, brewer, minRating, sort: option.value });
						}}
						className={cn(
							"rounded-full px-3 py-1 text-xs font-semibold transition",
							sort === option.value
								? "bg-(--espresso) text-(--oat)"
								: "bg-(--sand)/15 text-(--muted) hover:bg-(--sand)/30",
						)}
					>
						{labels[option.labelKey]}
					</button>
				))}
			</div>

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
								method,
								roastery,
								brewer,
								minRating,
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
						<Label htmlFor="catalog-advanced-query">{labels.searchButton}</Label>
						<Input id="catalog-advanced-query" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="catalog-advanced-tag">{labels.tag}</Label>
						<Select id="catalog-advanced-tag" value={tag} onChange={(event) => setTag(event.currentTarget.value)}>
							<option value="">{labels.allTags}</option>
							{popularTags.map((popularTag) => (
								<option key={popularTag} value={popularTag}>
									#{popularTag}
								</option>
							))}
						</Select>
					</div>
					<div>
						<Label htmlFor="catalog-advanced-method">{labels.method}</Label>
						<Input id="catalog-advanced-method" value={method} onChange={(event) => setMethod(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="catalog-advanced-roastery">{labels.roastery}</Label>
						<Input
							id="catalog-advanced-roastery"
							value={roastery}
							onChange={(event) => setRoastery(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="catalog-advanced-brewer">{labels.brewer}</Label>
						<Input id="catalog-advanced-brewer" value={brewer} onChange={(event) => setBrewer(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="catalog-advanced-min-rating">{labels.minRating}</Label>
						<Input
							id="catalog-advanced-min-rating"
							type="number"
							min={0}
							max={5}
							step={0.1}
							value={minRating}
							onChange={(event) => setMinRating(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="catalog-advanced-sort">{labels.sort}</Label>
						<Select
							id="catalog-advanced-sort"
							value={sort}
							onChange={(event) => setSort(normalizeCatalogSort(event.currentTarget.value))}
						>
							<option value="newest">{labels.sortLatest}</option>
							<option value="smart">{labels.sortSmart}</option>
							<option value="highest_stars">{labels.sortHighestRated}</option>
							<option value="most_reviews">{labels.sortMostReviewed}</option>
							<option value="oldest">{labels.sortOldest}</option>
						</Select>
					</div>
				</div>
			</FormModal>
		</div>
	);
}
