import Link from "next/link";

interface ForumBreadcrumbItem {
	href?: string;
	label: string;
}

interface ForumBreadcrumbsProps {
	items: ForumBreadcrumbItem[];
}

export function ForumBreadcrumbs({ items }: ForumBreadcrumbsProps) {
	return (
		<nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-(--muted)">
			{items.map((item, index) => (
				<span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
					{item.href ? (
						<Link href={item.href} className="hover:text-(--espresso)">
							{item.label}
						</Link>
					) : (
						<span className="font-semibold text-(--espresso)">{item.label}</span>
					)}
					{index < items.length - 1 ? <span>/</span> : null}
				</span>
			))}
		</nav>
	);
}
